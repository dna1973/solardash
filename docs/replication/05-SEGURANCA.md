# Segurança — controles, riscos e pendências

Data: 11/11/2026. Este documento descreve evidências; não certifica aplicação segura. Nenhum risco foi corrigido, ignorado ou marcado como resolvido nesta entrega.

## Controles confirmados

- 15 tabelas públicas com RLS ativo e políticas. Tabelas dependentes usam relações para isolamento.
- Buckets energy-bills e water-bills privados; políticas recentes verificam tenant no primeiro segmento do caminho.
- Perfil próprio legível; visibilidade ampla de perfis do tenant restrita a Admin/Gestor pela última migração.
- EXECUTE anônimo removido dos helpers SECURITY DEFINER; handle_new_user não é executável por clientes comuns. Helpers ainda podem ser necessários a usuários autenticados para avaliar RLS.
- manage-users verifica usuário e role admin; OCR energia/água e detect-anomalies validam usuário.
- Rotas internas verificam sessão; isso não protege endpoint de função por si só.
- Valores do `.env`, tokens e credenciais não estão no pacote. Nunca commitá-los.

## Pendências a resolver antes de produção

| Prioridade | Evidência / impacto | Tratamento exigido na réplica |
|---|---|---|
| Alta | generate-semester-report e ocr-generation-report não chamam getUser/getClaims | Validar usuário e permissões antes de consumir IA; testar ausente/expirado/forjado |
| Alta | solar-collector processa sync_all antes da validação de usuário | Autenticar agendador com segredo dedicado e limitar escopo; não confiar em action |
| Alta | check-generation-alerts não valida identidade; atualmente retorna suspended | Manter suspenso; autenticar antes de qualquer futura ativação |
| Alta | MCP usa cliente privilegiado, consultas sem tenant e guard opcional se chave ausente | Falhar fechado sem chave; chave própria, tenant fixado pelo servidor, filtros em todas ferramentas |
| Alta | manage-users update_role/update_user/delete_user não conferem tenant do alvo | Conferir caller e alvo no mesmo tenant e validar role; testar ID de outro tenant |
| Alta | integrations.credentials é JSONB lido e escrito diretamente na interface | Não há criptografia aplicacional comprovada; mover acesso a credenciais para serviço seguro e restringir leitura |
| Alta | Convite cria usuário confirmado e insere perfil apesar de trigger já criar | Homologar criação, unicidade e tenant; evitar associação automática indevida a default |
| Média | Signup associa novos usuários ao tenant default | Definir convite/onboarding por tenant sem confiar em user_metadata |
| Média | UNIQUE fatura é conta+competência global e sem validação robusta de mês | Avaliar chave tenant-aware e validação no destino como mudança explicitamente aprovada |
| Média | Auditoria depende de chamadas frontend | Definir cobertura, integridade e retenção; não chamar logs de trilha inviolável |
| Média | config.toml não declara verify_jwt por função | Proteção efetivamente publicada não foi consultada; configurar e testar no destino |

CORS '*' não é autenticação. RLS não limita cliente com privilégios elevados. Credenciais gerenciadas privilegiadas e senha do banco não são acessíveis no Lovable Cloud: não tentar copiá-las nem pedir esses valores ao usuário.

## Dependências — verificação nova

Scan de dependências em 11/11/2026 encontrou 23 entradas (5 altas, 18 moderadas) no bun.lock: @supabase/supabase-js→ws; jspdf→dompurify/fflate; react-router-dom→router; recharts→lodash; zod. Dependências permanecem iguais porque a solicitação é de documentação/replicação. Não considerar o pacote pronto para produção sem atualizações compatíveis e testes.

Orientações do scanner: ws 8.21.0 para alta e 8.20.1 para moderada; DOMPurify superior a 3.4.16 para alta (há vários avisos anteriores); fflate 0.8.3; lodash superior a 4.17.23; router superior a 1.23.1 e versões posteriores para outros avisos; zod 4.6.6. Atualizar dependências diretas e regenerar lockfile; conferir advisories novamente, pois números do scanner não garantem disponibilidade ou compatibilidade. React Router e Zod podem exigir migração de API. Auditar também imports Deno/npm das funções, que o scan frontend não cobre.

Resultados persistidos consultados não apresentavam findings, porém supply_chain estava desatualizado (agosto/2026). Ausência de findings persistidos não invalida vulnerabilidades retornadas pelo novo scan nem riscos do código. Não foi executado scan profundo novo. Auth/OAuth, proteção publicada de funções, limites de upload e restore integral permanecem não verificados.

## Checklist mínimo

Rejeitar visitante, token inválido e tenant alheio em todas funções; testar storage cruzado; confirmar privilégios efetivos por role; remover credenciais de logs; autenticar cron; aplicar limites de arquivo/IA; atualizar dependências; manter alertas suspensos; testar recuperação e backups. Segurança precede exposição pública.
