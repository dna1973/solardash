-- Remove duplicates keeping the latest entry
DELETE FROM public.energy_data a
USING public.energy_data b
WHERE a.plant_id = b.plant_id
  AND a.timestamp = b.timestamp
  AND a.created_at < b.created_at;

-- Now create the unique index
CREATE UNIQUE INDEX energy_data_plant_timestamp_uniq ON public.energy_data (plant_id, "timestamp");