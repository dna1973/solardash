-- Allow service role to insert alerts (for the edge function)
CREATE POLICY "Service can insert alerts"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (
  device_belongs_to_tenant(plant_id, auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Drop old restrictive update policy and replace with broader one
DROP POLICY IF EXISTS "Users can resolve alerts in own tenant" ON public.alerts;