

## Gráfico de Histórico de Consumo por Imóvel no Dashboard

### O que será feito

Adicionar um gráfico de área preenchida (estilo `EnergyChart`) em cada aba do Dashboard (Energia e Água) que mostra a **evolução mensal** do consumo, custo e geração (quando aplicável) para o imóvel selecionado ou para todos os imóveis agregados.

### Comportamento

- **Aba Energia**: Quando o filtro de Ano estiver em "Todos os anos" ou um ano específico, exibir um gráfico de área com 3 séries: **Consumo (kWh)**, **Geração (kWh)** e **Custo (R$)** — eixo duplo (kWh à esquerda, R$ à direita). Os dados são agrupados por `reference_month` das faturas filtradas.
- **Aba Água**: Gráfico de área com 2 séries: **Consumo (m³)** e **Custo (R$)** — eixo duplo. Mesma lógica de agrupamento.
- O gráfico aparece **entre os StatCards e o gráfico de barras por imóvel** já existente.
- Ao filtrar por imóvel específico, o gráfico mostra apenas o histórico daquele imóvel.

### Alterações Técnicas

**Arquivo: `src/pages/Dashboard.tsx`**

1. Adicionar dois `useMemo` para calcular os dados de histórico mensal:
   - `energyHistoryChart`: agrupa `filteredEnergyBills` por `reference_month`, somando `consumption_kwh`, `generation_kwh` e `gross_value`. Ordena cronologicamente.
   - `waterHistoryChart`: agrupa `filteredWaterBills` por `reference_month`, somando `consumption_m3` e `total_value`. Ordena cronologicamente.

2. Renderizar um novo componente `EnergyChart` (ou um `AreaChart` customizado com eixo duplo) em cada aba:
   - **Energia** (após StatCards, antes do `WaterBarChart`): gráfico com `dataKeys` para consumo, geração e custo.
   - **Água** (após StatCards, antes do `WaterBarChart`): gráfico com consumo e custo.

3. Como o `EnergyChart` atual suporta apenas dois `dataKeys` fixos (`generation`/`consumption`), criar um novo componente **`ConsumptionHistoryChart`** que aceita dados genéricos com eixo duplo (kWh/m³ à esquerda, R$ à direita) e múltiplas séries configuráveis.

**Novo arquivo: `src/components/ConsumptionHistoryChart.tsx`**

- Componente reutilizável com `AreaChart` do Recharts.
- Props: `data`, `title`, `series` (array de `{ dataKey, name, color, yAxisId }`), `leftUnit`, `rightUnit`.
- Dois `YAxis` (esquerda para volume, direita para valor R$).
- Tooltip formatado em pt-BR com unidades.

### Fluxo Visual

```text
┌─────────────────────────────────┐
│  Filtros (Ano / Mês / Imóvel)   │
├─────────────────────────────────┤
│  StatCards (6 cards)            │
├─────────────────────────────────┤
│  📊 Histórico Mensal (NOVO)    │  ← Gráfico de área com eixo duplo
│  Consumo + Geração + Custo     │
├─────────────────────────────────┤
│  📊 Consumo por Imóvel (barras)│  ← Já existente
├─────────────────────────────────┤
│  Tabela de Faturas              │
└─────────────────────────────────┘
```

