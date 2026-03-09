
ALTER TABLE public.energy_bills
  ADD COLUMN IF NOT EXISTS qd text,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_value double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_value double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lighting_cost double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deductions_value double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_value double precision DEFAULT 0;
