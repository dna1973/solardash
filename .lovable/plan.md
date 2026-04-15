

## Plano: Proteger o arquivo .env contra commits

### Problema
O `.gitignore` atual não inclui o arquivo `.env`, o que permite que variáveis sensíveis (como chaves do backend) sejam incluídas em commits.

### Solução
Adicionar `.env` e variações comuns (`.env.local`, `.env.*.local`) ao `.gitignore`.

### Alteração
**Arquivo**: `.gitignore`
- Adicionar uma seção "Environment variables" com:
  - `.env`
  - `.env.local`
  - `.env.*.local`

Isso é uma alteração de uma linha (seção) em um único arquivo.

