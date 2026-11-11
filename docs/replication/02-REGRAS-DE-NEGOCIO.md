# Regras de negócio — consolidação atual

Prevalece esta consolidação para a réplica; os documentos históricos estão em `historical/` e têm afirmações desatualizadas.

## Organização e acesso

- Cada usuário tem perfil ligado a tenant e roles em `public.user_roles`, nunca determinadas por metadados editáveis do usuário.
- Plantas, faturas, integrações e localidades usam tenant direto; dispositivos, energia, alertas e vínculos herdam acesso por relações. Não afirmar que todas as tabelas têm coluna tenant_id.
- Admin administra seu tenant; Gestor opera infraestrutura e relatórios, sem exclusão de usinas e sem gestão de usuários pela função atual; Operador consulta e opera faturas.
- `/` redireciona usuários autenticados para `/dashboard`. Links internos usam `/dashboard/`. Abas de gestão usam `?tab=`.
- Cadastro cria perfil no tenant `default` e role Operador via trigger. Não é onboarding automático seguro de várias organizações. Administrador inicial exige provisionamento controlado no novo ambiente.
- Confirmação de e-mail, login social e cadastro anônimo são configurações do serviço: não foram verificadas ao vivo. O convite administrativo atual usa confirmação automática; revisar esse fluxo.

## Usinas e localidades

- Capacidade em kWp é baseline das previsões. Estados: online, offline, warning e maintenance.
- Integrador é manual; fabricante decorre da integração/dispositivos. Preservar campos manuais nas sincronizações.
- Localidades mapeiam conta/código do cliente de energia e matrícula de água para um nome.
- Uma localidade aceita várias usinas. Interface retira uma usina já vinculada das opções de outras localidades.
- Banco garante apenas unicidade do par location_id/plant_id; exclusividade de plant_id entre localidades não é constraint atual.

## Faturas de energia

- Extrair concessionária, conta, código do cliente, NF, endereço, competência, vencimento, consumo kWh, geração, demanda/tarifa, valores, iluminação e QD.
- Regra obrigatória: `gross_value = net_value + deductions_value`; deduções armazenadas como magnitude positiva.
- ICMS-CDE é item positivo e não pode desaparecer da apuração. Iluminação tem campo separado; homologar a composição com o total efetivo da fatura, sem somá-la duas vezes.
- Não duplicar consumo TUSD/TE do mesmo posto; em tarifa horossazonal somar kWh ponta e fora ponta uma vez.
- OCR não é fonte infalível: datas, NF, UC e valores devem ser revisáveis. Competência inválida como `0/2026` não representa novo ciclo legítimo.
- Constraint atual: UNIQUE(account_number, reference_month), sem tenant_id. Nulos e grafias distintas podem escapar e a regra pode conflitar entre tenants com mesmo número. Documentar, não corrigir silenciosamente na réplica.

## Faturas de água

Compesa: matrícula, consumo m³, água, esgoto, bruto, deduções, total, vencimento e histórico. Edição manual prevalece. UNIQUE(account_number, reference_month) também é global. Não aplicar automaticamente a fórmula de energia a todos os campos de água sem conferir conta e implementação.

## Competência versus vencimento

- Competência usa `reference_month` em MM/YYYY; vencimento usa `due_date` em YYYY-MM-DD.
- Energia e água possuem modos e filtros independentes. Padrão é competência, mês anterior e o ano desse mês (janeiro aponta para dezembro do ano anterior).
- Duas competências da mesma UC com vencimento no mesmo mês aparecem como duas faturas legítimas; não deduplicar por vencimento.
- Exportar o detalhamento de cada fatura, ambas as datas, critério escolhido e totais dos registros filtrados.
- Sem vencimento, a linha não satisfaz mês/ano específico do modo vencimento; conferir comportamento ao selecionar todos.
- Ordenação padrão por local A–Z; no modo vencimento a exportação pode ordenar por data. Preservar os comportamentos do código e homologar coerência.

## Geração, coleta e alertas

- Adaptadores normalizam dados dos cinco fabricantes; APSystems usa abordagem resumida/otimizada para reduzir chamadas.
- Persistência atual evita registros com geração e consumo simultaneamente zero; revisar cada caminho de importação, que possui condições próprias. Documentação antiga sobre zero exclusivamente noturno não descreve todos os caminhos.
- Consultas de geração paginam por range; MCP tem limite de até 1000 e não equivale a exportação integral.
- Agenda desejada histórica: a cada hora 07–18 BRT (10–21 UTC). Consulta atual encontrou somente cron de alertas às 5,20,35,50 de cada hora; a coleta horária não foi confirmada como ativa.
- `check-generation-alerts` permanece com ALERT_MONITORING_ENABLED=false; inclusive chamada manual recebe resposta suspended. Não reativar automaticamente.

## Relatórios, auditoria e arquivos

- Semestral usa ano, semestre, capacidade, horas solares e tarifa (padrão documentado R$1,00/kWh). Economia = geração × tarifa; premissas da previsão são estimativas, não garantias.
- Comissão, checklist e análise assistida por IA; texto PDF justificado e assinaturas de presidente/vice. Configurações locais do navegador não migram junto com banco.
- Excel usa xlsx-js-style; Word atual usa conteúdo HTML com nome/extensão de Word: não garantir OOXML DOCX nativo.
- Auditoria é gravada por chamadas da aplicação; não há prova de cobertura automática e imutável de toda escrita externa.
- PDFs em buckets privados energy-bills/water-bills. Caminho começa com tenant_id e nome sanitizado. URLs assinadas quando necessário.
- Apenas esses dois buckets foram confirmados: não presumir bucket público de logos.
- Datas dd/MM/yyyy, moeda BRL com duas casas, decimal vírgula; capacidade kWp, potência kW, energia kWh, água m³.
