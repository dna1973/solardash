DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users in same tenant can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users in same tenant can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));