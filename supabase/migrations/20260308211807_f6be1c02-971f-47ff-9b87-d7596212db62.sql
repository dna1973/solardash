
-- Allow users to update alerts in their own tenant
CREATE POLICY "Users can update alerts in own tenant"
ON public.alerts
FOR UPDATE
TO authenticated
USING (device_belongs_to_tenant(plant_id, auth.uid()))
WITH CHECK (device_belongs_to_tenant(plant_id, auth.uid()));

-- Allow users to delete alerts in their own tenant
CREATE POLICY "Users can delete alerts in own tenant"
ON public.alerts
FOR DELETE
TO authenticated
USING (device_belongs_to_tenant(plant_id, auth.uid()));
