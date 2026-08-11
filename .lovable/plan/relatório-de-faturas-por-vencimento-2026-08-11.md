# Relatório de faturas por vencimento

Hoje as abas "Contas de Energia" e "Contas de Água" (página Consumo) filtram e exportam sempre pelo mês/ano de **competência** (`reference_month`). Como faturas da mesma competência podem vencer em meses diferentes, será adicionado um modo de período por **vencimento** (`due_date`).

## O que muda

### 1. Seletor de modo de período
Em cada aba (Energia e Água), ao lado dos filtros atuais, um seletor:
- **Competência** (padrão, comportamento atual)
- **Vencimento**

Ao trocar para Vencimento, os seletores de Mês e Ano passam a filtrar pela data de vencimento da fatura. As opções de mês/ano são recalculadas a partir das datas de vencimento existentes. Faturas sem vencimento preenchido aparecem apenas quando o filtro de mês/ano estiver em "Todos".

### 2. Tabela
- Coluna de vencimento passa a ser exibida em formato pt-BR (dd/mm/aaaa) em vez do formato bruto.
- No modo Vencimento, a tabela é ordenada por vencimento crescente por padrão e a coluna de vencimento fica ordenável.
- Coluna de competência continua visível nos dois modos, para conferência.
- Os totalizadores (consumo, bruto, deduções, líquido) refletem o conjunto filtrado, como já ocorre.

### 3. Exportações (Excel e PDF)
Os botões existentes passam a respeitar o modo escolhido:
- Título/cabeçalho indica o critério: "Faturas por Vencimento — 03/2026" ou "Faturas por Competência — 02/2026".
- Nome do arquivo diferenciado (ex.: `contas-energia-vencimento-03-2026.xlsx`).
- Colunas incluem tanto Competência quanto Vencimento, com o mesmo detalhamento atual (local, matrícula/UC, nota fiscal, consumo, bruto, iluminação, deduções, líquido — e água/esgoto/total no caso de água).
- Linha de totais no rodapé mantida.

## Detalhes técnicos

- Arquivo único afetado: `src/pages/ConsumptionPage.tsx`.
- Novos estados: `billPeriodMode` e `waterPeriodMode` (`"competencia" | "vencimento"`).
- Filtro: quando o modo é vencimento, extrai ano/mês de `due_date` (formato ISO `YYYY-MM-DD`) em vez de `reference_month` (`MM/YYYY`); as listas `uniqueYears`/`uniqueMonths` passam a derivar da mesma fonte do modo ativo.
- Ordenação: adicionar caso `due_date` no comparador e definir `due_date`/asc como padrão ao entrar no modo vencimento.
- Exportações: `exportExcel`, `exportPDF`, `exportWaterExcel`, `exportWaterPDF` recebem o rótulo do período e a coluna de vencimento formatada; nenhuma alteração de banco de dados é necessária (o campo `due_date` já existe em `energy_bills` e `water_bills`).
