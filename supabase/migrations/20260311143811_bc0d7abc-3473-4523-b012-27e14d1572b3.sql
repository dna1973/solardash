
-- Junction table for many-to-many: property_locations <-> plants
CREATE TABLE public.property_location_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.property_locations(id) ON DELETE CASCADE,
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(location_id, plant_id)
);

-- Enable RLS
ALTER TABLE public.property_location_plants ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view in own tenant (via property_locations.tenant_id)
CREATE POLICY "Users can view location plants"
ON public.property_location_plants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.property_locations pl
    WHERE pl.id = location_id
    AND pl.tenant_id = get_user_tenant_id(auth.uid())
  )
);

-- RLS: Gestors can manage location plants
CREATE POLICY "Gestors can manage location plants"
ON public.property_location_plants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.property_locations pl
    WHERE pl.id = location_id
    AND pl.tenant_id = get_user_tenant_id(auth.uid())
    AND (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.property_locations pl
    WHERE pl.id = location_id
    AND pl.tenant_id = get_user_tenant_id(auth.uid())
    AND (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
  )
);

-- Migrate existing data
INSERT INTO public.property_location_plants (location_id, plant_id)
SELECT id, plant_id FROM public.property_locations
WHERE plant_id IS NOT NULL
ON CONFLICT DO NOTHING;
