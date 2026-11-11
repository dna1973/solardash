# Dicionário de dados observado

Somente esquema consultado em 11/11/2026; não contém dados.

## alerts

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| plant_id | uuid | NO | — |
| device_id | uuid | YES | — |
| type | text | NO | — |
| message | text | NO | — |
| resolved | bool | NO | false |
| resolved_at | timestamptz | YES | — |
| created_at | timestamptz | NO | now() |

- alerts_type_check: `CHECK ((type = ANY (ARRAY['critical'::text, 'warning'::text, 'info'::text])))`

- alerts_pkey: `PRIMARY KEY (id)`

- alerts_plant_id_fkey: `FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE`

- alerts_device_id_fkey: `FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL`

## audit_logs

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | — |
| user_email | text | YES | — |
| user_name | text | YES | — |
| tenant_id | uuid | YES | — |
| event_type | text | NO | — |
| entity_type | text | YES | — |
| entity_id | text | YES | — |
| description | text | NO | — |
| metadata | jsonb | YES | '{}'::jsonb |
| ip_address | text | YES | — |
| created_at | timestamptz | NO | now() |

- audit_logs_pkey: `PRIMARY KEY (id)`

- audit_logs_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`

## devices

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| plant_id | uuid | NO | — |
| manufacturer | text | NO | — |
| model | text | NO | — |
| serial_number | text | NO | — |
| device_type | text | NO | — |
| api_endpoint | text | YES | — |
| auth_token | text | YES | — |
| collection_interval_minutes | int4 | NO | 5 |
| status | text | NO | 'offline'::text |
| last_communication | timestamptz | YES | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

- devices_device_type_check: `CHECK ((device_type = ANY (ARRAY['inverter'::text, 'meter'::text, 'datalogger'::text, 'gateway'::text, 'sensor'::text])))`

- devices_status_check: `CHECK ((status = ANY (ARRAY['online'::text, 'offline'::text, 'warning'::text])))`

- devices_pkey: `PRIMARY KEY (id)`

- devices_plant_id_fkey: `FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE`

## energy_bills

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | — |
| property_name | text | YES | — |
| address | text | YES | — |
| utility_company | text | YES | — |
| account_number | text | YES | — |
| reference_month | text | YES | — |
| consumption_kwh | float8 | YES | 0 |
| generation_kwh | float8 | YES | 0 |
| amount_brl | float8 | YES | 0 |
| peak_demand_kw | float8 | YES | — |
| off_peak_demand_kw | float8 | YES | — |
| tariff_type | text | YES | — |
| due_date | date | YES | — |
| pdf_path | text | YES | — |
| raw_ocr_data | jsonb | YES | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| qd | text | YES | — |
| invoice_number | text | YES | — |
| invoice_value | float8 | YES | 0 |
| gross_value | float8 | YES | 0 |
| lighting_cost | float8 | YES | 0 |
| deductions_value | float8 | YES | 0 |
| net_value | float8 | YES | 0 |
| client_code | text | YES | — |

- energy_bills_pkey: `PRIMARY KEY (id)`

- energy_bills_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`

- energy_bills_account_reference_unique: `UNIQUE (account_number, reference_month)`

## energy_data

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| plant_id | uuid | NO | — |
| device_id | uuid | YES | — |
| timestamp | timestamptz | NO | — |
| generation_power_kw | float8 | YES | 0 |
| consumption_power_kw | float8 | YES | 0 |
| energy_generated_kwh | float8 | YES | 0 |
| energy_consumed_kwh | float8 | YES | 0 |
| voltage | float8 | YES | — |
| current | float8 | YES | — |
| temperature | float8 | YES | — |
| status | text | YES | — |
| created_at | timestamptz | NO | now() |

- energy_data_pkey: `PRIMARY KEY (id)`

- energy_data_plant_id_fkey: `FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE`

- energy_data_device_id_fkey: `FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL`

## integrations

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | — |
| manufacturer | text | NO | — |
| credentials | jsonb | NO | '{}'::jsonb |
| is_active | bool | NO | true |
| last_sync_at | timestamptz | YES | — |
| last_error | text | YES | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

- integrations_pkey: `PRIMARY KEY (id)`

- integrations_tenant_id_manufacturer_key: `UNIQUE (tenant_id, manufacturer)`

