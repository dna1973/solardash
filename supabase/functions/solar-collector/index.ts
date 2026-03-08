// Solar Data Collector - orchestrates data collection from all manufacturers
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { CollectorRequest, NormalizedEnergyData, NormalizedPlant, NormalizedDevice } from "../_shared/solar-types.ts";
import * as growatt from "../_shared/adapters/growatt.ts";
import * as solaredge from "../_shared/adapters/solaredge.ts";
import * as fronius from "../_shared/adapters/fronius.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? serviceKey;

    // Verify user
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user profile + tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CollectorRequest = await req.json();
    const { manufacturer, credentials, action, plant_external_id, device_serial } = body;

    let result: any;

    switch (manufacturer.toLowerCase()) {
      case "growatt": {
        const session = await growatt.authenticate(credentials);
        const baseUrl = credentials.base_url || "https://openapi.growatt.com";
        switch (action) {
          case "list_plants":
            result = await growatt.listPlants(session, baseUrl);
            break;
          case "list_devices":
            if (!plant_external_id) throw new Error("plant_external_id required");
            result = await growatt.listDevices(session, plant_external_id, baseUrl);
            break;
          case "collect_energy":
            if (!plant_external_id) throw new Error("plant_external_id required");
            result = await growatt.collectEnergy(session, plant_external_id, device_serial, baseUrl);
            break;
          default:
            throw new Error(`Unsupported action: ${action}`);
        }
        break;
      }

      case "solaredge": {
        switch (action) {
          case "list_plants":
            result = await solaredge.listPlants(credentials);
            break;
          case "list_devices":
            if (!plant_external_id) throw new Error("plant_external_id required");
            result = await solaredge.listDevices(credentials, plant_external_id);
            break;
          case "collect_energy":
            if (!plant_external_id) throw new Error("plant_external_id required");
            result = await solaredge.collectEnergy(credentials, plant_external_id, device_serial);
            break;
          default:
            throw new Error(`Unsupported action: ${action}`);
        }
        break;
      }

      case "fronius": {
        switch (action) {
          case "list_plants":
            result = await fronius.listPlants(credentials);
            break;
          case "list_devices":
            result = await fronius.listDevices(credentials);
            break;
          case "collect_energy":
            result = await fronius.collectEnergy(credentials, plant_external_id, device_serial);
            break;
          default:
            throw new Error(`Unsupported action: ${action}`);
        }
        break;
      }

      default:
        throw new Error(`Unsupported manufacturer: ${manufacturer}`);
    }

    // If collecting energy, also persist to DB
    if (action === "collect_energy" && Array.isArray(result)) {
      await persistEnergyData(supabase, profile.tenant_id, result);
    }

    return new Response(
      JSON.stringify({ success: true, manufacturer, action, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("solar-collector error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function persistEnergyData(
  supabase: any,
  tenantId: string,
  data: NormalizedEnergyData[]
) {
  for (const entry of data) {
    // Find the internal plant_id by external_id within this tenant
    const { data: plant } = await supabase
      .from("plants")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .single();

    if (!plant) continue;

    // Find device if specified
    let deviceId: string | null = null;
    if (entry.device_external_id) {
      const { data: device } = await supabase
        .from("devices")
        .select("id")
        .eq("plant_id", plant.id)
        .eq("serial_number", entry.device_external_id)
        .limit(1)
        .single();
      deviceId = device?.id || null;
    }

    await supabase.from("energy_data").insert({
      plant_id: plant.id,
      device_id: deviceId,
      timestamp: entry.timestamp,
      generation_power_kw: entry.generation_power_kw || 0,
      consumption_power_kw: entry.consumption_power_kw || 0,
      energy_generated_kwh: entry.energy_generated_kwh || 0,
      energy_consumed_kwh: entry.energy_consumed_kwh || 0,
      voltage: entry.voltage,
      current: entry.current,
      temperature: entry.temperature,
      status: entry.status,
    });
  }
}
