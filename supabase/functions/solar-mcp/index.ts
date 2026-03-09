import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Admin client — bypasses RLS to serve MCP queries
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── MCP Server ────────────────────────────────────────────────────────────────
const mcpServer = new McpServer({
  name: "solar-mcp",
  version: "1.0.0",
});

// ── Tool: list_plants ─────────────────────────────────────────────────────────
mcpServer.tool({
  name: "list_plants",
  description:
    "Lista todas as usinas solares cadastradas com status, capacidade instalada e localização",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["online", "offline", "warning", "maintenance"],
        description: "Filtrar por status da usina (opcional)",
      },
    },
  },
  handler: async ({ status }: { status?: string }) => {
    let query = supabase
      .from("plants")
      .select(
        "id, name, location, status, capacity_kwp, latitude, longitude, installation_date, utility_company, integrator"
      )
      .order("name");

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: `Erro: ${error.message}` }] };

    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ── Tool: get_energy_data ─────────────────────────────────────────────────────
mcpServer.tool({
  name: "get_energy_data",
  description:
    "Consulta dados de geração e consumo de energia por usina e período. Retorna registros de potência (kW) e energia (kWh) com timestamps.",
  inputSchema: {
    type: "object",
    properties: {
      plant_id: {
        type: "string",
        description:
          "UUID da usina. Se omitido, retorna dados de todas as usinas",
      },
      start_date: {
        type: "string",
        description: "Data/hora de início ISO 8601 (ex: 2024-01-01T00:00:00Z)",
      },
      end_date: {
        type: "string",
        description: "Data/hora de fim ISO 8601 (ex: 2024-01-31T23:59:59Z)",
      },
      limit: {
        type: "number",
        description: "Máximo de registros (padrão: 100, máximo: 1000)",
      },
    },
  },
  handler: async ({
    plant_id,
    start_date,
    end_date,
    limit = 100,
  }: {
    plant_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }) => {
    let query = supabase
      .from("energy_data")
      .select(
        `id, plant_id, device_id, timestamp,
         generation_power_kw, consumption_power_kw,
         energy_generated_kwh, energy_consumed_kwh,
         voltage, current, temperature, status,
         plants(name, location)`
      )
      .order("timestamp", { ascending: false })
      .limit(Math.min(limit, 1000));

    if (plant_id) query = query.eq("plant_id", plant_id);
    if (start_date) query = query.gte("timestamp", start_date);
    if (end_date) query = query.lte("timestamp", end_date);

    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: `Erro: ${error.message}` }] };

    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ── Tool: get_plant_summary ───────────────────────────────────────────────────
mcpServer.tool({
  name: "get_plant_summary",
  description:
    "Retorna um resumo estatístico agregado de geração e consumo por usina: total kWh gerado/consumido, pico de potência e contagem de registros",
  inputSchema: {
    type: "object",
    properties: {
      plant_id: {
        type: "string",
        description:
          "UUID da usina. Se omitido, retorna resumo de todas as usinas",
      },
      start_date: {
        type: "string",
        description: "Data/hora de início ISO 8601",
      },
      end_date: {
        type: "string",
        description: "Data/hora de fim ISO 8601",
      },
    },
  },
  handler: async ({
    plant_id,
    start_date,
    end_date,
  }: {
    plant_id?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    let query = supabase.from("energy_data").select(
      `plant_id, energy_generated_kwh, energy_consumed_kwh,
       generation_power_kw, consumption_power_kw, timestamp,
       plants(name, capacity_kwp, location)`
    );

    if (plant_id) query = query.eq("plant_id", plant_id);
    if (start_date) query = query.gte("timestamp", start_date);
    if (end_date) query = query.lte("timestamp", end_date);

    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: `Erro: ${error.message}` }] };

    // Aggregate per plant
    const plantMap: Record<string, {
      plant_id: string;
      plant_name: string | null;
      capacity_kwp: number | null;
      location: string | null;
      total_generated_kwh: number;
      total_consumed_kwh: number;
      peak_generation_kw: number;
      peak_consumption_kw: number;
      records_count: number;
    }> = {};

    for (const row of data ?? []) {
      const pid = row.plant_id;
      const plant = (row as any).plants;
      if (!plantMap[pid]) {
        plantMap[pid] = {
          plant_id: pid,
          plant_name: plant?.name ?? null,
          capacity_kwp: plant?.capacity_kwp ?? null,
          location: plant?.location ?? null,
          total_generated_kwh: 0,
          total_consumed_kwh: 0,
          peak_generation_kw: 0,
          peak_consumption_kw: 0,
          records_count: 0,
        };
      }
      plantMap[pid].total_generated_kwh += row.energy_generated_kwh ?? 0;
      plantMap[pid].total_consumed_kwh += row.energy_consumed_kwh ?? 0;
      plantMap[pid].peak_generation_kw = Math.max(
        plantMap[pid].peak_generation_kw,
        row.generation_power_kw ?? 0
      );
      plantMap[pid].peak_consumption_kw = Math.max(
        plantMap[pid].peak_consumption_kw,
        row.consumption_power_kw ?? 0
      );
      plantMap[pid].records_count++;
    }

    const summary = Object.values(plantMap).map((p) => ({
      ...p,
      total_generated_kwh: Math.round(p.total_generated_kwh * 100) / 100,
      total_consumed_kwh: Math.round(p.total_consumed_kwh * 100) / 100,
      peak_generation_kw: Math.round(p.peak_generation_kw * 100) / 100,
      peak_consumption_kw: Math.round(p.peak_consumption_kw * 100) / 100,
    }));

    return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
  },
});

// ── Tool: get_alerts ──────────────────────────────────────────────────────────
mcpServer.tool({
  name: "get_alerts",
  description:
    "Busca alertas do sistema de monitoramento solar (geração baixa, offline, anomalias)",
  inputSchema: {
    type: "object",
    properties: {
      plant_id: {
        type: "string",
        description: "UUID da usina para filtrar alertas (opcional)",
      },
      resolved: {
        type: "boolean",
        description:
          "false = apenas ativos, true = apenas resolvidos, omitir = todos",
      },
      limit: {
        type: "number",
        description: "Máximo de alertas a retornar (padrão: 50)",
      },
    },
  },
  handler: async ({
    plant_id,
    resolved,
    limit = 50,
  }: {
    plant_id?: string;
    resolved?: boolean;
    limit?: number;
  }) => {
    let query = supabase
      .from("alerts")
      .select(
        `id, type, message, resolved, resolved_at, created_at,
         plants(name, location)`
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 500));

    if (plant_id) query = query.eq("plant_id", plant_id);
    if (resolved !== undefined) query = query.eq("resolved", resolved);

    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: `Erro: ${error.message}` }] };

    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ── HTTP Transport ────────────────────────────────────────────────────────────
const app = new Hono();
const transport = new StreamableHttpTransport();

app.all("/*", async (c) => {
  // Optional API key guard
  if (LOVABLE_API_KEY) {
    const auth = c.req.header("Authorization") ?? c.req.header("x-api-key") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    if (token !== LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return await transport.handleRequest(c.req.raw, mcpServer);
});

Deno.serve(app.fetch);