- integrations_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`

## plants

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | — |
| name | text | NO | — |
| location | text | YES | — |
| latitude | float8 | YES | — |
| longitude | float8 | YES | — |
| capacity_kwp | float8 | NO | 0 |
| installation_date | date | YES | — |
| utility_company | text | YES | — |
| status | text | NO | 'offline'::text |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| integrator | text | YES | — |

- plants_status_check: `CHECK ((status = ANY (ARRAY['online'::text, 'offline'::text, 'warning'::text, 'maintenance'::text])))`

- plants_pkey: `PRIMARY KEY (id)`

- plants_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`

## profiles

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | — |
| tenant_id | uuid | NO | — |
| full_name | text | YES | — |
| avatar_url | text | YES | — |
| phone | text | YES | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

- profiles_pkey: `PRIMARY KEY (id)`

- profiles_user_id_key: `UNIQUE (user_id)`

- profiles_user_id_fkey: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

- profiles_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`

## property_location_plants

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| location_id | uuid | NO | — |
| plant_id | uuid | NO | — |
| created_at | timestamptz | NO | now() |

- property_location_plants_pkey: `PRIMARY KEY (id)`

- property_location_plants_location_id_plant_id_key: `UNIQUE (location_id, plant_id)`

- property_location_plants_location_id_fkey: `FOREIGN KEY (location_id) REFERENCES property_locations(id) ON DELETE CASCADE`

- property_location_plants_plant_id_fkey: `FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE`

## property_locations

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | — |
| account_number | text | NO | — |
| location_name | text | NO | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| plant_id | uuid | YES | — |
| water_account_number | text | YES | — |

- property_locations_pkey: `PRIMARY KEY (id)`

- property_locations_tenant_id_account_number_key: `UNIQUE (tenant_id, account_number)`

- property_locations_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`

- property_locations_plant_id_fkey: `FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE SET NULL`

## sync_logs

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| integration_id | uuid | NO | — |
| tenant_id | uuid | NO | — |
| manufacturer | text | NO | — |
| status | text | NO | 'pending'::text |
| plants_synced | int4 | YES | 0 |
| energy_points | int4 | YES | 0 |
| error_message | text | YES | — |
| details | jsonb | YES | '{}'::jsonb |
| started_at | timestamptz | NO | now() |
| finished_at | timestamptz | YES | — |
| created_at | timestamptz | NO | now() |

- sync_logs_pkey: `PRIMARY KEY (id)`

- sync_logs_integration_id_fkey: `FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE`

- sync_logs_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`

## tenants

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | — |
| slug | text | NO | — |
| logo_url | text | YES | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

- tenants_pkey: `PRIMARY KEY (id)`

- tenants_slug_key: `UNIQUE (slug)`

## user_roles

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | — |
| role | app_role | NO | 'operador'::app_role |

- user_roles_pkey: `PRIMARY KEY (id)`

- user_roles_user_id_role_key: `UNIQUE (user_id, role)`

- user_roles_user_id_fkey: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

## water_bills

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | — |
| client_code | text | YES | — |
| property_name | text | YES | — |
| address | text | YES | — |
| reference_month | text | YES | — |
| consumption_m3 | float8 | YES | 0 |
| water_value | float8 | YES | 0 |
| sewer_value | float8 | YES | 0 |
| total_value | float8 | YES | 0 |
| tariff_type | text | YES | — |
| due_date | date | YES | — |
| utility_company | text | YES | — |
| account_number | text | YES | — |
| invoice_number | text | YES | — |
| consumption_history | jsonb | YES | '[]'::jsonb |
| pdf_path | text | YES | — |
| raw_ocr_data | jsonb | YES | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| gross_value | numeric | YES | — |
| deductions_value | numeric | YES | — |

- water_bills_pkey: `PRIMARY KEY (id)`

- water_bills_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`

- water_bills_account_reference_unique: `UNIQUE (account_number, reference_month)`

## water_property_locations

RLS: ativo.

| Coluna | Tipo | Aceita nulo | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | — |
| account_number | text | NO | — |
| location_name | text | NO | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

- water_property_locations_pkey: `PRIMARY KEY (id)`

- water_property_locations_tenant_id_account_number_key: `UNIQUE (tenant_id, account_number)`

- water_property_locations_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
