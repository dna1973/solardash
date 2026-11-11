# UtiliHub — pacote de replicação

Data de referência: 11/11/2026. Este pacote documenta o código disponível e consultas somente leitura ao ambiente atual. Não é um backup completo nem uma certificação de segurança.

## Conteúdo

- `source/`: código React/TypeScript, assets, dependências fixadas nos lockfiles, funções e 28 migrações históricas sanitizadas.
- `documentation/01-PRD.md`: requisitos do produto e critérios de aceitação.
- `documentation/02-REGRAS-DE-NEGOCIO.md`: regras consolidadas, inclusive competência/vencimento, com divergências explícitas.
- `documentation/03-ARQUITETURA.md`: estrutura, fluxos e decisões de implementação.
- `documentation/04-BANCO-E-MIGRACOES.md`: esquema, relações, RLS, ordem e cautelas de migração.
- `documentation/05-SEGURANCA.md`: controles existentes, riscos e pendências.
- `documentation/06-REPLICACAO-E-OPERACAO.md`: implantação, configuração, exportação separada e recuperação.
- `documentation/07-FUNCOES-E-INTEGRACOES.md`: contratos de funções e dependências.
- `documentation/08-VALIDACAO.md`: roteiro de homologação do novo ambiente.
- `database/schema-inventory.json`: metadados consultados, sem registros de negócio.
- `database/bootstrap-review.sql`: sequência concatenada para revisão em banco vazio compatível; não executada.
- `database/validate-readonly.sql`: consultas de verificação sem alterações.
- `database/migration-manifest.json`: arquivo local, versão aplicada correspondente por ordem e hash da cópia sanitizada.
- `MANIFEST-SHA256.txt`: integridade de todos os arquivos do pacote.

## Comece aqui

Leia segurança e replicação antes de instalar. Crie um ambiente isolado, configure autenticação e storage, revise as migrações, publique as funções e somente então a interface. Nunca use a configuração do ambiente de origem na réplica.

## Limites importantes

Não contém `.env` real, credenciais, usuários, senhas, registros de produção, PDFs enviados, sessões, Git nem dependências instaladas. O único arquivo de ambiente é `.env.example`, vazio e público. O código foi sanitizado para remover uma credencial histórica e o identificador do ambiente de origem. A migração de cron e a promoção de usuário específicas da origem estão comentadas na cópia exportada; as demais preservam o histórico. Nenhuma alteração foi aplicada ao banco ou ao aplicativo por este trabalho.

Há riscos conhecidos documentados. Migrações, login, OCR e sincronização não foram executados em uma segunda instalação; o pacote é base de reprodução e homologação, não promessa de instalação automática.
