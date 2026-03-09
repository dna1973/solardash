SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'solar-collector-sync'),
  command := $$
  SELECT net.http_post(
    url := 'https://oonatblrieucuchhqzgq.supabase.co/functions/v1/solar-collector',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbmF0YmxyaWV1Y3VjaGhxemdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODY4NjIsImV4cCI6MjA4ODU2Mjg2Mn0.gQJwp6FS7ABKTGfwSUlRkJ_6-zqI36ugb-Tslz3BfXQ"}'::jsonb,
    body := '{"action": "sync_all"}'::jsonb
  ) AS request_id;
  $$,
  schedule := '*/5 10-21 * * *'
);