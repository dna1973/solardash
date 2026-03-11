

## Plano: Importação de Contas de Energia e Água via MCP

### Desafio Técnico

O protocolo MCP usa JSON-RPC, ou seja, não suporta upload de arquivos (multipart/form-data) diretamente. A solução é aceitar o **arquivo codificado em base64** como parâmetro string nas ferramentas MCP.

### Abordagem

Adicionar duas novas ferramentas ao servidor MCP (`solar-mcp/index.ts`):

1. **`import_energy_bill`** -- Recebe o arquivo da conta de energia em base64, processa via OCR (Lovable AI/Gemini), e salva na tabela `energy_bills`.
2. **`import_water_bill`** -- Idem para contas de água, salvando na tabela `water_bills`.

Cada ferramenta terá os seguintes parâmetros:
- `file_base64` (string, obrigatório): conteúdo do arquivo em base64
- `file_name` (string, obrigatório): nome do arquivo (para storage)
- `file_type` (string, obrigatório): MIME type (ex: `application/pdf`, `image/jpeg`)
- `tenant_id` (string, opcional): ID do tenant (se omitido, usa o default)

### Fluxo de cada ferramenta

1. Upload do arquivo (base64 → buffer) para o storage (`energy-bills` ou `water-bills`)
2. Envio da imagem/PDF para o Lovable AI com o mesmo prompt OCR já existente nas funções `ocr-energy-bill` e `ocr-water-bill`
3. Parse do JSON extraído
4. Verificação de duplicidade (por `account_number` + `reference_month` + `tenant_id`)
5. Inserção na tabela correspondente
6. Retorno dos dados extraídos e salvos

### Arquivos a editar

1. **`supabase/functions/solar-mcp/index.ts`** -- Adicionar as duas novas ferramentas (`import_energy_bill` e `import_water_bill`), reutilizando a lógica de OCR dos edge functions existentes.

2. **`src/pages/McpDocPage.tsx`** -- Adicionar documentação das duas novas ferramentas na lista `tools[]`, com descrição dos parâmetros e exemplo de uso com base64.

### Segurança

O servidor MCP já usa `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS) e autenticação via API key. As inserções respeitarão o `tenant_id` informado. Como o MCP é para uso programático/integração, isso é adequado.

### Consideração sobre tamanho

Arquivos PDF de faturas tipicamente têm 200KB-2MB. Em base64, ficam ~33% maiores. O limite de payload do Deno/Edge Functions (~6MB) comporta isso sem problemas.

