# Homologação e evidências da entrega

## Verificado neste trabalho

- Fonte, rotas, regras documentadas, funções e migrações inspecionadas.
- Consulta ao esquema: 15 tabelas públicas com RLS e dois buckets privados.
- Histórico: 28 versões aplicadas e 28 arquivos locais; divergências de timestamp documentadas.
- Agenda consultada: apenas check-generation-alerts ativo; kill switch permanece false.
- Scan novo de dependências com avisos documentados; sem atualizações feitas.
- Pacote sem .env real, Git, node_modules, dist, sessões ou dados de produção; ZIP e manifesto inspecionados.

## Não verificado

Não houve nova instalação, restauração, login no destino, validação publicada de JWT/OAuth, importação OCR real, coleta com fabricantes nem homologação de relatório na réplica. SQL concatenado é para revisão, não migração comprovadamente reproduzida. Arquivos preservados não implicam que funções atualmente publicadas correspondam byte a byte à fonte.

## Roteiro obrigatório no destino

1. Instalar pelo lockfile selecionado; executar testes existentes, build e análise de dependências; tratar falhas reais.
2. Em backend separado, revisar bootstrap e confirmar todas as colunas, constraints, triggers e políticas com schema-inventory.
3. Criar duas organizações e usuários admin/gestor/operador em cada uma. Confirmar tenant e role lidos de fonte protegida.
4. Usuário A não lê, altera ou apaga dados/arquivos de B, inclusive por ID conhecido; testar cada tabela e função, não só menus.
5. Visitante não abre painel; verificar login, confirmação, recuperação, OAuth configurado, refresh e logout. Token inválido deve falhar.
6. Criar local e usina; associar, editar campos manuais, sincronizar e confirmar ausência de sobrescrita indevida. Admin exclui usina, Gestor não.
7. Importar energia com ICMS-CDE R$55,46; conferir itens e a fórmula bruto=líquido+deduções na revisão, persistência e PDF/Excel. Importar Compesa; editar valores e reler pela tela.
8. Mesma UC com duas competências distintas e vencimento no mesmo mês: duas linhas; alternar competência/vencimento e comparar exports/totais com filtros. Testar janeiro→dezembro do ano anterior, mês inválido e vencimento ausente.
9. Reimportação de mesma conta/competência deve avisar/falhar sem criar segunda linha. Testar corrida de duas importações e conta equivalente em tenants distintos conforme política aprovada.
10. Geração com mais de 1000 registros deve carregar série integral pelo hook; MCP limitado não é prova desse teste. Conferir zeros em cada caminho.
11. Coleta de cada fabricante com credenciais novas; observar sync_logs, limites, falhas e datas. Agendador inválido deve ser recusado.
12. Relatório semestral: valores independentes de conferência, todas as usinas, comissão, checklist, economia, rateio e assinaturas. Abrir Word no aplicativo de destino e confirmar formato real.
13. Testar mobile e desktop: filtros legíveis, abas horizontais, tabelas/exportações acessíveis, sem elementos sobrepostos.
14. Fazer ensaio de recuperação isolado com exportação oficial e arquivos separados, sem tocar produção. Documentar resultado e responsáveis.

## Aprovação

Não publicar até resolver pendências de autorização e dependências, e registrar resultados reais dos testes acima. Falha de acesso cruzado exige correção de toda a categoria de endpoint, não apenas ocultação de botão.
