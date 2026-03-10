
-- Tabela de contas de água
CREATE TABLE public.water_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  client_code TEXT,
  property_name TEXT,
  address TEXT,
  reference_month TEXT,
  consumption_m3 DOUBLE PRECISION DEFAULT 0,
  water_value DOUBLE PRECISION DEFAULT 0,
  sewer_value DOUBLE PRECISION DEFAULT 0,
  total_value DOUBLE PRECISION DEFAULT 0,
  tariff_type TEXT,
  due_date DATE,
  utility_company TEXT,
  account_number TEXT,
  invoice_number TEXT,
  consumption_history JSONB DEFAULT '[]'::jsonb,
  pdf_path TEXT,
  raw_ocr_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.water_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view water bills in own tenant" ON public.water_bills
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert water bills in own tenant" ON public.water_bills
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update water bills in own tenant" ON public.water_bills
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete water bills in own tenant" ON public.water_bills
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Tabela de nomenclaturas de água (separada da energia)
CREATE TABLE public.water_property_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  account_number TEXT NOT NULL,
  location_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, account_number)
);

ALTER TABLE public.water_property_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can manage water property locations" ON public.water_property_locations
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin')))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Users can view water property locations in own tenant" ON public.water_property_locations
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Storage bucket para contas de água
INSERT INTO storage.buckets (id, name, public) VALUES ('water-bills', 'water-bills', false);

-- RLS para o bucket
CREATE POLICY "Authenticated users can upload water bills" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'water-bills');

CREATE POLICY "Users can view own water bills" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'water-bills');
