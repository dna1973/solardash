

# Plano: Relatório Semestral de Eficiência Energética (Art. 4º — Portaria nº 11/2026)

## Visão Geral
Adicionar aba "Relatório Semestral" na página Reports com geração de relatório formal conforme a Portaria, incluindo análise por IA, checklist de regularização (Art. 5º), rateio de créditos por UC, e formalização com membros da comissão.

---

## Estrutura do Relatório (4 seções + extras da Portaria)

1. **Resumo Executivo** — Desempenho geral da geração solar no semestre (gerado por IA)
2. **Análise de Saving** — Economia gerada, tabela prevista vs. realizada, análise de repetição de indébito (Art. 2º, III)
3. **Rateio de Créditos por UC** (Art. 2º, II) — Tabela listando cada DEL/unidade consumidora, créditos recebidos e se o rateio planejado foi cumprido
4. **Status Operacional dos Ativos** — Disponibilidade das usinas, alertas/eventos (furto, manutenção)
5. **Checklist de Regularização / Levantamento Inicial** (Art. 5º) — Toggle "Modo Levantamento Inicial" com checklist de pendências (manutenção, regularização tarifária, cobranças indevidas Neoenergia)
6. **Conclusão e Recomendações** — Gerada por IA, incluindo análise sobre cobranças indevidas (Art. 2º, III)

## Dados Utilizados

| Fonte | Uso |
|---|---|
| `energy_data` | Geração mensal por usina |
| `plants` | Capacidade instalada (`capacity_kwp`) para previsão |
| `energy_bills` | Consumo, custos, rateio por `property_name`/`account_number` |
| `alerts` | Eventos de furto, manutenção, falhas |
| `property_locations` + `property_location_plants` | Mapeamento UC ↔ usinas para rateio |

## Implementação

### 1. Componente `SemesterReport.tsx` (novo)
- Filtros: ano + semestre (1º Jan-Jun, 2º Jul-Dez)
- Campo editável: tarifa média (R$/kWh, default 0.75)
- Toggle "Modo Levantamento Inicial (Art. 5º)" — exibe checklist de pendências editável
- Seção de membros da comissão: campos editáveis para Presidente, Vice-Presidente e membros DEL01-DEL06
- Tabela "Prevista vs. Realizada" por usina/mês
- Tabela de rateio de créditos por unidade consumidora (DEL)
- Tabela de alertas/eventos do semestre
- Botão "Gerar Análise com IA" → chama edge function
- Botão "Exportar PDF"

### 2. Edge Function `generate-semester-report` (nova)
- Recebe dados agregados (geração, saving, alertas, rateio)
- Usa Lovable AI (`google/gemini-2.5-flash`)
- Prompt inclui contexto da Portaria nº 11/2026, Art. 2º (cobranças indevidas / repetição de indébito), Art. 4º e Art. 5º
- Retorna: Resumo Executivo + Conclusão/Recomendações em texto estruturado

### 3. `Reports.tsx` (modificar)
- Adicionar `Tabs` para separar "Análise Energética" (existente) do "Relatório Semestral" (novo)

### 4. Exportação PDF
- Cabeçalho: "RELATÓRIO SEMESTRAL DE EFICIÊNCIA ENERGÉTICA — Conforme Art. 4º da Portaria nº 11/2026 — CGE-PE"
- Destaque do valor total de economia no topo
- Tabelas formatadas (prevista vs. realizada, rateio por UC, eventos)
- Texto da IA nas seções de análise e conclusão
- Membros da comissão no cabeçalho/rodapé
- Campo de assinatura para o Superintendente no rodapé
- Rodapé com nome do gerador e timestamp

### 5. Checklist Art. 5º (Levantamento Inicial)
- Lista de itens verificáveis: pendências de manutenção, regularização tarifária, cobranças indevidas Neoenergia
- Estado salvo localmente (localStorage) — sem necessidade de nova tabela por enquanto
- Visível apenas quando toggle "Modo Levantamento Inicial" ativado

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/pages/Reports.tsx` | Adicionar Tabs + importar SemesterReport |
| `src/components/SemesterReport.tsx` | Criar — lógica completa do relatório |
| `supabase/functions/generate-semester-report/index.ts` | Criar — edge function IA |
| `supabase/config.toml` | Não editar (auto-gerenciado) |

## Notas
- Usa Lovable AI (Gemini 2.5 Flash) — sem API key extra
- Nenhuma migração de banco necessária — todos os dados já existem nas tabelas atuais
- Checklist do Art. 5º usa localStorage para simplicidade inicial; pode migrar para banco depois

