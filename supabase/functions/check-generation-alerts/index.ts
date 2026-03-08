// Automatic generation alert checker
// Compares recent generation data against plant capacity to detect underperformance
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Thresholds
const LOW_GENERATION_PCT = 0.10; // alert if generating < 10% of capacity during daytime
const ZERO_GENERATION_HOURS = 2;  // alert if zero generation for 2+ hours during daytime
const OFFLINE_HOURS = 4;          // alert if no data for 4+ hours

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const hourUTC = now.getUTCHours();
    // Brazil is UTC-3, so daytime ~6am-18pm local = 9-21 UTC
    const isDaytime = hourUTC >= 9 && hourUTC <= 21;

    console.log(`check-generation-alerts: hora UTC=${hourUTC}, isDaytime=${isDaytime}`);

    // Get all plants
    const { data: plants, error: pErr } = await supabase
      .from("plants")
      .select("id, name, capacity_kwp, tenant_id, status");

    if (pErr) throw new Error(`Erro ao buscar plantas: ${pErr.message}`);
    if (!plants || plants.length === 0) {
      return jsonOk({ success: true, message: "Nenhuma planta cadastrada", alerts_created: 0 });
    }

    const since4h = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const since2h = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    let alertsCreated = 0;

    for (const plant of plants) {
      // Get recent energy data (last 4h)
      const { data: energyData } = await supabase
        .from("energy_data")
        .select("timestamp, generation_power_kw, energy_generated_kwh")
        .eq("plant_id", plant.id)
        .gte("timestamp", since4h)
        .order("timestamp", { ascending: false });

      const records = energyData || [];

      // --- Check 1: No data at all (plant offline) ---
      if (records.length === 0) {
        const created = await createAlertIfNew(supabase, {
          plant_id: plant.id,
          type: "critical",
          message: `Usina "${plant.name}" sem dados há mais de ${OFFLINE_HOURS} horas. Possível falha de comunicação.`,
        });
        if (created) alertsCreated++;
        continue;
      }

      // Only check generation issues during daytime
      if (!isDaytime) continue;

      // --- Check 2: Zero generation for 2+ hours ---
      const recentRecords = records.filter((r: any) => r.timestamp >= since2h);
      if (recentRecords.length > 0) {
        const allZero = recentRecords.every(
          (r: any) => (r.generation_power_kw || 0) < 0.01 && (r.energy_generated_kwh || 0) < 0.01
        );
        if (allZero) {
          const created = await createAlertIfNew(supabase, {
            plant_id: plant.id,
            type: "critical",
            message: `Usina "${plant.name}" com geração ZERO nas últimas ${ZERO_GENERATION_HOURS} horas durante horário solar. Verifique inversores.`,
          });
          if (created) alertsCreated++;
        }
      }

      // --- Check 3: Low generation vs capacity ---
      if (plant.capacity_kwp > 0) {
        const latestPower = records[0]?.generation_power_kw || 0;
        const pctOfCapacity = latestPower / plant.capacity_kwp;

        if (pctOfCapacity < LOW_GENERATION_PCT && latestPower > 0) {
          const pctStr = (pctOfCapacity * 100).toFixed(1);
          const created = await createAlertIfNew(supabase, {
            plant_id: plant.id,
            type: "warning",
            message: `Usina "${plant.name}" gerando apenas ${pctStr}% da capacidade (${latestPower.toFixed(2)} kW de ${plant.capacity_kwp} kWp). Desempenho abaixo do esperado.`,
          });
          if (created) alertsCreated++;
        }
      }

      // --- Check 4: Generation drop (compare avg last 2h vs capacity) ---
      if (plant.capacity_kwp > 0 && recentRecords.length >= 2) {
        const avgPower =
          recentRecords.reduce((sum: number, r: any) => sum + (r.generation_power_kw || 0), 0) /
          recentRecords.length;
        const avgPct = avgPower / plant.capacity_kwp;

        if (avgPct < 0.20 && avgPower > 0) {
          const pctStr = (avgPct * 100).toFixed(1);
          const created = await createAlertIfNew(supabase, {
            plant_id: plant.id,
            type: "warning",
            message: `Média de geração da usina "${plant.name}" nas últimas 2h: ${pctStr}% da capacidade (${avgPower.toFixed(2)} kW). Possível sombreamento ou defeito parcial.`,
          });
          if (created) alertsCreated++;
        }
      }
    }

    // Auto-resolve old alerts that are no longer relevant
    // If a plant now has good generation, resolve its active alerts
    for (const plant of plants) {
      const { data: latestData } = await supabase
        .from("energy_data")
        .select("generation_power_kw")
        .eq("plant_id", plant.id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestData && plant.capacity_kwp > 0) {
        const pct = (latestData.generation_power_kw || 0) / plant.capacity_kwp;
        if (pct >= 0.30 && isDaytime) {
          // Plant is generating well — resolve active warning/critical alerts
          await supabase
            .from("alerts")
            .update({ resolved: true, resolved_at: now.toISOString() })
            .eq("plant_id", plant.id)
            .eq("resolved", false)
            .in("type", ["warning", "critical"]);
        }
      }
    }

    console.log(`check-generation-alerts: ${alertsCreated} novo(s) alerta(s) criado(s)`);
    return jsonOk({ success: true, alerts_created: alertsCreated, plants_checked: plants.length });
  } catch (e) {
    console.error("check-generation-alerts error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Only create alert if there isn't an identical unresolved one in the last 6 hours
async function createAlertIfNew(
  supabase: any,
  alert: { plant_id: string; type: string; message: string; device_id?: string }
): Promise<boolean> {
  const since6h = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  // Check for similar unresolved alert
  const { data: existing } = await supabase
    .from("alerts")
    .select("id")
    .eq("plant_id", alert.plant_id)
    .eq("type", alert.type)
    .eq("resolved", false)
    .gte("created_at", since6h)
    .limit(1);

  if (existing && existing.length > 0) return false;

  const { error } = await supabase.from("alerts").insert({
    plant_id: alert.plant_id,
    device_id: alert.device_id || null,
    type: alert.type,
    message: alert.message,
    resolved: false,
  });

  if (error) {
    console.error(`Erro ao criar alerta: ${error.message}`);
    return false;
  }
  return true;
}

function jsonOk(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
