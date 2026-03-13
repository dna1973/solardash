ALTER TABLE public.water_bills ADD COLUMN IF NOT EXISTS gross_value numeric DEFAULT NULL;
ALTER TABLE public.water_bills ADD COLUMN IF NOT EXISTS deductions_value numeric DEFAULT NULL;