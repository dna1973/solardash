import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be multipart/form-data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);

    const mimeType = file.type || "application/pdf";

    const prompt = `Analise este relatório de geração de energia solar. 
Extraia os dados da tabela com as seguintes regras:
- Cada linha da tabela representa uma usina/ECU (identificada pelo ID numérico na primeira coluna, ex: 216000047026)
- Cada coluna representa um mês (Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec)
- Os valores são em kWh
- IGNORE a linha "Total" (soma)
- IGNORE linhas com valor 0 em todos os meses
- O ano do relatório deve ser inferido do título ou contexto do documento

Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem backticks):
{
  "year": 2026,
  "data": [
    {
      "ecu_id": "216000047026",
      "values": {
        "Jan": 8057.68,
        "Feb": 6597.13,
        "Mar": 3211.98
      }
    }
  ]
}

Inclua apenas meses que tenham valores > 0. Não inclua ECUs que tenham todos os valores zerados.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Clean markdown formatting
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    const parsed = JSON.parse(content);

    // Transform into flat array for frontend
    const monthMap: Record<string, number> = {
      Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
      Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
    };

    const rows: Array<{ ecu_id: string; month: number; year: number; energy_generated_kwh: number }> = [];

    for (const entry of parsed.data || []) {
      for (const [monthName, value] of Object.entries(entry.values || {})) {
        const monthNum = monthMap[monthName];
        if (monthNum && typeof value === "number" && value > 0) {
          rows.push({
            ecu_id: entry.ecu_id,
            month: monthNum,
            year: parsed.year,
            energy_generated_kwh: value,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: rows, year: parsed.year }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing generation report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
