# PRD — UtiliHub

## Problema e objetivo

Organizações com várias unidades consumidoras precisam conciliar geração solar, consumo de energia e água, faturas e evidências administrativas. Centralizar indicadores, importações e relatórios, mantendo isolamento por organização.

## Público e perfis

Administrador: administração do próprio tenant, incluindo usuários e exclusão de usinas. Gestor: infraestrutura, faturas, integrações, relatórios e auditoria; gestão de usuários permanece restrita ao administrador no código atual. Operador: consulta e operação de faturas; sem gestão de infraestrutura. A matriz efetivamente aplicada deve ser homologada no banco e nas funções, não apenas pelo menu.

## Escopo funcional e aceitação

| Módulo | Requisitos | Aceitação no destino |
|---|---|---|
| Acesso | Login, cadastro, recuperação de senha, sessão e saída | Visitante não abre `/dashboard`; usuário entra e sai sem acesso ao tenant alheio |
| Dashboard | Mapa, geração/consumo, faturas de energia e água, filtros e séries históricas | Totais conciliam com registros filtrados; mapa enquadra usinas |
| Geração | Cadastro/edição de usinas, dispositivos, estados e detalhe temporal | Capacidade kWp, fabricante e integrador preservados corretamente |
| Importação | Energia Neoenergia, água Compesa, geração PDF e planilha | Revisão de OCR antes de persistir; correções manuais; unicidade verificada |
| Consumo | Imóveis, energia, água, filtros e ordenação | Troca competência/vencimento muda período sem agrupar ou apagar faturas |
| Exportações | PDF, Excel e Word conforme módulo | Linhas, critérios, competência, vencimento e totais coerentes com a tela |
| Relatórios | Semestral CGE-PE/Portaria nº 11/2026, análise energética, comissão e checklist | Todas as usinas relevantes presentes; cálculos e assinaturas conferidos |
| Gestão | Integrações, localidades, vínculos, usuários, API e logs | Ações administrativas respeitam role e tenant |
| Automação | Adaptadores Growatt, Hoymiles, APSystems, Fronius e SolarEdge | Coleta homologada com credenciais novas e limites do fabricante |
| MCP | Consultas e importação via ferramentas HTTP | Chave obrigatória e escopo do tenant verificados antes de habilitar |

## Jornada principal

Entrar → cadastrar localidades/usinas → vincular usinas → configurar fabricante → importar faturas → revisar valores/datas → consultar por competência ou vencimento → exportar detalhamento → produzir relatório semestral.

## Requisitos não funcionais

React 18, TypeScript, Vite, Tailwind e tokens semânticos; pt-BR; visual glassmorphism, temas claro/escuro; mobile com abas horizontais, grids de dois itens e formulários em largura completa. Não implementar PWA. Paginar consultas de geração acima de 1000 linhas. Controle de acesso em servidor e RLS. Segredos fora de código, navegador, logs e repositório.

## Fora do pacote / dependências

Dados reais, PDFs originais, configuração de provedores de login, e-mail, domínio e chaves precisam de configuração ou exportação separada. IA e APIs de fabricantes exigem disponibilidade, acesso e eventual cobrança. Alertas automáticos continuam suspensos. O modelo jurídico do relatório não substitui revisão da comissão.

## Indicadores sugeridos (sem metas inventadas)

Tempo de importação, taxa de correção do OCR, conciliação entre faturas e exportações, sucesso de coleta por fabricante e negativas de acesso cruzado entre tenants. Medir após homologação.
