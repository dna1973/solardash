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

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: tenantData } = await createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      .rpc("get_user_tenant_id", { _user_id: user.id });

    const tenantId = tenantData;
    if (!tenantId) throw new Error("User has no tenant");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file uploaded");

    // Upload to storage - sanitize filename
    const safeName = file.name
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${tenantId}/${Date.now()}_${safeName}`;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: uploadError } = await adminClient.storage
      .from("water-bills")
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    const base64 = btoa(binary);

    // Use Lovable AI for OCR extraction
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
            content: `Você é um especialista em extração de dados de contas de água brasileiras, especialmente da COMPESA (Companhia Pernambucana de Saneamento).
Analise a imagem da conta de água e extraia os seguintes dados em formato JSON.
Retorne APENAS o JSON, sem markdown ou texto adicional.

Instruções de extração — siga rigorosamente:

1. "utility_company": Nome da concessionária (ex: "COMPESA", "Sabesp").
2. "account_number": Número da matrícula / código da instalação.
3. "client_code": Código do cliente / número do contrato. É diferente da matrícula.
4. "invoice_number": Número da fatura ou nota fiscal.
5. "property_name": Nome do titular/cliente.
6. "address": Endereço completo da unidade consumidora.
7. "reference_month": Mês/ano de referência no formato "MM/YYYY" (ex: "10/2025").
8. "consumption_m3": Consumo total de água em metros cúbicos (m³) no período.
9. "water_value": Valor cobrado pela água (R$). Procure por "Água" ou "Tarifa de Água".
10. "sewer_value": Valor cobrado pelo esgoto (R$). Procure por "Esgoto" ou "Tarifa de Esgoto".
11. "total_value": Valor total da fatura (R$). Procure por "TOTAL" ou "Valor a Pagar".
12. "tariff_type": Categoria/tipo de tarifa (ex: "Residencial", "Comercial", "Industrial", "Social").
13. "due_date": Data de vencimento no formato "YYYY-MM-DD" (ex: "2025-12-19").
14. "consumption_history": Array de objetos com o histórico de consumo dos meses anteriores, se disponível na fatura.
    Cada item deve ter: {"month": "MM/YYYY", "consumption_m3": number}
    Se não houver histórico, retorne array vazio [].

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
                text: "Extraia todos os dados desta conta de água.",
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
    console.error("OCR water bill error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
