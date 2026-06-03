// Temporary one-off function to provision a test user for screenshot capture.
// Safe to delete after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const email = "screenshot.bot@utilihub.test";
  const password = "Screenshot#2026!Bot";

  // Create (or fetch existing) auth user with confirmed email
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Screenshot Bot" },
  });

  let userId = created?.user?.id;
  if (cErr && !userId) {
    // Already exists — look it up
    const { data: list } = await admin.auth.admin.listUsers();
    userId = list?.users.find((u) => u.email === email)?.id;
    if (userId) {
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    }
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: cErr?.message ?? "no user id" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Promote to gestor for full read access (no destructive perms)
  await admin.from("user_roles").delete().eq("user_id", userId);
  await admin.from("user_roles").insert({ user_id: userId, role: "gestor" });

  return new Response(JSON.stringify({ ok: true, email, password, user_id: userId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
