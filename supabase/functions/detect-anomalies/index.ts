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
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create client with user's auth for RLS
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header for tenant isolation
    let userId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? supabaseKey
      );
      const {
        data: { user },
      } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id ?? null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch plants for this tenant
    const { data: plants } = await supabase
      .from("plants")
      .select("id, name, capacity_kwp, status, location")
      .eq("tenant_id", profile.tenant_id);

    // Fetch devices for these plants
    const plantIds = (plants || []).map((p: any) => p.id);
    let devices: any[] = [];
    let recentEnergy: any[] = [];

    if (plantIds.length > 0) {
      const { data: devData } = await supabase
        .from("devices")
        .select("id, plant_id, manufacturer, model, serial_number, device_type, status, last_communication")
        .in("plant_id", plantIds);
      devices = devData || [];

      // Fetch last 24h of energy data
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: energyData } = await supabase
        .from("energy_data")
        .select("plant_id, device_id, timestamp, generation_power_kw, consumption_power_kw, energy_generated_kwh, energy_consumed_kwh, voltage, current, temperature, status")
        .in("plant_id", plantIds)
        .gte("timestamp", since)
        .order("timestamp", { ascending: false })
        .limit(500);
      recentEnergy = energyData || [];
    }

    // Build context for AI analysis
    const context = {
      plants: plants || [],
      devices,
      energy_data_last_24h: recentEnergy,
      analysis_time: new Date().toISOString(),
    };

    const systemPrompt = `Você é um engenheiro especialista em energia solar fotovoltaica e monitoramento de usinas.
Analise os dados fornecidos e identifique anomalias, falhas e problemas potenciais.

Para cada anomalia encontrada, retorne:
- severity: "critical" | "warning" | "info"
- title: título curto da anomalia
- description: descrição detalhada do problema
- affected_entity: nome da usina ou equipamento afetado
- recommendation: ação recomendada

Se não houver dados suficientes (arrays vazios), retorne anomalias de exemplo baseadas em cenários comuns de monitoramento solar para demonstrar a funcionalidade.

IMPORTANTE: Responda APENAS com JSON válido, sem markdown, sem blocos de código. O formato deve ser:
{"anomalies": [...]}`;

    const userPrompt = `Analise os seguintes dados de monitoramento solar e identifique anomalias:

${JSON.stringify(context, null, 2)}`;

    // Call AI Gateway
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "{}";

    // Parse AI response - strip markdown code blocks if present
    let anomalies;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      anomalies = JSON.parse(cleaned);
    } catch {
      anomalies = { anomalies: [], raw: rawContent };
    }

    return new Response(JSON.stringify(anomalies), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-anomalies error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
