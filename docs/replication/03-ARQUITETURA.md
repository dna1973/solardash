# Arquitetura e mapa do código

## Camadas

```text
Navegador React/Vite
  ├─ AuthContext / rotas protegidas / tema
  ├─ páginas e componentes / React Query / gráficos / mapas
  ├─ cliente → Auth + API de dados (RLS) + storage privado
  └─ chamadas de funções → OCR/IA, gestão de usuários, coleta, MCP
                               ├─ PostgreSQL
                               ├─ gateway IA Lovable
                               └─ APIs de fabricantes
```

Sem servidor Node/Python persistente no projeto. Backend é Lovable Cloud: PostgreSQL, autenticação, funções serverless e storage. Nomes técnicos `supabase/` e variáveis `SUPABASE_*` são contratos usados pelo SDK e arquivos; não são acesso a um painel externo do projeto de origem.

## Estrutura

| Caminho | Responsabilidade |
|---|---|
| src/App.tsx | Rotas, proteção da sessão e providers |
| src/contexts/AuthContext.tsx | Sessão, login/saída e eventos de auditoria |
| src/hooks/useUserRole.ts | Leitura de role e flags admin/gestor |
| src/hooks/useSupabaseData.ts | Dados, inclusive paginação de geração |
| src/components/ui | Design system shadcn/Radix |
| src/pages/ConsumptionPage.tsx | Faturas, períodos, edição e exportação |
| src/components/BillImportDialog.tsx / WaterBillImportDialog.tsx | Revisão e importação de contas |
| src/components/GenerationImportDialog.tsx | Importação de geração PDF/Excel e matchPlant |
| src/components/SemesterReport.tsx | Comissão, checklist, cálculos e relatório |
| src/components/IntegrationManager.tsx | Configuração e coleta por fabricante |
| src/integrations/supabase | Cliente, tipos e armazenamento de sessão |
| supabase/functions/_shared | Contratos normalizados e adaptadores |
| supabase/migrations | Histórico SQL |
| src/index.css / tailwind.config.ts | Tokens visuais e tema |

## Rotas verificadas no código

Públicas: `/`, `/login`, `/forgot-password`, `/reset-password`. Protegidas: `/dashboard`, `/dashboard/plants`, `/dashboard/plants/:id`, `/dashboard/consumption`, `/dashboard/reports`, `/dashboard/management`, `/dashboard/map`. `/dashboard/alerts` e `/dashboard/mcp` redirecionam para abas consolidadas. Arquivo Devices existe, mas não há rota ativa correspondente em App.tsx.

## Decisões para preservar

Tenant vem do perfil verificado, não de seleção livre enviada pelo navegador. RLS é fronteira dos clientes normais; funções que usam credencial privilegiada precisam de validação explícita. React Query fornece cache, mas não autorização. Componentes exportam relatórios localmente no navegador. Leaflet depende de tiles externos: homologar rede, termos e CORS. PreviewAuthStorage usa localStorage fora do editor, sem necessidade de sessão de preview na réplica.

## Credenciais e portabilidade

Frontend depende somente de configuração pública VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. VITE_SUPABASE_PROJECT_ID pode ser usado por integrações auxiliares. Backend recebe credenciais gerenciadas em runtime. Gateways IA e modelos não são portáveis apenas copiando chave da origem: no novo Lovable Cloud são provisionados no destino; fora dele, adaptar provedor e autenticação de IA. Tipos TS devem ser regenerados quando o esquema mudar, não editados manualmente no projeto gerenciado.
