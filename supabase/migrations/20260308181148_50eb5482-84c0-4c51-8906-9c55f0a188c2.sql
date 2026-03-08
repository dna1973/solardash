
-- Upgrade user to admin so they can manage integrations
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = '130e1f35-5f75-4ea6-87a7-caa75e91919b';
