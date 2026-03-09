// Solar Data Collector - orchestrates data collection from all manufacturers
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { CollectorRequest, NormalizedEnergyData, NormalizedPlant } from "../_shared/solar-types.ts";
import * as growatt from "../_shared/adapters/growatt.ts";
import * as solaredge from "../_shared/adapters/solaredge.ts";
import * as fronius from "../_shared/adapters/fronius.ts";
import * as apsystems from "../_shared/adapters/apsystems.ts";
import * as hoymiles from "../_shared/adapters/hoymiles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || serviceKey;

    const body = await req.json();

    // ─── SYNC_ALL: called by cron (no user auth needed) ───
    if (body.action === "sync_all") {
      console.log("sync_all: iniciando coleta automática");
      const supabase = createClient(supabaseUrl, serviceKey);

      // Get all active integrations
      const { data: integrations, error: intErr } = await supabase
        .from("integrations")
        .select("id, tenant_id, manufacturer, credentials")
        .eq("is_active", true);

      if (intErr) throw new Error(`sync_all: erro ao ler integrações: ${intErr.message}`);
      if (!integrations || integrations.length === 0) {
        console.log("sync_all: nenhuma integração ativa");
        return jsonOk({ success: true, message: "Nenhuma integração ativa", synced: 0 });
      }

      console.log(`sync_all: ${integrations.length} integração(ões) ativa(s)`);
      let totalPlants = 0;
      let totalEnergy = 0;
      const errors: string[] = [];

      for (const integration of integrations) {
        try {
          const { synced, energyPoints } = await syncIntegration(
            supabase, integration.tenant_id, integration.manufacturer, integration.credentials, integration.id
          );
          totalPlants += synced;
          totalEnergy += energyPoints;

          // Update last_sync_at
          await supabase
            .from("integrations")
            .update({ last_sync_at: new Date().toISOString(), last_error: null })
            .eq("id", integration.id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`sync_all: erro na integração ${integration.id}: ${msg}`);
          errors.push(`${integration.manufacturer}: ${msg}`);
          await supabase
            .from("integrations")
            .update({ last_error: msg })
            .eq("id", integration.id);
        }
      }

      console.log(`sync_all: concluído — ${totalPlants} plantas, ${totalEnergy} pontos de energia, ${errors.length} erros`);
      return jsonOk({ success: true, totalPlants, totalEnergy, errors });
    }

    // ─── USER ACTIONS: require auth ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getUser(token);
    if (claimsErr || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", claimsData.user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { manufacturer, credentials, action, plant_external_id, device_serial } = body as CollectorRequest;
    let result: any;

    switch (manufacturer.toLowerCase()) {
      case "growatt": {
        const session = await growatt.authenticate(credentials);
        switch (action) {
          case "list_plants":
            result = await growatt.listPlants(session);
            break;
          case "list_devices":
            if (!plant_external_id) throw new Error("plant_external_id required");
            result = await growatt.listDevices(session, plant_external_id);
            break;
          case "collect_energy":
            if (!plant_external_id) throw new Error("plant_external_id required");
            result = await growatt.collectEnergy(session, plant_external_id, device_serial);
            break;
          default:
            throw new Error(`Unsupported action: ${action}`);
        }
        break;
      }
      case "solaredge": {
        switch (action) {
          case "list_plants": result = await solaredge.listPlants(credentials); break;
          case "list_devices":
            if (!plant_external_id) throw new Error("plant_external_id required");
            result = await solaredge.listDevices(credentials, plant_external_id); break;
          case "collect_energy":
            if (!plant_external_id) throw new Error("plant_external_id required");
            result = await solaredge.collectEnergy(credentials, plant_external_id, device_serial); break;
          default: throw new Error(`Unsupported action: ${action}`);
        }
        break;
      }
      case "fronius": {
        switch (action) {
          case "list_plants": result = await fronius.listPlants(credentials); break;
          case "list_devices": result = await fronius.listDevices(credentials); break;
          case "collect_energy":
            result = await fronius.collectEnergy(credentials, plant_external_id, device_serial); break;
          default: throw new Error(`Unsupported action: ${action}`);
        }
        break;
      }
      case "apsystems": {
        const apSession = await apsystems.authenticate(credentials);
        switch (action) {
          case "list_plants": result = await apsystems.listPlants(apSession); break;
          case "list_devices":
            if (!plant_external_id) throw new Error("plant_external_id required");
            result = await apsystems.listDevices(apSession, plant_external_id); break;
          case "collect_energy":
            if (!plant_external_id) throw new Error("plant_external_id required");
            result = await apsystems.collectEnergy(apSession, plant_external_id, device_serial); break;
          case "collect_historical": {
            if (!plant_external_id) throw new Error("plant_external_id required");
            const { start_date, end_date, level } = body;
            if (level === "monthly") {
              result = await apsystems.collectMonthlyEnergy(apSession, plant_external_id, start_date, end_date);
            } else {
              result = await apsystems.collectDailyEnergy(apSession, plant_external_id, start_date, end_date);
            }
            break;
          }
          default: throw new Error(`Unsupported action: ${action}`);
        }
        break;
      }
      case "hoymiles": {
        const hmSession = await hoymiles.authenticate(credentials);
        switch (action) {
          case "list_plants": result = await hoymiles.listPlants(hmSession); break;
          case "list_devices":
            if (!plant_external_id) throw new Error("plant_external_id required");
            result = await hoymiles.listDevices(hmSession, plant_external_id); break;
          case "collect_energy":
            if (!plant_external_id) throw new Error("plant_external_id required");
            result = await hoymiles.collectEnergy(hmSession, plant_external_id, device_serial); break;
          default: throw new Error(`Unsupported action: ${action}`);
        }
        break;
      }
      default:
        throw new Error(`Unsupported manufacturer: ${manufacturer}`);
    }

    if ((action === "collect_energy" || action === "collect_historical") && Array.isArray(result)) {
      await persistEnergyData(supabase, profile.tenant_id, result);
    }

    return jsonOk({ success: true, manufacturer, action, data: result });
  } catch (e) {
    console.error("solar-collector error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Sync a single integration: list plants → upsert → collect energy ───
async function syncIntegration(
  supabase: any,
  tenantId: string,
  manufacturer: string,
  credentials: any,
  integrationId: string
): Promise<{ synced: number; energyPoints: number }> {
  console.log(`syncIntegration: ${manufacturer} para tenant ${tenantId}`);

  const mfr = manufacturer.toLowerCase();

  // ─── APsystems: optimized path — skip listPlants, use DB plants directly ───
  if (mfr === "apsystems") {
    return await syncAPsystemsOptimized(supabase, tenantId, credentials, integrationId);
  }

  let plants: NormalizedPlant[] = [];
  let session: any = null;

  switch (mfr) {
    case "growatt":
      session = await growatt.authenticate(credentials);
      plants = await growatt.listPlants(session);
      break;
    case "solaredge":
      plants = await solaredge.listPlants(credentials);
      break;
    case "fronius":
      plants = await fronius.listPlants(credentials);
      break;
    case "hoymiles":
      session = await hoymiles.authenticate(credentials);
      plants = await hoymiles.listPlants(session);
      break;
    default:
      throw new Error(`Fabricante não suportado: ${manufacturer}`);
  }

  console.log(`syncIntegration: ${plants.length} plantas encontradas`);

  let energyPoints = 0;

  for (const plant of plants) {
    const { data: existing } = await supabase
      .from("plants")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", plant.name)
      .limit(1)
      .maybeSingle();

    let plantId: string;

    if (existing) {
      plantId = existing.id;
      const updateData: Record<string, any> = {
        capacity_kwp: plant.capacity_kwp || undefined,
        status: plant.status || "offline",
        updated_at: new Date().toISOString(),
      };
      if (plant.location) {
        const { data: current } = await supabase
          .from("plants")
          .select("location, latitude, longitude")
          .eq("id", existing.id)
          .single();
        if (!current?.location) updateData.location = plant.location;
        if (plant.latitude && !current?.latitude) updateData.latitude = plant.latitude;
        if (plant.longitude && !current?.longitude) updateData.longitude = plant.longitude;
      }
      await supabase.from("plants").update(updateData).eq("id", plantId);
    } else {
      const { data: newPlant, error: insertErr } = await supabase
        .from("plants")
        .insert({
          tenant_id: tenantId,
          name: plant.name,
          location: plant.location || null,
          latitude: plant.latitude || null,
          longitude: plant.longitude || null,
          capacity_kwp: plant.capacity_kwp || 0,
          status: plant.status || "offline",
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error(`syncIntegration: erro ao inserir planta ${plant.name}: ${insertErr.message}`);
        continue;
      }
      plantId = newPlant.id;
      console.log(`syncIntegration: nova planta criada: ${plant.name} → ${plantId}`);
    }

    try {
      let energyData: NormalizedEnergyData[] = [];

      switch (mfr) {
        case "growatt":
          if (session) energyData = await growatt.collectEnergy(session, plant.external_id);
          break;
        case "solaredge":
          energyData = await solaredge.collectEnergy(credentials, plant.external_id);
          break;
        case "fronius":
          energyData = await fronius.collectEnergy(credentials, plant.external_id);
          break;
        case "hoymiles":
          if (session) energyData = await hoymiles.collectEnergy(session, plant.external_id);
          break;
      }

      for (const entry of energyData) {
        const { error: upsertErr } = await supabase.from("energy_data").upsert({
          plant_id: plantId,
          device_id: null,
          timestamp: entry.timestamp,
          generation_power_kw: entry.generation_power_kw || 0,
          consumption_power_kw: entry.consumption_power_kw || 0,
          energy_generated_kwh: entry.energy_generated_kwh || 0,
          energy_consumed_kwh: entry.energy_consumed_kwh || 0,
          voltage: entry.voltage || null,
          current: entry.current || null,
          temperature: entry.temperature || null,
          status: entry.status || "ok",
        }, { onConflict: "plant_id,timestamp", ignoreDuplicates: true });
        if (!upsertErr) energyPoints++;
      }
    } catch (e) {
      console.error(`syncIntegration: erro ao coletar energia de ${plant.name}: ${e}`);
    }
  }

  return { synced: plants.length, energyPoints };
}

// ─── APsystems optimized sync: skip listPlants API, use DB plants directly ───
async function syncAPsystemsOptimized(
  supabase: any,
  tenantId: string,
  credentials: any,
  integrationId: string
): Promise<{ synced: number; energyPoints: number }> {
  const session = await apsystems.authenticate(credentials);

  // Get existing APsystems plants from DB (ECU names start with "ECU ")
  const { data: dbPlants } = await supabase
    .from("plants")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .like("name", "ECU %");

  if (!dbPlants || dbPlants.length === 0) {
    // First time: need to discover plants via API
    console.log("apsystems: nenhuma planta no DB, fazendo discovery via API");
    const plants = await apsystems.listPlants(session);
    if (plants.length === 0) return { synced: 0, energyPoints: 0 };

    // Insert plants and then collect energy
    let energyPoints = 0;
    for (let i = 0; i < plants.length; i++) {
      const plant = plants[i];
      const { data: newPlant } = await supabase
        .from("plants")
        .insert({
          tenant_id: tenantId,
          name: plant.name,
          location: plant.location || null,
          capacity_kwp: plant.capacity_kwp || 0,
          status: plant.status || "offline",
        })
        .select("id")
        .single();

      if (newPlant) {
        console.log(`apsystems: planta criada: ${plant.name}`);
        if (i > 0) await new Promise(r => setTimeout(r, 5000));
        try {
          const energyData = await apsystems.collectEnergy(session, plant.external_id);
          energyPoints += await persistEnergyEntries(supabase, newPlant.id, energyData);
        } catch (e) {
          console.error(`apsystems: erro energia ${plant.name}: ${e}`);
        }
      }
    }
    return { synced: plants.length, energyPoints };
  }

  // ─── Optimized path: plants already exist, only collect energy ───
  console.log(`apsystems: ${dbPlants.length} plantas no DB, coletando apenas energia`);

  const sid = credentials.system_id || "";
  let energyPoints = 0;

  for (let i = 0; i < dbPlants.length; i++) {
    const plant = dbPlants[i];
    // Extract ECU ID from plant name "ECU 216000037518" → "216000037518"
    const ecuId = plant.name.replace("ECU ", "").trim();
    const externalId = `${sid}_ECU_${ecuId}`;

    // Delay between ECUs (5s to be safe with rate limits)
    if (i > 0) {
      console.log(`apsystems: aguardando 5s antes de ECU ${ecuId}...`);
      await new Promise(r => setTimeout(r, 5000));
    }

    try {
      console.log(`apsystems: coletando energia ECU ${ecuId} (plant ${plant.id})`);
      const energyData = await apsystems.collectEnergy(session, externalId);
      console.log(`apsystems: ECU ${ecuId} retornou ${energyData.length} pontos`);
      energyPoints += await persistEnergyEntries(supabase, plant.id, energyData);

      // Update plant status to online
      await supabase.from("plants").update({
        status: "online",
        updated_at: new Date().toISOString(),
      }).eq("id", plant.id);
    } catch (e) {
      console.error(`apsystems: erro ao coletar ECU ${ecuId}: ${e}`);
      // Don't throw — continue with next ECU
    }
  }

  // Historical data: only at 22-23h UTC window
  const currentHour = new Date().getUTCHours();
  if (currentHour >= 22) {
    console.log("apsystems: janela de coleta histórica ativa");
    for (let i = 0; i < dbPlants.length; i++) {
      const plant = dbPlants[i];
      const ecuId = plant.name.replace("ECU ", "").trim();
      const externalId = `${sid}_ECU_${ecuId}`;

      await new Promise(r => setTimeout(r, 5000));
      try {
        const endDate = new Date().toISOString().split("T")[0];
        const startDate30 = new Date();
        startDate30.setDate(startDate30.getDate() - 30);
        const dailyData = await apsystems.collectDailyEnergy(session, externalId, startDate30.toISOString().split("T")[0], endDate);
        energyPoints += await persistEnergyEntries(supabase, plant.id, dailyData);
      } catch (e) {
        console.log(`apsystems: erro histórico diário ECU ${ecuId}: ${e}`);
      }
    }
  }

  return { synced: dbPlants.length, energyPoints };
}

// Helper: persist energy entries for a plant
async function persistEnergyEntries(
  supabase: any,
  plantId: string,
  entries: NormalizedEnergyData[]
): Promise<number> {
  let count = 0;
  for (const entry of entries) {
    const { error } = await supabase.from("energy_data").upsert({
      plant_id: plantId,
      device_id: null,
      timestamp: entry.timestamp,
      generation_power_kw: entry.generation_power_kw || 0,
      consumption_power_kw: entry.consumption_power_kw || 0,
      energy_generated_kwh: entry.energy_generated_kwh || 0,
      energy_consumed_kwh: entry.energy_consumed_kwh || 0,
      voltage: entry.voltage || null,
      current: entry.current || null,
      temperature: entry.temperature || null,
      status: entry.status || "ok",
    }, { onConflict: "plant_id,timestamp", ignoreDuplicates: true });
    if (!error) count++;
  }
  return count;
}

// ─── Persist energy data from user-triggered collection ───
async function persistEnergyData(
  supabase: any,
  tenantId: string,
  data: NormalizedEnergyData[]
) {
  for (const entry of data) {
    const { data: plant } = await supabase
      .from("plants")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .single();

    if (!plant) continue;

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

function jsonOk(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
