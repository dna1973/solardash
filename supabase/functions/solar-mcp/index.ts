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
mcpServer.tool("list_plants", {
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
mcpServer.tool("get_energy_data", {
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
mcpServer.tool("get_plant_summary", {
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
mcpServer.tool("get_alerts", {
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

// ── Helper: OCR via Lovable AI ────────────────────────────────────────────────
async function ocrExtract(base64: string, fileType: string, systemPrompt: string): Promise<any> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${fileType};base64,${base64}` } },
            { type: "text", text: "Extraia todos os dados deste documento." },
          ],
        },
      ],
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    throw new Error(`AI error ${aiResponse.status}: ${errText}`);
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices?.[0]?.message?.content || "";
  const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(jsonStr);
}

const ENERGY_PROMPT = `Você é um especialista em extração de dados de contas de energia elétrica brasileiras (Neoenergia, CEMIG, CPFL, Enel, etc).
Analise a imagem da conta de energia e extraia os seguintes dados em formato JSON.
Retorne APENAS o JSON, sem markdown ou texto adicional.

Campos: utility_company, account_number, client_code, invoice_number, property_name, address, reference_month (MM/YYYY), consumption_kwh, generation_kwh, gross_value, lighting_cost, deductions_value, net_value, invoice_value, amount_brl, tariff_type, due_date (YYYY-MM-DD), peak_demand_kw, off_peak_demand_kw, qd.
IMPORTANTE sobre gross_value: REGRA OBRIGATÓRIA: gross_value = net_value + deductions_value. NÃO some itens individuais — use sempre esta fórmula.

IMPORTANTE sobre lighting_cost: O valor correto da iluminação pública é o PRIMEIRO valor numérico que aparece LOGO APÓS o texto "Ilum. Púb. Municipal" — não confunda com ICMS ou outros tributos.
IMPORTANTE sobre consumption_kwh: Em faturas horossazonais, some kWh Ponta + kWh Fora Ponta (não duplique TUSD+TE do mesmo posto).
Se algum campo não for encontrado, use null. Para valores numéricos não encontrados, use 0.`;

const WATER_PROMPT = `Você é um especialista em extração de dados de contas de água brasileiras (COMPESA, Sabesp, etc).
Analise a imagem da conta de água e extraia os seguintes dados em formato JSON.
Retorne APENAS o JSON, sem markdown ou texto adicional.

Campos: utility_company, account_number, client_code, invoice_number, property_name, address, reference_month (MM/YYYY), consumption_m3, water_value, sewer_value, total_value, tariff_type, due_date (YYYY-MM-DD), consumption_history (array de {month: "MM/YYYY", consumption_m3: number}).
Se algum campo não for encontrado, use null. Para valores numéricos não encontrados, use 0.`;

// ── Tool: import_energy_bill ──────────────────────────────────────────────────
mcpServer.tool("import_energy_bill", {
  description:
    "Importa uma conta de energia elétrica via arquivo em base64. Processa OCR, extrai dados e salva no banco de dados.",
  inputSchema: {
    type: "object",
    properties: {
      file_base64: { type: "string", description: "Conteúdo do arquivo codificado em base64" },
      file_name: { type: "string", description: "Nome do arquivo (ex: conta_energia.pdf)" },
      file_type: { type: "string", description: "MIME type (ex: application/pdf, image/jpeg)" },
      tenant_id: { type: "string", description: "UUID do tenant (opcional — usa default se omitido)" },
    },
    required: ["file_base64", "file_name", "file_type"],
  },
  handler: async ({ file_base64, file_name, file_type, tenant_id }: {
    file_base64: string; file_name: string; file_type: string; tenant_id?: string;
  }) => {
    try {
      // Resolve tenant
      const tid = tenant_id || (await supabase.from("tenants").select("id").eq("slug", "default").single()).data?.id;
      if (!tid) return { content: [{ type: "text", text: "Erro: tenant não encontrado" }] };

      // Upload to storage
      const safeName = file_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${tid}/${Date.now()}_${safeName}`;
      const fileBuffer = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0));

      const { error: uploadErr } = await supabase.storage
        .from("energy-bills")
        .upload(filePath, fileBuffer, { contentType: file_type });
      if (uploadErr) return { content: [{ type: "text", text: `Erro upload: ${uploadErr.message}` }] };

      // OCR
      const extracted = await ocrExtract(file_base64, file_type, ENERGY_PROMPT);

      // Check duplicate
      if (extracted.account_number && extracted.reference_month) {
        const { data: existing } = await supabase.from("energy_bills")
          .select("id")
          .eq("tenant_id", tid)
          .eq("account_number", extracted.account_number)
          .eq("reference_month", extracted.reference_month)
          .maybeSingle();
        if (existing) {
          return { content: [{ type: "text", text: JSON.stringify({ warning: "Conta duplicada", existing_id: existing.id, extracted }, null, 2) }] };
        }
      }

      // Insert
      const { data: inserted, error: insertErr } = await supabase.from("energy_bills").insert({
        tenant_id: tid,
        pdf_path: filePath,
        utility_company: extracted.utility_company,
        account_number: extracted.account_number,
        client_code: extracted.client_code,
        invoice_number: extracted.invoice_number,
        property_name: extracted.property_name,
        address: extracted.address,
        reference_month: extracted.reference_month,
        consumption_kwh: extracted.consumption_kwh ?? 0,
        generation_kwh: extracted.generation_kwh ?? 0,
        gross_value: extracted.gross_value ?? 0,
        lighting_cost: extracted.lighting_cost ?? 0,
        deductions_value: extracted.deductions_value ?? 0,
        net_value: extracted.net_value ?? 0,
        invoice_value: extracted.invoice_value ?? 0,
        amount_brl: extracted.amount_brl ?? 0,
        tariff_type: extracted.tariff_type,
        due_date: extracted.due_date,
        peak_demand_kw: extracted.peak_demand_kw,
        off_peak_demand_kw: extracted.off_peak_demand_kw,
        qd: extracted.qd,
        raw_ocr_data: extracted,
      }).select().single();

      if (insertErr) return { content: [{ type: "text", text: `Erro ao salvar: ${insertErr.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify({ success: true, bill: inserted }, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  },
});

// ── Tool: import_water_bill ───────────────────────────────────────────────────
mcpServer.tool("import_water_bill", {
  description:
    "Importa uma conta de água via arquivo em base64. Processa OCR, extrai dados e salva no banco de dados.",
  inputSchema: {
    type: "object",
    properties: {
      file_base64: { type: "string", description: "Conteúdo do arquivo codificado em base64" },
      file_name: { type: "string", description: "Nome do arquivo (ex: conta_agua.pdf)" },
      file_type: { type: "string", description: "MIME type (ex: application/pdf, image/jpeg)" },
      tenant_id: { type: "string", description: "UUID do tenant (opcional — usa default se omitido)" },
    },
    required: ["file_base64", "file_name", "file_type"],
  },
  handler: async ({ file_base64, file_name, file_type, tenant_id }: {
    file_base64: string; file_name: string; file_type: string; tenant_id?: string;
  }) => {
    try {
      const tid = tenant_id || (await supabase.from("tenants").select("id").eq("slug", "default").single()).data?.id;
      if (!tid) return { content: [{ type: "text", text: "Erro: tenant não encontrado" }] };

      const safeName = file_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${tid}/${Date.now()}_${safeName}`;
      const fileBuffer = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0));

      const { error: uploadErr } = await supabase.storage
        .from("water-bills")
        .upload(filePath, fileBuffer, { contentType: file_type });
      if (uploadErr) return { content: [{ type: "text", text: `Erro upload: ${uploadErr.message}` }] };

      const extracted = await ocrExtract(file_base64, file_type, WATER_PROMPT);

      // Check duplicate
      if (extracted.account_number && extracted.reference_month) {
        const { data: existing } = await supabase.from("water_bills")
          .select("id")
          .eq("tenant_id", tid)
          .eq("account_number", extracted.account_number)
          .eq("reference_month", extracted.reference_month)
          .maybeSingle();
        if (existing) {
          return { content: [{ type: "text", text: JSON.stringify({ warning: "Conta duplicada", existing_id: existing.id, extracted }, null, 2) }] };
        }
      }

      const { data: inserted, error: insertErr } = await supabase.from("water_bills").insert({
        tenant_id: tid,
        pdf_path: filePath,
        utility_company: extracted.utility_company,
        account_number: extracted.account_number,
        client_code: extracted.client_code,
        invoice_number: extracted.invoice_number,
        property_name: extracted.property_name,
        address: extracted.address,
        reference_month: extracted.reference_month,
        consumption_m3: extracted.consumption_m3 ?? 0,
        water_value: extracted.water_value ?? 0,
        sewer_value: extracted.sewer_value ?? 0,
        total_value: extracted.total_value ?? 0,
        tariff_type: extracted.tariff_type,
        due_date: extracted.due_date,
        consumption_history: extracted.consumption_history ?? [],
        raw_ocr_data: extracted,
      }).select().single();

      if (insertErr) return { content: [{ type: "text", text: `Erro ao salvar: ${insertErr.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify({ success: true, bill: inserted }, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Erro: ${e.message}` }] };
    }
  },
});

// ── HTTP Transport ────────────────────────────────────────────────────────────
const app = new Hono();

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

  // Create a fresh transport per request and bind it to the server
  const transport = new StreamableHttpTransport();
  return await transport.handleRequest(c.req.raw, mcpServer);
});

Deno.serve(app.fetch);
