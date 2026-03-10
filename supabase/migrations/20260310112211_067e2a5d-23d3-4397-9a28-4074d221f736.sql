
DROP POLICY "Service can insert sync logs" ON public.sync_logs;

CREATE POLICY "Service can insert sync logs"
  ON public.sync_logs FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
