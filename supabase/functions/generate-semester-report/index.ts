import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const body = await req.json();

    // Mode: extract commission members from portaria PDF via OCR
    if (body.mode === "extract_commission") {
      const { fileBase64, fileType } = body;
      if (!fileBase64) throw new Error("Arquivo não fornecido.");

      const mimeType = fileType || "application/pdf";
      const commissionPrompt = `Analise este documento (Portaria) e extraia a lista de membros da comissão.

Para cada membro, retorne:
- name: Nome completo
- matricula: Número da matrícula (SIAPE)
- lotacao: Lotação (ex: SEDE, DEL01-PE, DEL02-PE, etc.)
- role: Função na comissão. Use "Presidente" para o primeiro membro da SEDE, "Vice-Presidente" para o segundo membro da SEDE, e "Membro DELxx" para os demais.

O Parágrafo Único do Art. 3º define que o Presidente e o Vice-Presidente são os representantes da Sede.

Retorne EXATAMENTE neste formato JSON:
{
  "members": [
    { "name": "...", "matricula": "...", "lotacao": "...", "role": "..." }
  ]
}`;

      const ocrResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: [
              { type: "text", text: commissionPrompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
            ]},
          ],
        }),
      });

      if (!ocrResponse.ok) {
        const t = await ocrResponse.text();
        console.error("AI OCR error:", ocrResponse.status, t);
        throw new Error("Erro ao processar documento com IA.");
      }

      const ocrResult = await ocrResponse.json();
      const content = ocrResult.choices?.[0]?.message?.content || "";
      let parsed;
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
        parsed = JSON.parse(jsonStr);
      } catch {
        throw new Error("Não foi possível interpretar a resposta da IA.");
      }

      return new Response(JSON.stringify({ success: true, members: parsed.members || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default mode: generate semester report analysis
    const { generationData, savingData, alertsData, rateiData, semesterLabel, totalSaving, checklistItems } = body;

    const systemPrompt = `Você é um consultor especializado em eficiência energética do setor público brasileiro, com profundo conhecimento da regulação de Geração Distribuída (GD) e do Sistema de Compensação de Energia Elétrica (SCEE).

Contexto Legal:
- Portaria nº 11/2026 da Superintendência de Polícia Federal em Pernambuco (CGE-PE)
- Art. 2º, II: A Comissão deve gerir o rateio de créditos junto à Neoenergia
- Art. 2º, III: Identificar cobranças indevidas e promover ações de Repetição de Indébito
- Art. 4º: Relatório Semestral de Eficiência Energética obrigatório
- Art. 5º: Levantamento Inicial de pendências em 60 dias

Instruções:
1. Escreva um "Resumo Executivo" (2-3 parágrafos) sobre o desempenho geral da geração solar no semestre, citando números reais fornecidos.
2. Analise o rateio de créditos e se houve cumprimento do planejado.
3. Analise se há indícios de cobranças indevidas pela concessionária (Neoenergia), fundamentando com base no Art. 2º, III — Repetição de Indébito.
4. Escreva uma "Conclusão e Recomendações" (2-3 parágrafos) com sugestões de otimização do SCEE.
5. Use linguagem técnica formal apropriada para documento oficial.

Retorne EXATAMENTE neste formato JSON:
{
  "resumoExecutivo": "texto...",
  "conclusaoRecomendacoes": "texto..."
}`;

    const userPrompt = `Dados do ${semesterLabel}:

GERAÇÃO POR USINA/MÊS:
${JSON.stringify(generationData, null, 2)}

ECONOMIA TOTAL DO SEMESTRE: R$ ${totalSaving?.toFixed(2) || "0,00"}

SAVING POR USINA:
${JSON.stringify(savingData, null, 2)}

RATEIO DE CRÉDITOS POR UNIDADE CONSUMIDORA:
${JSON.stringify(rateiData, null, 2)}

ALERTAS E EVENTOS DO PERÍODO:
${JSON.stringify(alertsData, null, 2)}

${checklistItems ? `PENDÊNCIAS DO LEVANTAMENTO INICIAL (Art. 5º):\n${JSON.stringify(checklistItems, null, 2)}` : ""}

Gere o Resumo Executivo e a Conclusão/Recomendações conforme instruído.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos no workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar análise com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from the AI response
    let parsed;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = {
        resumoExecutivo: content,
        conclusaoRecomendacoes: "",
      };
    }

    return new Response(JSON.stringify({ success: true, ...parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-semester-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
