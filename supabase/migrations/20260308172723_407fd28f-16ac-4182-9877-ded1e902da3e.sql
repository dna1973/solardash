
-- 1. Plants table
CREATE TABLE public.plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  capacity_kwp DOUBLE PRECISION NOT NULL DEFAULT 0,
  installation_date DATE,
  utility_company TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'warning', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view plants in own tenant"
  ON public.plants FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Gestors can manage plants in own tenant"
  ON public.plants FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Gestors can update plants in own tenant"
  ON public.plants FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins can delete plants"
  ON public.plants FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_plants_updated_at
  BEFORE UPDATE ON public.plants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_plants_tenant_id ON public.plants(tenant_id);
CREATE INDEX idx_plants_status ON public.plants(status);

-- 2. Devices table
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('inverter', 'meter', 'datalogger', 'gateway', 'sensor')),
  api_endpoint TEXT,
  auth_token TEXT,
  collection_interval_minutes INT NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'warning')),
  last_communication TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Helper: check if device belongs to user's tenant
CREATE OR REPLACE FUNCTION public.device_belongs_to_tenant(_plant_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.plants
    WHERE id = _plant_id
      AND tenant_id = public.get_user_tenant_id(_user_id)
  )
$$;

CREATE POLICY "Users can view devices in own tenant"
  ON public.devices FOR SELECT TO authenticated
  USING (public.device_belongs_to_tenant(plant_id, auth.uid()));

CREATE POLICY "Gestors can insert devices"
  ON public.devices FOR INSERT TO authenticated
  WITH CHECK (
    public.device_belongs_to_tenant(plant_id, auth.uid())
    AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Gestors can update devices"
  ON public.devices FOR UPDATE TO authenticated
  USING (
    public.device_belongs_to_tenant(plant_id, auth.uid())
    AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins can delete devices"
  ON public.devices FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_devices_plant_id ON public.devices(plant_id);
CREATE INDEX idx_devices_status ON public.devices(status);

-- 3. Energy data table (time-series optimized)
CREATE TABLE public.energy_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  generation_power_kw DOUBLE PRECISION DEFAULT 0,
  consumption_power_kw DOUBLE PRECISION DEFAULT 0,
  energy_generated_kwh DOUBLE PRECISION DEFAULT 0,
  energy_consumed_kwh DOUBLE PRECISION DEFAULT 0,
  voltage DOUBLE PRECISION,
  current DOUBLE PRECISION,
  temperature DOUBLE PRECISION,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.energy_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view energy data in own tenant"
  ON public.energy_data FOR SELECT TO authenticated
  USING (public.device_belongs_to_tenant(plant_id, auth.uid()));

CREATE POLICY "System can insert energy data"
  ON public.energy_data FOR INSERT TO authenticated
  WITH CHECK (public.device_belongs_to_tenant(plant_id, auth.uid()));

-- Time-series indexes for fast queries
CREATE INDEX idx_energy_data_plant_timestamp ON public.energy_data(plant_id, timestamp DESC);
CREATE INDEX idx_energy_data_device_timestamp ON public.energy_data(device_id, timestamp DESC);
CREATE INDEX idx_energy_data_timestamp ON public.energy_data(timestamp DESC);

-- 4. Alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('critical', 'warning', 'info')),
  message TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts in own tenant"
  ON public.alerts FOR SELECT TO authenticated
  USING (public.device_belongs_to_tenant(plant_id, auth.uid()));

CREATE POLICY "Users can resolve alerts in own tenant"
  ON public.alerts FOR UPDATE TO authenticated
  USING (public.device_belongs_to_tenant(plant_id, auth.uid()));

CREATE INDEX idx_alerts_plant_id ON public.alerts(plant_id);
CREATE INDEX idx_alerts_resolved ON public.alerts(resolved);
CREATE INDEX idx_alerts_created_at ON public.alerts(created_at DESC);
