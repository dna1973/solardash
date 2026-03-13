

## Plano: Importar Dados de Geração via Excel (Growatt)

### Contexto
As planilhas Growatt (.xls) seguem um formato padrão:
- **Linha 1**: Nome da usina (ex: "9018.1 - PRF PE CARUARU Year Report")
- **Linha 4**: Ano (ex: "2026")
- **Seção "Inverter Data"**: Tabela com serial do inversor nas linhas e meses (1-12) nas colunas, valores em kWh
- Cada arquivo = 1 usina com 1+ inversores

### O que será feito

**1. Expandir `GenerationImportDialog` para aceitar Excel (.xls/.xlsx)**
- Adicionar `application/vnd.ms-excel` e `.xlsx` aos tipos aceitos
- Quando o arquivo for Excel, processar localmente com `xlsx-js-style` (já instalado) em vez de chamar a edge function OCR
- Parser local que:
  - Extrai o nome da usina da primeira linha
  - Extrai o ano da linha 4
  - Localiza a seção "Inverter Data" e lê os seriais + valores mensais (colunas 1-12)
  - Soma os valores de todos os inversores por mês (ou mantém separados por inversor)
  - Gera as mesmas `GenerationRow[]` usadas pelo fluxo PDF

**2. Suporte a múltiplos arquivos**
- Permitir upload de vários arquivos Excel de uma vez (cada um = 1 usina)
- Processar todos e concatenar os resultados na mesma tabela de revisão
- Manter o fluxo existente: revisão → mapeamento de usinas → salvar

**3. Matching automático de usinas**
- Usar o nome extraído do Excel (ex: "PRF PE CARUARU") para buscar na tabela `plants` por correspondência parcial
- Pré-preencher o mapeamento quando possível

### Arquivos a editar
- **`src/components/GenerationImportDialog.tsx`**: Adicionar parser Excel, suporte a múltiplos arquivos, aceitar .xls/.xlsx

### Detalhes técnicos
- Usar `import * as XLSX from "xlsx-js-style"` para ler o arquivo no browser
- Não é necessária nova edge function — parsing 100% client-side
- A estrutura da planilha é fixa: a seção "Inverter Data" começa após o header "Inverter Serial Number" com colunas meses 1-12 indexadas nas posições 3-14

