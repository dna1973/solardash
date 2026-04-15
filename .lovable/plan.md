

## Plano: Incluir ICMS-CDE no cálculo do Valor Bruto (OCR)

### Problema
O prompt de OCR instrui a IA a somar "TODOS os itens positivos" para o `gross_value`, mas na prática a IA ignora a linha **ICMS-CDE** (ex: R$ 55,46), resultando em:
- Valor Bruto extraído: **3.744,33** (apenas Consumo-TUSD + Consumo-TE)
- Valor Bruto correto: **3.799,79** (inclui ICMS-CDE de 55,46)

A fórmula esperada é: **Valor Bruto = Valor Líquido + Deduções** (3.575,53 + 224,26 = 3.799,79).

### Solução
Atualizar o prompt de extração para mencionar explicitamente a linha ICMS-CDE como item positivo que deve ser incluído no `gross_value`.

### Alterações

**1. `supabase/functions/ocr-energy-bill/index.ts`** (linha 97)
- Alterar a instrução do campo `gross_value` para incluir menção explícita a "ICMS-CDE" como item positivo, e reforçar a regra `Valor Bruto = Valor Líquido + Deduções` como validação cruzada.

**2. `supabase/functions/solar-mcp/index.ts`** (linha 301)
- Aplicar a mesma correção no `ENERGY_PROMPT` do servidor MCP, adicionando instrução sobre ICMS-CDE no cálculo de `gross_value`.

### Detalhe técnico da alteração no prompt
A linha do `gross_value` passará de:
> "soma de TODOS os itens positivos da coluna VALOR (excluindo deduções e iluminação pública)"

Para:
> "soma de TODOS os itens positivos da coluna VALOR, **incluindo linhas como ICMS-CDE**, Consumo-TUSD, Consumo-TE, Demanda, etc (excluindo apenas deduções negativas e iluminação pública). Validação: gross_value deve ser aproximadamente igual a net_value + deductions_value."

