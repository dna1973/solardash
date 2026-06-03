# UtiliHub — Regras de Negócio

> **Versão:** 1.0 — Junho/2026
> **Escopo:** Documento consolidado das regras de negócio aplicadas no sistema UtiliHub (gestão de geração solar, consumo de energia e consumo de água).

---

## Sumário

1. [Multi-Tenant e Isolamento de Dados](#1-multi-tenant-e-isolamento-de-dados)
2. [Controle de Acesso (RBAC)](#2-controle-de-acesso-rbac)
3. [Autenticação](#3-autenticação)
4. [Usinas Solares (Plants)](#4-usinas-solares-plants)
5. [Localidades (Property Locations)](#5-localidades-property-locations)
6. [Faturas de Energia](#6-faturas-de-energia)
7. [Faturas de Água](#7-faturas-de-água)
8. [Geração e Coleta Automática](#8-geração-e-coleta-automática)
9. [Alertas](#9-alertas)
10. [Relatório Semestral (CGE-PE)](#10-relatório-semestral-cge-pe)
11. [Análise Energética](#11-análise-energética)
12. [Importação de Geração (PDF)](#12-importação-de-geração-pdf)
13. [Integrações com Fabricantes](#13-integrações-com-fabricantes)
14. [API MCP (Integração Externa)](#14-api-mcp-integração-externa)
15. [Auditoria](#15-auditoria)
16. [Armazenamento de Arquivos](#16-armazenamento-de-arquivos)
17. [Formatação e Localização](#17-formatação-e-localização)

---

## 1. Multi-Tenant e Isolamento de Dados

- **RN-MT-01:** Todo dado da aplicação pertence a um `tenant_id`. Usuários só visualizam dados do seu próprio tenant.
- **RN-MT-02:** O isolamento é garantido por políticas RLS (Row-Level Security) em todas as tabelas do schema `public`.
- **RN-MT-03:** A função `get_user_tenant_id(auth.uid())` é a única fonte de verdade para o tenant do usuário autenticado.
- **RN-MT-04:** Não é permitido cruzamento de dados entre tenants, mesmo para usuários Admin (exceto em manutenção via service_role).

---

## 2. Controle de Acesso (RBAC)

Perfis disponíveis (enum `app_role`): `admin`, `gestor`, `operador`.

| Perfil | Permissões |
|--------|------------|
| **Admin** | Acesso total, incluindo criação/exclusão de usuários e exclusão de usinas |
| **Gestor** | Acesso total ao tenant, **exceto** exclusão de usuários e exclusão de usinas |
| **Operador** | Apenas importar/visualizar faturas e consultar dados. Sem acesso a configurações, integrações ou gestão de usuários |

- **RN-RBAC-01:** Roles ficam armazenadas em tabela separada (`user_roles`), nunca em `profiles`.
- **RN-RBAC-02:** A função `has_role(user_id, role)` é SECURITY DEFINER para evitar recursão em políticas RLS.
- **RN-RBAC-03:** Exclusão de usinas (`plants DELETE`) só pode ser feita por Admin.
- **RN-RBAC-04:** Gestão de integrações, localidades, dispositivos e usinas (insert/update) é restrita a Gestor ou Admin.
- **RN-RBAC-05:** Logs de auditoria só são visíveis para Admin e Gestor.

---

## 3. Autenticação

- **RN-AUTH-01:** Autenticação via e-mail/senha **com confirmação de e-mail obrigatória** antes do primeiro login.
- **RN-AUTH-02:** Login com Google (OAuth) habilitado.
- **RN-AUTH-03:** Não é permitido sign-up anônimo.
- **RN-AUTH-04:** A rota `/` redireciona usuários autenticados automaticamente para `/dashboard`.
- **RN-AUTH-05:** Todas as rotas sob `/dashboard/*` exigem sessão válida.
- **RN-AUTH-06:** Recuperação de senha via link enviado por e-mail (`/forgot-password` → `/reset-password`).

---

## 4. Usinas Solares (Plants)

- **RN-PLANT-01:** Toda usina tem capacidade em **kWp** que serve de baseline para cálculo de geração esperada.
- **RN-PLANT-02:** Status possíveis: `online`, `offline`, `warning` (alerta), `maintenance`.
- **RN-PLANT-03:** Campos manuais do integrador (nome, localização, integrador, data de instalação) não são sobrescritos pela sincronização automática com o fabricante.
- **RN-PLANT-04:** Campos sincronizados do fabricante (status, geração, consumo, potência) são atualizados a cada coleta.
- **RN-PLANT-05:** Uma usina pode estar vinculada a **uma única localidade por vez** (exclusividade), evitando duplicação de créditos.
- **RN-PLANT-06:** O vínculo usina ↔ localidade é representado pela tabela N:N `property_location_plants`.

---

## 5. Localidades (Property Locations)

- **RN-LOC-01:** Cada localidade representa uma unidade consumidora (UC) e é identificada pelo `account_number` (código do cliente da concessionária de energia) e/ou `water_account_number` (matrícula Compesa).
- **RN-LOC-02:** O mapeamento `account_number → location_name` é utilizado para enriquecer faturas importadas via OCR (campo "Local" na tabela de faturas).
- **RN-LOC-03:** Localidades de água ficam em tabela separada (`water_property_locations`) com seu próprio `account_number`.
- **RN-LOC-04:** Uma localidade pode ter múltiplas usinas vinculadas (rateio de créditos).

---

## 6. Faturas de Energia

### Extração via OCR

- **RN-EBILL-01:** Campos extraídos automaticamente: concessionária, nº da conta, código do cliente, mês de referência, consumo (kWh), geração injetada (kWh), valor bruto, valor líquido, deduções, iluminação pública, vencimento, tipo de tarifa, QD, nº da nota fiscal.
- **RN-EBILL-02:** **Regra de cálculo obrigatória:** `gross_value = net_value + deductions_value`.
- **RN-EBILL-03:** O `gross_value` deve somar **TODOS** os itens positivos da coluna VALOR da fatura, incluindo explicitamente **ICMS-CDE**, Consumo-TUSD, Consumo-TE, Demanda, etc.
- **RN-EBILL-04:** Iluminação pública é registrada em campo separado (`lighting_cost`) e **não compõe** o `gross_value`.
- **RN-EBILL-05:** Deduções negativas (créditos, descontos) são registradas em `deductions_value` (valor positivo) e subtraídas para chegar ao `net_value`.

### Persistência

- **RN-EBILL-06:** Detecção de duplicatas via constraint UNIQUE em (`account_number`, `reference_month`).
- **RN-EBILL-07:** Todas as faturas podem ser editadas manualmente após a importação, sobrescrevendo o OCR.
- **RN-EBILL-08:** Concessionária principal suportada: **Neoenergia**.
- **RN-EBILL-09:** PDF original da fatura é armazenado no Storage com nome sanitizado (espaços e caracteres especiais → underscores).

### Visualização

- **RN-EBILL-10:** Filtros padrão: ano atual e **mês anterior** ao atual.
- **RN-EBILL-11:** Ordenação A-Z por padrão; clique em coluna alterna a direção.
- **RN-EBILL-12:** Tabela exibe linha de totalização no rodapé (soma de consumo, bruto, iluminação, deduções, líquido).
- **RN-EBILL-13:** Data "Importado em" segue formato pt-BR (dd/MM/yyyy).

---

## 7. Faturas de Água

- **RN-WBILL-01:** Concessionária principal suportada: **Compesa (PE)**.
- **RN-WBILL-02:** Campos extraídos: matrícula, consumo (m³), valor água, valor esgoto, valor bruto, deduções, total, histórico de consumo.
- **RN-WBILL-03:** Edição manual sobrescreve dados do OCR.
- **RN-WBILL-04:** Mapeamento de local é feito via `water_account_number` (matrícula).
- **RN-WBILL-05:** Totalização no rodapé da tabela (consumo m³, valor água, valor esgoto, valor bruto, deduções, total).

---

## 8. Geração e Coleta Automática

- **RN-GEN-01:** Coleta automática via `pg_cron` a cada **1 hora**, das **07:00 às 18:00 (BRT)**.
- **RN-GEN-02:** Payload do cron: `sync_all` (sincroniza todas as integrações ativas do tenant).
- **RN-GEN-03:** Dados coletados: geração (kWh), consumo (kWh), potência instantânea (kW), tensão, corrente, temperatura.
- **RN-GEN-04:** **Regra de geração zero:** Se a integração retorna 0 kWh **fora do horário solar** (antes das 6h ou após 20h), o registro é **ignorado**. Dentro do horário solar, 0 kWh é registrado normalmente (pode indicar falha real).
- **RN-GEN-05:** Para superar o limite de 1000 registros do Supabase, todas as queries de dados energéticos usam paginação recursiva via `.range()` (hook `useEnergyData`).
- **RN-GEN-06:** Escala temporal dos gráficos é automática: horas (dia), dias (semana/mês), meses (ano).

---

## 9. Alertas

- **RN-ALERT-01:** **Monitoramento automático de alertas está globalmente SUSPENSO** (`ALERT_MONITORING_ENABLED = false`) até estabilização das APIs dos fabricantes.
- **RN-ALERT-02:** Verificação manual disponível via botão "Verificar Agora".
- **RN-ALERT-03:** Classificação: `crítico` (vermelho), `alerta/warning` (amarelo), `info` (azul).
- **RN-ALERT-04:** Alertas resolvidos permanecem na lista com opacidade reduzida; nunca são apagados automaticamente.
- **RN-ALERT-05:** Exclusão definitiva exige confirmação explícita do usuário.
- **RN-ALERT-06:** Suporte a seleção múltipla para resolver/apagar em lote.

---

## 10. Relatório Semestral (CGE-PE)

- **RN-REPORT-01:** Em conformidade com a **Portaria nº 11/2026** do Governo de Pernambuco (Comissão de Gestão Energética - CGE-PE).
- **RN-REPORT-02:** Filtros obrigatórios: ano, semestre (1º ou 2º), tarifa (R$/kWh).
- **RN-REPORT-03:** **Geração esperada por mês:** `capacidade_kWp × horas_de_sol_do_mês` (baseline para detecção de subgeração).
- **RN-REPORT-04:** **Economia:** `(geração_kWh) × tarifa_R$/kWh`.
- **RN-REPORT-05:** Análise executiva e recomendações são geradas por IA (Lovable AI Gateway).
- **RN-REPORT-06:** Checklist semestral persistido em `localStorage` (calibração, limpeza, inspeção, etc.).
- **RN-REPORT-07:** Membros da Comissão podem ser cadastrados manualmente ou extraídos via OCR de PDF/imagem.
- **RN-REPORT-08:** Exportações: PDF (texto justificado, com rodapé do responsável e data) e DOCX (Word, com tabelas inline).
- **RN-REPORT-09:** Rateio de créditos por UC é exibido quando há múltiplas localidades vinculadas a usinas.

---

## 11. Análise Energética

- **RN-ANALYSIS-01:** Gráficos históricos exibidos **mesmo com 1 registro** (não exigem série temporal mínima).
- **RN-ANALYSIS-02:** Eixo duplo: consumo (kWh) e custo (R$).
- **RN-ANALYSIS-03:** Filtros padrão: ano atual, todas as usinas.
- **RN-ANALYSIS-04:** Exportações: PDF (landscape) e Excel com duas abas (Resumo + Detalhado).

---

## 12. Importação de Geração (PDF)

- **RN-GENIMP-01:** Aceita PDF e Excel.
- **RN-GENIMP-02:** **Match de usinas:** lógica `matchPlant` faz pareamento por nome (case-insensitive, normalizado).
- **RN-GENIMP-03:** Registros com data/hora válida e geração > 0 são inseridos em `energy_data`.

---

## 13. Integrações com Fabricantes

Fabricantes suportados: **Growatt, Hoymiles, APSystems, Fronius, SolarEdge**.

- **RN-INT-01:** Cada integração armazena credenciais em campo JSONB criptografado (`credentials`).
- **RN-INT-02:** Campos de senha/API key possuem toggle de visibilidade no formulário (ocultos por padrão).
- **RN-INT-03:** **APSystems:** autenticação HMAC e estratégia **Summary-First** para mitigar rate limit (usa endpoint resumido antes de paginar detalhes).
- **RN-INT-04:** Logs de sincronização (`sync_logs`) registram: status, nº de usinas sincronizadas, pontos de energia coletados, erro (se houver).
- **RN-INT-05:** Sincronização pode ser disparada manualmente (botão) ou via cron.

---

## 14. API MCP (Integração Externa)

- **RN-MCP-01:** Autenticação obrigatória via header `x-api-key`.
- **RN-MCP-02:** Transporte: HTTP Streamable (Hono + StreamableHttpTransport).
- **RN-MCP-03:** Ferramentas expostas: `list_plants`, `get_energy_data`, `get_plant_summary`, `get_alerts`, `import_energy_bill`, `import_water_bill`.
- **RN-MCP-04:** Importação de faturas via MCP aceita payload base64 do PDF.
- **RN-MCP-05:** Todas as chamadas MCP respeitam o tenant do owner da API key.

---

## 15. Auditoria

- **RN-AUDIT-01:** Ações críticas (criação, edição, exclusão) geram registro em `audit_logs` automaticamente.
- **RN-AUDIT-02:** Campos registrados: tipo de evento, descrição, usuário, e-mail, IP, entidade afetada, metadata JSON, data/hora.
- **RN-AUDIT-03:** Logs são **somente leitura** (não podem ser atualizados ou excluídos via aplicação).
- **RN-AUDIT-04:** Visualização restrita a Admin e Gestor.

---

## 16. Armazenamento de Arquivos

- **RN-FILE-01:** Todo upload para o Storage **deve sanitizar o nome**: espaços e caracteres especiais → underscores (evita erro "Invalid Key").
- **RN-FILE-02:** PDFs de faturas originais ficam acessíveis para download na tabela de faturas.
- **RN-FILE-03:** Logos de tenant ficam em bucket separado com acesso público controlado.

---

## 17. Formatação e Localização

- **RN-FMT-01:** Idioma padrão: **pt-BR**.
- **RN-FMT-02:** Números: separador de milhar `.` e decimal `,` (ex.: `1.234,56`).
- **RN-FMT-03:** Datas: formato `dd/MM/yyyy`.
- **RN-FMT-04:** Moeda: `R$ X.XXX,XX` com 2 casas decimais.
- **RN-FMT-05:** Meses por extenso em português nos relatórios.
- **RN-FMT-06:** Unidades de medida: `kWp` (capacidade), `kWh` (energia), `kW` (potência), `m³` (água).

---

## Glossário Rápido

| Termo | Definição |
|-------|-----------|
| Tenant | Organização isolada no sistema multi-tenant |
| UC | Unidade Consumidora (ponto com conta de luz/água) |
| kWp | Capacidade máxima da usina em condições ideais |
| TUSD | Tarifa de Uso do Sistema de Distribuição |
| TE | Tarifa de Energia |
| ICMS-CDE | Componente positivo da fatura, **deve** entrar no valor bruto |
| CGE-PE | Comissão de Gestão Energética de Pernambuco |
| RLS | Row Level Security (controle de acesso por linha) |
| OCR | Reconhecimento Óptico de Caracteres |
| MCP | Model Context Protocol (integração com assistentes de IA) |

---

*Documento de regras de negócio — UtiliHub, Junho/2026.*
