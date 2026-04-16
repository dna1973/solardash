# UtiliHub — Manual Completo da Aplicação

> **Versão:** 1.0 — Abril/2026  
> **Plataforma:** Aplicação web responsiva (React 18 + TypeScript)  
> **Backend:** Lovable Cloud (PostgreSQL, Edge Functions, Storage)

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Acesso e Autenticação](#2-acesso-e-autenticação)
3. [Estrutura de Navegação](#3-estrutura-de-navegação)
4. [Dashboard](#4-dashboard)
5. [Geração (Usinas Solares)](#5-geração-usinas-solares)
6. [Detalhes da Usina](#6-detalhes-da-usina)
7. [Consumo por Imóvel](#7-consumo-por-imóvel)
8. [Relatórios](#8-relatórios)
9. [Gestão do Sistema](#9-gestão-do-sistema)
10. [Mapa Completo](#10-mapa-completo)
11. [Integrações com Fabricantes](#11-integrações-com-fabricantes)
12. [API MCP (Integração Externa)](#12-api-mcp-integração-externa)
13. [Controle de Acesso (RBAC)](#13-controle-de-acesso-rbac)
14. [Tema e Interface](#14-tema-e-interface)
15. [Funcionalidades Técnicas](#15-funcionalidades-técnicas)

---

## 1. Visão Geral

O **UtiliHub** é uma plataforma de gestão de utilidades voltada para monitoramento de geração solar, consumo de energia elétrica e consumo de água. A aplicação permite:

- **Monitoramento em tempo real** de usinas solares (geração, consumo, status)
- **Importação de faturas** de energia e água via OCR com inteligência artificial
- **Gestão de múltiplas unidades consumidoras** com mapeamento de localidades
- **Relatórios semestrais** em conformidade com a Portaria nº 11/2026 (CGE-PE)
- **Alertas inteligentes** para anomalias de geração
- **Integração com fabricantes** de inversores (Growatt, Hoymiles, APSystems, Fronius, SolarEdge)
- **Exportação de dados** em PDF, Excel (.xlsx) e Word (.docx)
- **API MCP** para integração com sistemas externos e assistentes de IA

### Identidade Visual

- **Ícone:** Raio (⚡) representando energia
- **Estética:** Glassmorphism com cantos arredondados
- **Formatação:** Padrão pt-BR para números e datas
- **Tema:** Claro e escuro (alternância automática ou manual)

---

## 2. Acesso e Autenticação

### Landing Page (`/`)

Página institucional pública apresentando as funcionalidades do UtiliHub. Usuários autenticados são automaticamente redirecionados para `/dashboard`.

### Login (`/login`)

- **E-mail e senha** — Cadastro com confirmação por e-mail
- **Login com Google** — OAuth 2.0
- Alternância entre Login e Cadastro na mesma tela
- Campo de senha com toggle de visibilidade (ícone de olho)

### Recuperação de Senha

- **Esqueci minha senha** (`/forgot-password`) — Envia link de redefinição por e-mail
- **Redefinir senha** (`/reset-password`) — Formulário para nova senha

### Segurança

- Todas as rotas internas (`/dashboard/*`) são protegidas por autenticação
- Sessão gerenciada via tokens JWT com refresh automático
- Isolamento multi-tenant: cada organização vê apenas seus próprios dados

---

## 3. Estrutura de Navegação

O menu lateral (sidebar) colapsável contém:

| Menu | Rota | Descrição |
|------|------|-----------|
| Dashboard | `/dashboard` | Visão geral com indicadores e mapas |
| Geração | `/dashboard/plants` | Usinas solares e alertas |
| Consumo | `/dashboard/consumption` | Faturas de energia e água por imóvel |
| Relatórios | `/dashboard/reports` | Relatório semestral e análise energética |
| Gestão do Sistema | `/dashboard/management` | Usuários, integrações, localidades, logs, API |

**Extras:**
- Mapa completo: `/dashboard/map`
- Detalhe da usina: `/dashboard/plants/:id`
- Navegação por abas com persistência via parâmetro `?tab=` na URL

---

## 4. Dashboard

O Dashboard é organizado em **4 abas**:

### 4.1 Aba Mapa

- Mapa interativo (Leaflet) com marcadores para cada usina solar
- Auto-zoom (FitBounds) para enquadrar todos os marcadores
- Clique no marcador para ir ao detalhe da usina
- Botão para abrir o mapa em tela cheia

### 4.2 Aba Energia (Geração)

**Indicadores (StatCards):**
- Total de usinas e usinas online
- Energia gerada no período (kWh/MWh)
- Potência atual (kW)
- CO₂ evitado (ton)
- Alertas ativos
- Consumo total, médio e de pico
- Autoconsumo (%) e energia injetada na rede

**Gráfico de geração vs consumo:**
- Períodos: Hoje, Ontem, Semana, Mês, Ano
- Navegação temporal (← →) para avançar/retroceder
- Filtro por usina específica ou todas
- Escala automática: horas (dia), dias (semana/mês), meses (ano)

**Tabela de usinas** com status, capacidade e localização.

### 4.3 Aba Faturas de Energia

**Filtros:** Ano, Mês, Imóvel (com padrão mês anterior)

**Indicadores:**
- Total de faturas
- Consumo total (kWh)
- Valor bruto, valor líquido e deduções totais

**Gráfico histórico** (Consumo kWh vs Custo R$ — eixo duplo)

**Gráfico pizza** — Consumo por localidade

### 4.4 Aba Água

**Filtros:** Ano, Mês, Imóvel

**Indicadores:**
- Total de faturas
- Consumo total (m³)
- Custo total, valor água e valor esgoto

**Gráficos:** Barras (consumo mensal) e pizza (consumo por localidade)

---

## 5. Geração (Usinas Solares)

### 5.1 Listagem de Usinas (`/dashboard/plants?tab=usinas`)

- Grid de cards com nome, localização, status, capacidade (kWp), fabricante e integrador
- **Filtros:** Busca por nome/local, status (Online/Offline/Alerta/Manutenção), fabricante, integrador
- Badges de filtros ativos com botão para limpar
- **Nova Usina:** Botão para cadastro manual

### 5.2 Importação de Geração (PDF)

- Botão "Importar Geração (PDF)" abre diálogo de upload
- Upload de arquivo PDF com relatório de geração
- OCR via IA extrai dados de geração por usina
- Match automático de usinas pelo nome

### 5.3 Alertas (`/dashboard/plants?tab=alertas`)

- Lista de alertas com classificação: **Crítico** (vermelho), **Alerta** (amarelo), **Info** (azul)
- Alertas resolvidos aparecem com opacidade reduzida
- **Ações:**
  - Resolver alerta individual ou em lote
  - Apagar alertas selecionados (com confirmação)
  - "Verificar Agora" — dispara verificação manual de geração
- Seleção múltipla com checkbox (individual e "selecionar todos")

### 5.4 Status das Usinas

| Status | Cor | Significado |
|--------|-----|-------------|
| Online | Verde | Operando normalmente |
| Offline | Vermelho | Sem comunicação |
| Alerta (Warning) | Amarelo/Laranja | Problema ativo detectado |
| Manutenção | Azul/Cinza | Em manutenção programada |

---

## 6. Detalhes da Usina

**Rota:** `/dashboard/plants/:id`

- Informações: Nome, localização, capacidade (kWp), data de instalação, fabricante, integrador
- **Edição:** Botão de editar (ícone lápis) abre diálogo para alterar campos manuais
- **Gráfico de geração/consumo** com os mesmos controles de período do Dashboard
- Períodos: Hoje, Ontem, Semana, Mês, Ano, **Personalizado** (calendário)
- Navegação temporal (← →)
- Lista de **dispositivos** vinculados (inversores, medidores)
- Lista de **alertas** ativos da usina

---

## 7. Consumo por Imóvel

**Rota:** `/dashboard/consumption`

Organizado em **2 abas**: Energia e Água.

### 7.1 Faturas de Energia

**Importação (OCR):**
- Botão "Importar Fatura" abre diálogo de upload de PDF
- IA extrai automaticamente: concessionária, nº da conta, código do cliente, mês de referência, consumo (kWh), geração injetada (kWh), valor bruto, valor líquido, deduções, iluminação pública, vencimento, tipo de tarifa, QD, nº da nota fiscal
- **Regra de cálculo:** Valor Bruto = Valor Líquido + Deduções (inclui ICMS-CDE)
- Detecção de duplicatas por conta + mês de referência

**Tabela de faturas:**
- Colunas: Nº da Conta, Local, Consumo kWh, Valor Bruto, Iluminação, Deduções, Valor Líquido, Importado em
- **Ordenação** clicável por qualquer coluna (A-Z, Z-A)
- **Linha de totalização** no rodapé (soma de consumo, bruto, iluminação, deduções, líquido)
- **Ações por fatura:** Editar (todos os campos), Excluir, Baixar PDF original
- **Mapeamento de local:** Usa código do cliente → nome da localidade cadastrada

**Filtros:** Imóvel, Ano, Mês (padrão: mês anterior ao atual)

**Exportações:**
- **Excel (.xlsx)** — Formatação automática de colunas
- **PDF** — Relatório formatado

### 7.2 Faturas de Água

**Importação (OCR):**
- Upload de PDF de conta de água (foco Compesa - PE)
- Extração: matrícula, consumo (m³), valor água, valor esgoto, valor bruto, deduções, total, histórico de consumo

**Tabela de faturas:**
- Colunas: Mês, Matrícula, Local, Consumo m³, Valor Água, Valor Esgoto, Valor Bruto, Deduções, Total, Importado em
- Totalização no rodapé
- Edição e exclusão individual

**Exportações:** Excel (.xlsx) e PDF

### 7.3 Edição Manual de Faturas

Tanto faturas de energia quanto de água podem ser editadas manualmente após importação. O diálogo de edição apresenta todos os campos extraídos, permitindo correções de valores incorretos do OCR.

---

## 8. Relatórios

**Rota:** `/dashboard/reports`

### 8.1 Relatório Semestral (CGE-PE)

Em conformidade com a **Portaria nº 11/2026** do Governo de Pernambuco.

**Filtros:** Ano, Semestre (1º ou 2º), Tarifa (R$/kWh)

**Seções do relatório:**
- **Economia total** do semestre (destaque visual)
- **Cards de resumo:** Total gerado, total esperado, percentual atingido, nº de alertas
- **Análise por IA** — Gera resumo executivo e recomendações automaticamente via modelo de linguagem
- **Tabela Geração vs Real** — Por usina e mês, com geração esperada (baseada em capacidade × horas de sol)
- **Economia por Usina** — Valor economizado por planta
- **Rateio de Créditos** — Distribuição de créditos de energia por unidade consumidora (UC)
- **Alertas do Semestre** — Agrupados por tipo
- **Checklist de verificação** — Itens como calibração, limpeza, inspeção (salvo em localStorage)
- **Membros da Comissão** — Cadastro manual ou importação via PDF/imagem (OCR)

**Exportações:**
- **PDF** — Texto justificado, com seções completas, rodapé com responsável e data
- **DOCX (Word)** — Formatação HTML com tabelas inline

### 8.2 Análise Energética

**Filtros:** Usina, Ano

**Indicadores:**
- Energia gerada (média/mês em MWh)
- Energia injetada na rede
- Economia estimada (R$)
- CO₂ evitado (ton)

**Gráficos:**
- Geração vs Consumo — Mensal (barras)
- Comparativo entre Usinas (barras horizontais, quando há múltiplas usinas)

**Tabela detalhada:** Usina × Mês com geração, consumo e energia injetada

**Exportações:** PDF (landscape) e Excel (2 abas: Resumo + Detalhado)

---

## 9. Gestão do Sistema

**Rota:** `/dashboard/management`

Organizado em **5 abas**:

### 9.1 Usuários

- Listagem de usuários do tenant com nome, e-mail, telefone e perfil de acesso
- **Ações:** Criar, editar (nome, telefone, perfil) e excluir usuários
- Perfis disponíveis: Admin, Gestor, Operador
- E-mails buscados via Edge Function (workaround para limitação do auth)

### 9.2 Integrações

- Gerenciamento de conexões com fabricantes de inversores
- Cards por fabricante com status de conexão (ativo/inativo)
- Configuração de credenciais (API key, token, etc.) com campos de senha e toggle de visibilidade
- **Sincronização:** Botão para sincronizar manualmente ou via cron automático
- **Logs de sincronização:** Histórico com status, nº de usinas sincronizadas, pontos de energia coletados

**Fabricantes suportados:**
- Growatt
- Hoymiles
- APSystems (com mitigação de rate limit — estratégia Summary-First)
- Fronius
- SolarEdge

### 9.3 Localidades

- Mapeamento de unidades consumidoras: nome personalizado + código da conta (energia) + matrícula (água)
- **Vinculação de usinas:** Cada localidade pode ter uma ou mais usinas vinculadas (relação N:N)
- Regra de exclusividade: uma usina só pode estar vinculada a uma localidade por vez
- CRUD completo (criar, editar, excluir)
- **Exportações:** Excel e PDF com listagem completa

### 9.4 Logs de Auditoria

- Registro de todas as ações realizadas no sistema
- Campos: Tipo de evento, descrição, usuário, data/hora, IP, entidade afetada
- Filtragem e paginação

### 9.5 API (Documentação MCP)

- Documentação interativa da API MCP para integrações externas
- Endpoint do servidor, autenticação via `x-api-key`
- Lista de ferramentas disponíveis com parâmetros
- Exemplos de configuração para clientes MCP
- Exemplos de chamada em **cURL**, **PowerShell** e **CMD Windows**
- Botão de copiar para cada snippet
- **Exportação:** PDF da documentação completa

---

## 10. Mapa Completo

**Rota:** `/dashboard/map`

- Mapa em tela cheia (Leaflet) com todas as usinas solares
- Marcadores coloridos por status
- Clique para ver detalhes rápidos
- Botão de retorno ao dashboard

---

## 11. Integrações com Fabricantes

### Coleta Automática

- **Agendamento:** pg_cron a cada 1 hora, de 07:00 às 18:00 (BRT)
- **Payload:** `sync_all` para sincronizar todas as integrações ativas
- **Dados coletados:** Geração (kWh), consumo (kWh), potência instantânea (kW), tensão, corrente, temperatura

### Adaptadores Específicos

| Fabricante | Autenticação | Observações |
|-----------|-------------|-------------|
| Growatt | Login + token | API REST padrão |
| Hoymiles | Token direto | API REST |
| APSystems | HMAC signature | Rate limit mitigado com Summary-First |
| Fronius | API local | Sem autenticação externa |
| SolarEdge | API key | REST com paginação |

### Lógica de Geração Zero

- Se a integração retorna 0 kWh fora do horário solar (antes das 6h ou após 20h), o registro é ignorado
- Dentro do horário solar, 0 kWh é registrado normalmente (pode indicar falha)

---

## 12. API MCP (Integração Externa)

O UtiliHub expõe um servidor **MCP (Model Context Protocol)** via Edge Function para integração com assistentes de IA e sistemas externos.

### Ferramentas Disponíveis

| Ferramenta | Descrição |
|-----------|-----------|
| `list_plants` | Lista usinas com filtro por status |
| `get_energy_data` | Dados de geração/consumo por usina e período |
| `get_plant_summary` | Resumo agregado por usina |
| `get_alerts` | Alertas com filtro por usina e status |
| `import_energy_bill` | Importa fatura de energia via base64 (OCR) |
| `import_water_bill` | Importa fatura de água via base64 (OCR) |

### Autenticação

- Header: `x-api-key` com chave configurada no servidor
- Transporte: HTTP Streamable (Hono + StreamableHttpTransport)

---

## 13. Controle de Acesso (RBAC)

O sistema utiliza três perfis de acesso:

| Perfil | Permissões |
|--------|-----------|
| **Admin** | Acesso total, incluindo criação/exclusão de usuários e usinas |
| **Gestor** | Acesso total ao tenant, exceto exclusão de usuários e usinas |
| **Operador** | Somente importar/visualizar faturas e consultar dados. Sem acesso a configurações, integrações ou gestão de usuários |

- Roles armazenadas em tabela separada (`user_roles`) com RLS
- Função `has_role()` (SECURITY DEFINER) para verificação sem recursão
- Isolamento por tenant via `tenant_id` em todas as tabelas

---

## 14. Tema e Interface

### Design System

- **Glassmorphism:** Efeitos de transparência e blur nos cards e modais
- **Cantos arredondados:** `rounded-xl` como padrão
- **Animações:** Framer Motion para transições suaves
- **Cores semânticas:** Tokens CSS via variáveis HSL (--primary, --background, --muted, etc.)
- **Tema escuro/claro:** Toggle no header com persistência

### Responsividade

- **Desktop:** Layout sidebar + conteúdo principal
- **Tablet:** Sidebar colapsável, grids adaptáveis
- **Mobile:** Sidebar em drawer, grids 2 colunas, tabs com scroll horizontal, formulários full-width

### Formatação pt-BR

- Números: separador de milhar (.) e decimal (,)
- Datas: formato dd/MM/yyyy
- Moeda: R$ com 2 casas decimais
- Meses por extenso em português

---

## 15. Funcionalidades Técnicas

### OCR de Faturas

- **Motor:** Modelos de IA (Gemini/GPT) via Lovable AI Gateway
- **Fluxo:** Upload PDF → Conversão para imagem base64 → Extração via prompt estruturado → Validação → Persistência
- **Validação cruzada:** `gross_value = net_value + deductions_value`
- **Detecção de duplicatas:** Constraint UNIQUE em (account_number + reference_month)
- **Concessionárias suportadas:** Neoenergia (energia), Compesa (água)

### Armazenamento de Arquivos

- PDFs de faturas armazenados no Storage com sanitização de nomes (espaços e caracteres especiais → underscores)
- Download do PDF original disponível na tabela de faturas

### Paginação de Dados

- Hook `useEnergyData` com paginação recursiva via `.range()` para superar limite de 1000 registros do banco

### Logs de Auditoria

- Registro automático de ações críticas (criação, edição, exclusão)
- Campos: evento, descrição, usuário, IP, entidade, metadata JSON

### Monitoramento de Alertas

- Edge Function `check-generation-alerts` verifica anomalias de geração
- **Status atual:** Monitoramento automático globalmente suspenso (`ALERT_MONITORING_ENABLED = false`) até estabilização das APIs dos fabricantes
- Verificação manual disponível via botão "Verificar Agora"

### Exportações

| Formato | Biblioteca | Características |
|---------|-----------|----------------|
| PDF | jsPDF | Texto justificado, tabelas formatadas, rodapé com responsável |
| Excel | xlsx-js-style | Colunas auto-ajustadas, formatação de cabeçalho com cores |
| DOCX | HTML manual (Blob) | Tabelas inline, estilos básicos |

---

## Glossário

| Termo | Definição |
|-------|-----------|
| kWp | Kilowatt-pico — capacidade máxima da usina em condições ideais |
| kWh | Kilowatt-hora — unidade de energia gerada/consumida |
| UC | Unidade Consumidora — ponto de medição com conta de luz |
| OCR | Reconhecimento Óptico de Caracteres — extração de texto de imagens |
| MCP | Model Context Protocol — protocolo para integração com assistentes de IA |
| CGE-PE | Comissão de Gestão Energética de Pernambuco |
| TUSD | Tarifa de Uso do Sistema de Distribuição |
| TE | Tarifa de Energia |
| ICMS-CDE | Imposto sobre Circulação de Mercadorias — componente da fatura |
| RLS | Row Level Security — controle de acesso no nível de linha do banco |
| Tenant | Organização/empresa isolada no sistema multi-tenant |

---

*Documento gerado automaticamente com base no código-fonte do UtiliHub — Abril/2026*
