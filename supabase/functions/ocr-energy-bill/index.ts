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
            content: `Você é um especialista em extração de dados de contas de energia elétrica brasileiras (Neoenergia, CEMIG, CPFL, Enel, etc).
Analise a imagem da conta de energia e extraia os seguintes dados em formato JSON.
Retorne APENAS o JSON, sem markdown ou texto adicional.

Instruções de extração — siga rigorosamente:

1. "utility_company": Nome da concessionária (ex: "Neoenergia Pernambuco", "CEMIG", "Enel").
2. "account_number": Código da instalação / Número da UC (ex: "2795739"). NÃO confundir com código do cliente.
20. "client_code": Código do cliente (ex: "2770007014"). Procure por "CÓDIGO DO CLIENTE" ou "Cód. Cliente". É um número diferente do número da UC/instalação.
3. "invoice_number": Número da Nota Fiscal (ex: "383406885"). Procure por "NOTA FISCAL N°" ou "NF-e".
4. "property_name": Nome do titular/cliente. Procure por "NOME DO CLIENTE" ou no boleto "PAGADOR".
5. "address": Endereço completo da unidade consumidora com bairro/cidade.
6. "reference_month": Mês/ano de referência no formato "MM/YYYY" (ex: "10/2025"). Procure por "REF:MÊS/ANO".
7. "consumption_kwh": Soma total de consumo em kWh. Some TODAS as linhas de "Consumo" nos itens da fatura (Consumo-TUSD + Consumo-TE, Ponta + Fora Ponta). Use a coluna "QUANT." das linhas que tenham unidade "kWh". NÃO duplique — some apenas as quantidades únicas. Se houver linhas TUSD e TE para o mesmo posto (ponta/fora ponta), a quantidade kWh é a mesma em ambas, então conte apenas uma vez por posto.
8. "generation_kwh": Energia injetada/compensada em kWh. Se não houver créditos de geração, use 0.
9. "gross_value": Valor bruto — soma de TODOS os itens positivos da coluna "VALOR COM TRIB.(R$)" na tabela de itens da fatura (excluindo deduções/descontos negativos e iluminação pública).
10. "lighting_cost": Valor da Iluminação Pública / CIP / COSIP. Procure por "Ilum. Púb. Municipal" ou "CIP" ou "COSIP".
11. "deductions_value": Soma dos valores negativos/descontos (Tributo Federal, PIS/COFINS deduzidos, etc). Procure valores com sinal negativo ou com sufixo "-". Retorne como número POSITIVO.
12. "net_value": Valor líquido / TOTAL A PAGAR. É o valor final da fatura. Procure "TOTAL A PAGAR R$" ou a linha "TOTAL" dos itens.
13. "invoice_value": Mesmo valor do "TOTAL A PAGAR" / Valor do Documento no boleto.
14. "amount_brl": Mesmo valor do net_value (total a pagar).
15. "tariff_type": Classificação tarifária (ex: "A4 Horo-sazonal Verde", "B1", "B3"). Procure por "CLASSIFICAÇÃO:".
16. "due_date": Data de vencimento no formato "YYYY-MM-DD" (ex: "2025-12-19").
17. "peak_demand_kw": Demanda contratada/medida Ponta em kW (null se não houver).
18. "off_peak_demand_kw": Demanda contratada/medida Fora Ponta em kW (null se não houver). Se houver apenas "Demanda Ativa" sem distinção ponta/fora ponta, coloque em peak_demand_kw.
19. "qd": Quadra ou código QD se presente no documento (null se não houver).

IMPORTANTE sobre consumo_kwh:
- Em faturas horossazonais (A4, A3, etc), há linhas separadas para Ponta e Fora Ponta.
- Cada posto (Ponta/Fora Ponta) pode ter duas linhas: TUSD e TE, mas a QUANTIDADE kWh é a MESMA.
- Some: kWh Ponta + kWh Fora Ponta (não duplique TUSD+TE do mesmo posto).
- Exemplo: se Consumo-TUSD NPonta = 736,10 kWh e Consumo-TUSD F.Ponta = 10.157,75 kWh → total = 10.893,85 kWh.

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
