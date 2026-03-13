

## Plano: Importar Dados de Geração de Usinas via PDF

### Contexto
O PDF enviado (relatório mensal APsystems) contém uma tabela com ECU IDs nas linhas e meses nas colunas, com valores de geração em kWh. Enquanto as APIs de integração não funcionam, precisamos permitir a importação manual desses dados.

### Formato do PDF
```text
| Month        | Jan (kWh) | Feb (kWh) | Mar (kWh) |
| 216200002792 | 0         | 0         | 0         |
| 216000047026 | 8057.68   | 6597.13   | 3211.98   |
| ...          | ...       | ...       | ...       |
| Total        | 15514.37  | 14772.49  | 6245.28   |
```

### O que será feito

**1. Nova Edge Function `ocr-generation-report`**
- Recebe o PDF via upload (multipart/form-data)
- Usa Lovable AI (Gemini 2.5 Flash) para extrair a tabela em JSON estruturado
- Formato esperado da extração: array de objetos `{ plant_name, month, year, energy_generated_kwh }`
- Retorna os dados extraídos para revisão no frontend

**2. Novo componente `GenerationImportDialog`**
- Dialog similar ao `BillImportDialog` (upload → OCR → revisão → salvar)
- Etapa de upload: aceita PDF/imagem do relatório
- Etapa de revisão: exibe tabela editável com colunas (Usina, Mês/Ano, Geração kWh)
- Permite corrigir valores antes de salvar
- Etapa de salvamento: para cada linha, busca o `plant_id` pelo nome da usina (campo `name` da tabela `plants`), e insere registros na tabela `energy_data` com:
  - `plant_id`: encontrado pelo nome/ECU ID
  - `timestamp`: primeiro dia do mês correspondente
  - `energy_generated_kwh`: valor extraído
  - Verifica duplicatas antes de inserir (mesmo plant_id + mês)

**3. Botão na página de Usinas (`Plants.tsx`)**
- Adiciona botão "Importar Geração (PDF)" ao lado do botão "+ Nova Usina"
- Abre o `GenerationImportDialog`

### Arquivos a criar/editar
- **Criar**: `supabase/functions/ocr-generation-report/index.ts`
- **Criar**: `src/components/GenerationImportDialog.tsx`
- **Editar**: `src/pages/Plants.tsx` — adicionar botão e dialog

