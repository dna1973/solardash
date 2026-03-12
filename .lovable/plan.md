

## Plano: Testar e Corrigir Integração APsystems (6 ECUs Nexsolar)

### Status Atual Confirmado

- **6 plantas ECU** no banco, todas com status "online"
- **Último sync**: 09/Mar — desde então, erro `code 2005` (rate limit)
- **Dados duplicados**: Cada ECU tem 25 registros com o **mesmo valor** (84.98 kWh) mas timestamps diferentes (a cada 15min do cron). O `onConflict` não funciona porque o timestamp muda a cada execução
- **Problema raiz**: O `collectEnergy` faz 1 chamada de `/summary/{sid}` **por ECU** (6 chamadas ao mesmo endpoint com os mesmos dados), quando 1 única chamada bastaria

### Plano de Execução

#### Passo 1 — Teste de conectividade da API
Chamar a edge function `solar-collector` com `action: list_plants` para validar se as credenciais ainda funcionam e se o rate limit já expirou.

#### Passo 2 — Corrigir o adapter APsystems (`collectEnergy`)
**Problema**: O timestamp do summary usa `new Date().toISOString()` (muda a cada sync), causando duplicatas.
**Correção**: Usar timestamp fixo do dia: `${today}T12:00:00Z` (igual ao que `collectDailyEnergy` já faz).

```typescript
// Antes (linha 298):
timestamp: new Date().toISOString(),
// Depois:
timestamp: `${today}T12:00:00Z`,
```

#### Passo 3 — Otimizar sync para 1 única chamada de summary
**Problema**: `syncAPsystemsOptimized` itera 6 ECUs e chama `collectEnergy` 6 vezes, mas o endpoint `/summary/{sid}` retorna o total do **sistema inteiro** — é a mesma resposta 6 vezes.

**Correção**: No `syncAPsystemsOptimized`, fazer **1 chamada** ao summary, dividir pelo número de ECUs, e persistir para cada planta. Isso reduz de 6 chamadas para 1, eliminando o rate limit.

#### Passo 4 — Limpar dados duplicados no banco
Executar uma migração SQL para remover os 25 registros duplicados por ECU, mantendo apenas 1 por dia:

```sql
DELETE FROM energy_data 
WHERE id NOT IN (
  SELECT DISTINCT ON (plant_id, date_trunc('day', timestamp)) id
  FROM energy_data 
  ORDER BY plant_id, date_trunc('day', timestamp), timestamp ASC
);
```

#### Passo 5 — Testar end-to-end
Disparar um sync manual pela UI (botão "Sincronizar Todos") e verificar:
- Logs de sync aparecem no painel
- Dados de energia novos são inseridos (sem duplicatas)
- Sem erro de rate limit

### Arquivos a Alterar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/_shared/adapters/apsystems.ts` | Fixar timestamp do summary para `T12:00:00Z` |
| `supabase/functions/solar-collector/index.ts` | Refatorar `syncAPsystemsOptimized` para 1 única chamada de summary |
| Migração SQL | Limpar duplicatas existentes |

