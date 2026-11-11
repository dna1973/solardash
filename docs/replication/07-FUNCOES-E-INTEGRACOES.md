# Funções e integrações

Contratos completos estão nos index.ts; este inventário não substitui os schemas de entrada. Endpoint no destino segue `/functions/v1/<nome>`; obter origem do novo ambiente, nunca reutilizar URL original.

| Função | Entrada/resultado principal | Identidade observada no código |
|---|---|---|
| ocr-energy-bill | Arquivo multipart; OCR de energia, dados/fatura e detecção de duplicidade | getUser e tenant do perfil |
| ocr-water-bill | Arquivo multipart; extração Compesa, conta e histórico | getUser e tenant do perfil |
| ocr-generation-report | Arquivo multipart; ano e valores mensais por ECU | Sem getUser/getClaims explícito |
| generate-semester-report | JSON; dados analíticos ou mode=extract_commission com fileBase64/fileType | Sem getUser/getClaims explícito |
| manage-users | JSON action: list_users, invite_user, update_role, update_user, delete_user | getUser + role admin; alvo precisa de validação adicional |
| solar-collector | JSON manufacturer/credentials/action/IDs; sync_all para agenda | Ações comuns validam usuário; sync_all precede validação |
| check-generation-alerts | Verificação de geração; resposta suspended=true no estado atual | Sem identidade explícita; suspenso |
| detect-anomalies | Análise por IA com dados do tenant | getUser e filtro de tenant |
| solar-mcp | HTTP Streamable MCP | Guarda pela chave gerenciada se existente; sem escopo robusto de tenant |

## MCP

Hono + mcp-lite, transporte criado por requisição. Ferramentas: list_plants(status), get_energy_data(plant_id,start_date,end_date,limit), get_plant_summary, get_alerts, import_energy_bill(file_base64,file_name,file_type,tenant_id opcional), import_water_bill(entradas equivalentes). Cabeçalhos aceitos no código: x-api-key ou Authorization Bearer. A chave é global, não associada ao usuário/tenant no código atual; não expor multi-tenant antes de corrigir. Base64 deve ser protegido por TLS, sem logs de conteúdo. Limite get_energy_data até 1000 registros.

## Fabricantes

Adaptadores em `_shared/adapters`: Growatt (login/session), Hoymiles (autenticação/token conforme adaptador), APSystems (HMAC e coleta otimizada), Fronius (API acessível pela rede), SolarEdge (API key). Credenciais fornecidas pelos fabricantes no destino. Uma função na nuvem pode não alcançar um IP privado Fronius sem rede/intermediação adequada. Testar endpoints, cotas, timeouts e resposta vazia antes de ativar agenda.

## IA

Funções chamam gateway Lovable chat completions. Modelo predominante no código: google/gemini-2.5-flash; detect-anomalies usa google/gemini-3-flash-preview. São referências da implementação, não garantia de disponibilidade futura. Revisar modelos no novo ambiente, proteger chamadas e respeitar cotas/custos. Erros 401/429/500 precisam de mensagens e retentativas compatíveis; não expor respostas com dados sensíveis.

## Storage

PDF original usa caminho tenant/timestamp_nome-sanitizado nos buckets privados. Manter metadata e referência pdf_path coerentes se migrar arquivos. Não basta copiar os registros de faturas para disponibilizar os PDFs.
