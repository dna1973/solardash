import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Não autenticado");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check admin role
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado: apenas administradores");

    const { action, ...params } = await req.json();

    switch (action) {
      case "invite_user": {
        const { email, full_name, role } = params;

        // Create user via admin API (auto-confirms)
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name },
        });
        if (createErr) throw new Error(`Erro ao criar usuário: ${createErr.message}`);

        // Get caller tenant
        const { data: callerTenant } = await adminClient
          .from("profiles")
          .select("tenant_id")
          .eq("user_id", caller.id)
          .limit(1)
          .single();

        // Create profile
        await adminClient.from("profiles").insert({
          user_id: newUser.user.id,
          tenant_id: callerTenant!.tenant_id,
          full_name: full_name || "",
        });

        // Set role (delete default first)
        await adminClient.from("user_roles").delete().eq("user_id", newUser.user.id);
        await adminClient.from("user_roles").insert({
          user_id: newUser.user.id,
          role: role || "operador",
        });

        return new Response(
          JSON.stringify({ success: true, user_id: newUser.user.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_role": {
        const { user_id, role } = params;

        // Prevent self-demotion
        if (user_id === caller.id) throw new Error("Não é possível alterar seu próprio perfil");

        await adminClient.from("user_roles").delete().eq("user_id", user_id);
        await adminClient.from("user_roles").insert({ user_id, role });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_user": {
        const { user_id, full_name, phone } = params;

        await adminClient
          .from("profiles")
          .update({ full_name, phone })
          .eq("user_id", user_id);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_user": {
        const { user_id } = params;

        if (user_id === caller.id) throw new Error("Não é possível excluir a si mesmo");

        // Delete from auth (cascades to profiles/roles)
        const { error: delErr } = await adminClient.auth.admin.deleteUser(user_id);
        if (delErr) throw new Error(`Erro ao excluir: ${delErr.message}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
