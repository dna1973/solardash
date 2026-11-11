# Replicação, implantação e operação

## Caminho preferido: novo projeto Lovable Cloud

1. Criar/remixar um projeto separado e habilitar Lovable Cloud. Remix copia estrutura/funções, não dados; verificar o resultado antes de reaplicar migrações. Importação de código depende da disponibilidade do recurso na conta.
2. Importar `source/` e documentação, sem .env real. Não conectar a réplica ao ambiente original.
3. Se o banco já foi estruturado pelo remix, comparar inventário; não rodar bootstrap de novo. Em ambiente vazio, revisar/aplicar migrações históricas pelo fluxo de migração do Lovable, respeitando exceções e grants.
4. Definir autenticação, confirmação de e-mail, URLs permitidas e recuperação de senha. Configurar provedores sociais usados antes de expor botões. Configurações da origem não foram verificadas. Não habilitar cadastro anônimo.
5. Criar primeiro usuário e atribuir administrador com operação controlada no destino; não importar promoção por UUID da origem. Conferir perfil/tenant e role após o trigger.
6. Conferir buckets privados e regras de pasta; criar configuração de destino via ferramentas do Cloud, não mutação direta de schema gerenciado.
7. Aplicar correções de segurança do documento 05 antes de publicar endpoints. Deploy de funções deve ser explícito: copiar arquivos ou sincronizar Git não garante deploy no Cloud.
8. Provisionar IA no novo ambiente e credenciais de fabricantes em armazenamento seguro. Chaves da origem não são exportáveis nem devem ser reutilizadas.
9. Recriar cron somente após autenticação do agendador; no atual há apenas cron de alertas confirmado, com monitoramento suspenso.
10. Homologar roteiro 08 com dois tenants e três roles. Publicar frontend e configurar domínio novo após aprovação.

## Interface local / hospedagem própria

Instalar Node.js LTS e Bun compatível com lockfile (versões exatas de runtime da origem não registradas). Na pasta source:

```sh
bun install --frozen-lockfile
cp .env.example .env.local
# Preencher SOMENTE configuração pública do destino, sem segredos.
bun run dev
bun run test
bun run build
```

Alternativa npm: usar `npm ci` com package-lock.json, não misturar gerenciadores no mesmo ambiente. Os dois lockfiles são entregues; o scan citado usou bun.lock e eles podem diferir. Build produz dist/; servir como SPA com fallback para index.html. Vite local usa porta 8080. Hospedagem da interface não cria banco, auth, funções, storage, IA ou cron.

Arquivos técnicos mencionam SUPABASE_* porque esse é o SDK empregado. Para backend próprio fora do Lovable, contratar/provisionar ambiente compatível e adaptar gateways/segredos. `supabase/config.toml` exportado contém marcador DESTINATION_PROJECT_REF e precisa de configuração do novo serviço; não executar CLI com o marcador. Em projeto gerenciado Lovable, deixar a plataforma regenerar arquivos de integração.

## Variáveis por nome, sem valores

| Nome | Onde / finalidade |
|---|---|
| VITE_SUPABASE_URL | Frontend, URL pública do novo ambiente |
| VITE_SUPABASE_PUBLISHABLE_KEY | Frontend, chave pública do destino |
| VITE_SUPABASE_PROJECT_ID | Configuração auxiliar pública, se usada |
| SUPABASE_URL | Funções, gerenciada no destino |
| SUPABASE_ANON_KEY / SUPABASE_PUBLISHABLE_KEY | Funções, configuração pública conforme código |
| SUPABASE_SERVICE_ROLE_KEY | Funções, credencial gerenciada privilegiada; nunca frontend |
| LOVABLE_API_KEY | IA gerenciada; código MCP também a utiliza atualmente, risco de acoplamento |

No Lovable Cloud, credencial privilegiada e senha de banco não ficam disponíveis ao usuário. Não há instrução para buscá-las. Valores privados devem existir apenas no cofre/configuração de runtime do destino; `.env.example` tem campos vazios, e todos os `.env` reais ficam fora de commits e arquivos compartilhados.

## Cópia com dados e PDFs (não incluída)

Exportação integral oficial: **More → Database → Manage → Settings → Export data → Database → Export → Start export**. Download pelo link enviado por e-mail ou salvo em Storage. Contém esquema, dados e contas com hashes de senha; tratar como material altamente sensível. Limites documentados: banco até 15GB, exportação até 5GB, uma a cada 24h; backend deve estar ativo. Não há UI self-service de importação do banco no Lovable: restauração isolada em serviço compatível precisa de processo apropriado ao destino.

Arquivos não vêm nesse export nem nos backups diários: baixar separadamente em **More → Storage**. Também não inclui código das funções, segredos nem configurações de provedores/login. Não transportar segredos das integrações dentro de dados sem plano de proteção/rotação. Não reconstruir auth.users por scripts.

## Operação e recuperação

Monitorar erros de função, limites de IA/fabricante, sync_logs e inconsistências de faturas. Backup diário documentado conserva aproximadamente 14 dias, apenas banco; inventário de backups não foi consultado. Restore diário é no mesmo projeto, não PITR, e perde alterações posteriores. Antes de restaurar exportar estado atual e arquivos; após restore verificar compatibilidade com código. Código pode ser versionado sem .env, arquivos de usuários precisam de proteção separada. Definir responsáveis, retenção e periodicidade conforme política da organização, sem inventar SLA.
