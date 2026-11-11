# Banco, migrações e configuração

## Evidência atual

Consulta somente leitura em 11/11/2026: 15 tabelas públicas com RLS ativo e políticas; dois buckets privados. `database/schema-inventory.json` contém colunas, tipos, defaults, constraints, políticas, buckets e versões registradas, sem dados pessoais. Campo grants=null significa que a consulta de information_schema não devolveu grants visíveis, não ausência comprovada de privilégios.

## Modelo

| Tabela | Uso / isolamento |
|---|---|
| tenants | Organização; usuário lê seu tenant |
| profiles | Perfil, user_id único, tenant_id |
| user_roles | Enum admin/gestor/operador; par user/role único |
| plants | Usina, capacidade kWp, tenant |
| devices | Dispositivo por plant; herda isolamento |
| energy_data | Telemetria por plant/device e timestamp |
| alerts | Alertas por plant/device; resolução |
| energy_bills | Energia, competência, vencimento, valores, OCR e PDF |
| water_bills | Água/esgoto, competência, vencimento, histórico |
| property_locations | Nome/conta energia e vínculo com água |
| water_property_locations | Mapeamento próprio de água |
| property_location_plants | Relação local/usina |
| integrations | Fabricante, credenciais JSONB, ativo e sync |
| sync_logs | Resultado de coleta por integração/tenant |
| audit_logs | Eventos de usuários/aplicação |

Funções: get_user_tenant_id, has_role, device_belongs_to_tenant (helpers SECURITY DEFINER); handle_new_user (trigger); update_updated_at_column. Trigger de Auth cria perfil e role padrão; demais atualizam timestamps. Helpers restringem execução anônima na última migração.

## Histórico e ordem

28 arquivos locais; 28 versões aplicadas. Nas 27 migrações mais antigas os timestamps locais e aplicados diferem em alguns segundos: não registrar o nome local como se fosse a versão já aplicada. Manifesto associa por ordem histórica como referência, não prova equivalência integral do SQL aplicado. Última versão coincide. Não aplicar esse bootstrap sobre produção ou sobre um banco restaurado, nem alterar a tabela de histórico para forçar correspondência.

`bootstrap-review.sql` concatena o SQL sanitizado em ordem. Requer backend compatível com schemas de auth/storage já provisionados, roles, UUID, extensões e privilégios administrativos. Não é PostgreSQL puro e não cria serviços de login/storage. Não foi executado nem validado por restauração nesta entrega.

## Exceções deliberadas na cópia

- Migração 20260308181148: promovia um usuário específico da origem; conteúdo substituído por comentário. Provisionar primeiro administrador no destino de forma controlada após cadastro.
- Migração 20260309123713: continha URL e token de cron da origem; substituída por comentário. Não transportar nem executar esse cron. Recriar agenda com autenticação própria do destino somente após corrigir/validar o caminho sync_all.
- Há limpezas DELETE de energia zero/duplicada no histórico e backfills de perfis/vínculos. Aceitáveis apenas após revisão em ambiente vazio; nunca rodar automaticamente em banco com dados.
- Extensões pg_cron/pg_net e GRANT no schema cron podem não estar disponíveis no destino. Revisar capacidades do novo serviço.
- Histórico cria políticas intermediárias amplas; aplicar a migração final de segurança antes de expor o banco. Confirmar GRANT e RLS por role no destino.

## Sem clonagem de dados

Este SQL reproduz estrutura histórica, não registros reais nem usuários/senhas. Para uma cópia com dados use exportação oficial do Lovable Cloud conforme guia de operação; arquivos de storage são separados. Não executar bootstrap sobre exportação restaurada. Não transportar UUID de usuário em seed administrativo nem credenciais JSONB.
