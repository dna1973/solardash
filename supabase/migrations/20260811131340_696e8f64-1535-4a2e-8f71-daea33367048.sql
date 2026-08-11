-- Storage: tenant-scoped access for energy-bills and water-bills
DROP POLICY IF EXISTS "Users can read own bills" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload bills" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own water bills" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload water bills" ON storage.objects;

CREATE POLICY "Tenant members can read own energy bills"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'energy-bills'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Tenant members can upload energy bills"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'energy-bills'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Tenant members can read own water bills"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'water-bills'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Tenant members can upload water bills"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'water-bills'
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

-- Profiles: restrict tenant-wide visibility to admins/gestores
DROP POLICY IF EXISTS "Users in same tenant can view profiles" ON public.profiles;

CREATE POLICY "Managers can view tenant profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
);

-- SECURITY DEFINER functions: remove public/unnecessary EXECUTE grants
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_tenant_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.device_belongs_to_tenant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.device_belongs_to_tenant(uuid, uuid) TO authenticated, service_role;