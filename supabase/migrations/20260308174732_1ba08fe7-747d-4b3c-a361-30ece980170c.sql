
-- Create trigger for new users (was missing)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: create profile for existing user who has no profile
INSERT INTO public.tenants (name, slug)
SELECT 'Empresa Padrão', 'default'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug = 'default');

INSERT INTO public.profiles (user_id, tenant_id, full_name, avatar_url)
SELECT 
  u.id,
  t.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
  COALESCE(u.raw_user_meta_data->>'avatar_url', '')
FROM auth.users u
CROSS JOIN (SELECT id FROM public.tenants WHERE slug = 'default' LIMIT 1) t
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = u.id);

-- Also backfill roles
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'operador'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u.id);
