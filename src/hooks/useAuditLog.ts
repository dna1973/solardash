import { supabase } from "@/integrations/supabase/client";

interface AuditLogParams {
  eventType: string;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent({
  eventType,
  description,
  entityType,
  entityId,
  metadata,
}: AuditLogParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tenantData } = await supabase.rpc("get_user_tenant_id", { _user_id: user.id });

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    await supabase.from("audit_logs" as any).insert({
      user_id: user.id,
      user_email: user.email,
      user_name: profile?.full_name || user.email,
      tenant_id: tenantData,
      event_type: eventType,
      entity_type: entityType || null,
      entity_id: entityId || null,
      description,
      metadata: metadata || {},
    });
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}
