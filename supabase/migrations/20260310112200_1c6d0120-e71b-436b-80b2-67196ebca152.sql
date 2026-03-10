
CREATE TABLE public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.integrations(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  manufacturer text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, success, partial, error
  plants_synced integer DEFAULT 0,
  energy_points integer DEFAULT 0,
  error_message text,
  details jsonb DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync logs in own tenant"
  ON public.sync_logs FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Service can insert sync logs"
  ON public.sync_logs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_sync_logs_integration ON public.sync_logs(integration_id);
CREATE INDEX idx_sync_logs_created ON public.sync_logs(created_at DESC);
