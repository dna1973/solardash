
-- Create storage bucket for energy bill PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('energy-bills', 'energy-bills', false);

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload bills" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'energy-bills');

-- RLS: authenticated users can read their own bills
CREATE POLICY "Users can read own bills" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'energy-bills');

-- Create table for imported bill data
CREATE TABLE public.energy_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  property_name TEXT,
  address TEXT,
  utility_company TEXT,
  account_number TEXT,
  reference_month TEXT,
  consumption_kwh DOUBLE PRECISION DEFAULT 0,
  generation_kwh DOUBLE PRECISION DEFAULT 0,
  amount_brl DOUBLE PRECISION DEFAULT 0,
  peak_demand_kw DOUBLE PRECISION,
  off_peak_demand_kw DOUBLE PRECISION,
  tariff_type TEXT,
  due_date DATE,
  pdf_path TEXT,
  raw_ocr_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.energy_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bills in own tenant" ON public.energy_bills
FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert bills in own tenant" ON public.energy_bills
FOR INSERT TO authenticated
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update bills in own tenant" ON public.energy_bills
FOR UPDATE TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete bills in own tenant" ON public.energy_bills
FOR DELETE TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_energy_bills_updated_at
  BEFORE UPDATE ON public.energy_bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
