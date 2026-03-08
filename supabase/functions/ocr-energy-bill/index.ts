import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    // Create client with user's token for RLS
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Get user's tenant
    const { data: tenantData } = await createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      .rpc("get_user_tenant_id", { _user_id: user.id });

    const tenantId = tenantData;
    if (!tenantId) throw new Error("User has no tenant");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file uploaded");

    // Upload PDF to storage
    const filePath = `${tenantId}/${Date.now()}_${file.name}`;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: uploadError } = await adminClient.storage
      .from("energy-bills")
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Convert PDF to base64 for AI processing
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Use Lovable AI (Gemini) for OCR extraction
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
            role: "system",
            content: `Você é um especialista em extração de dados de contas de energia elétrica brasileiras.
Analise a imagem da conta de energia e extraia os seguintes dados em formato JSON.
Retorne APENAS o JSON, sem markdown ou texto adicional.

Campos obrigatórios:
{
  "utility_company": "nome da concessionária",
  "account_number": "número da conta/UC",
  "property_name": "nome do titular ou identificação",
  "address": "endereço da unidade consumidora",
  "reference_month": "mês/ano de referência (MM/YYYY)",
  "consumption_kwh": número em kWh consumido,
  "generation_kwh": número em kWh gerado/injetado (0 se não houver),
  "amount_brl": valor total da fatura em reais,
  "peak_demand_kw": demanda ponta em kW (null se não houver),
  "off_peak_demand_kw": demanda fora ponta em kW (null se não houver),
  "tariff_type": "tipo de tarifa (B1, B2, B3, A4, etc.)",
  "due_date": "data de vencimento (YYYY-MM-DD)"
}

Se algum campo não for encontrado, use null. Para valores numéricos não encontrados, use 0.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64}`,
                },
              },
              {
                type: "text",
                text: "Extraia todos os dados desta conta de energia elétrica.",
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI processing failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response (strip markdown code blocks if present)
    let extracted;
    try {
      const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      extracted = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      extracted = {};
    }

    return new Response(
      JSON.stringify({
        success: true,
        extracted,
        pdf_path: filePath,
        tenant_id: tenantId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("OCR error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
