# Plano de Correções e Melhorias — QA Agility Labs

> Base: **Relatório de Quality Assurance - Agility Labs** (Wendel Novaes, 29/05/2026)
> Ambiente avaliado: QA — `https://qa.dev.platform.agilitylabs.com.br/`
> Documento de planejamento — atualizado em 05/06/2026

---

## 1. Visão Geral

O relatório avaliou **15 módulos** da plataforma (>50 pontos de verificação). A plataforma tem base sólida (design system consistente, navegação fluida, proteções de permissão bem feitas), mas foram identificados **7 bugs** e um conjunto grande de **melhorias funcionais** — várias delas bloqueiam a operação real de roteirização.

**Repositórios envolvidos** (a confirmar onde cada item vive):
- `agility-frontend-platform` — web (dashboard, roteirização, monitoramento, configs)
- `agility-frontend-app` / `lab-app` — app do motorista/técnico
- `agility-services` — backend (status, capacidades de veículo, geocodificação, WebSocket)
- `agility-keycloak-themes` — tela de login
- `infra-config` — WebSocket / portas / certificados (BUG crítico)

---

## 2. Bugs — por severidade

| ID | Módulo | Descrição | Sev. | Camada provável | Status |
|----|--------|-----------|------|-----------------|--------|
| BUG-002 | Chat | WebSocket não conecta — "Conexão perdida" permanente; lista de conversas em loading infinito | 🔴 Alta | infra + frontend | Aberto |
| BUG-001 | Login | Sem feedback claro ao errar credenciais (mensagem some / pouco visível) | 🟡 Média | keycloak-themes | Aberto |
| BUG-003 | Monitoramento | Filtro de Status em inglês (Draft, Optimized, Pending assignment...) | 🟡 Média | frontend (i18n) | Aberto |
| BUG-004 | Config. Empresa | Labels sem acento: "Informacoes", "Otimizacao", "Max. roteirizacoes/dia", "Max. servicos/roteirizacao" | 🟡 Média | frontend (i18n) | Aberto |
| BUG-005 | Config. Integrações | "integracao" sem acento no subtítulo | 🟢 Baixa | frontend (i18n) | Aberto |
| BUG-006 | Config. Perfil | Campo CPF mostra `000.000.000-00` como valor real (deveria ser placeholder/máscara) | 🟢 Baixa | frontend | Aberto |
| BUG-007 | Usuários | Botão "Delete" em inglês (deveria ser "Excluir") | 🟢 Baixa | frontend (i18n) | Aberto |

### Detalhamento dos bugs

**BUG-002 — WebSocket do Chat (CRÍTICO)**
- Sintoma: "Conexão perdida" + botão "Reconectar"; spinner infinito na lista de conversas. Mesmo indicador "Conectando..." aparece em Monitoramento e Monitoramento de Serviços.
- Investigar: URL do WS no frontend (`wss://`), portas no firewall do QA, certificado SSL/TLS, CORS, e roteamento do ingress.
- ⚠️ Verificar config em `infra-config` e a env de URL do WS no frontend (`src/config/urls.ts` já está modificado no working tree — checar).
- Ação: validar handshake do WS em QA ponta a ponta antes de fechar.

**BUG-003 / BUG-005 / BUG-004 / BUG-007 — Internacionalização (i18n)**
- Tradução de status (ver tabela canônica abaixo) + acentuação de labels + botão "Delete".
- Recomendação do relatório: varredura **completa** de i18n na plataforma (não só os pontos achados).

**Tabela canônica de status (PT-BR):**

| Status (EN) | Tradução (PT-BR) |
|-------------|------------------|
| Draft | Rascunho |
| Optimized | Otimizada |
| Pending assignment | Pendente de atribuição |
| Assigned | Atribuída |
| In progress | Em execução |
| Completed | Concluída |
| Cancelled | Cancelada |

**BUG-001 — Feedback de login**
- Mensagem de erro destacada (fundo/borda vermelha) abaixo dos campos: "E-mail ou senha incorretos. Tente novamente."
- Sugestão extra: bloqueio temporário após 5 tentativas (anti brute-force) — configurável no Keycloak.

**BUG-006 — CPF placeholder**
- Limpar valor padrão; aplicar máscara que só aparece ao digitar.

---

## 3. Melhorias por módulo

### 3.1 Dashboard
- [ ] **Filtro de período** (dia atual por padrão, auto-refresh 5min; presets: ontem, 7d, mês, semestre; range custom).
- [ ] Evoluir de métricas de volume → **performance**: OTD/SLA, Planejado x Realizado, Curva de Execução (S&OE), Zonamento (MESO/MICRO).
- [ ] Novos indicadores (nesta ordem): Total de Rotas (só planejadas aguardando início), Rotas em Andamento, **Rotas Atrasadas** (não iniciadas no horário), Rotas Concluídas, Total de Serviços, Serviços Concluídos, Serviços Cancelados, Tempo de Atendimento Médio.
- [ ] Gráficos de rosca: Planejado x Realizado; tipos de atividade; motivos de não realização.
- [ ] Mapa: opção de ver todas as regiões cadastradas + botão **tela cheia** (TVs/monitores).

### 3.2 Pedidos
- [ ] **Filtros**: ID, Data, Regiões, Tipo, Nome do Cliente.
- [ ] **Seleção entre páginas** + seletor de linhas por página (10/20/50/100) — aplicar em **todos os menus com tabela**.
- [ ] Modal criar pedido — aba Endereço: **geocodificação automática** + posicionamento manual no mapa em fallback.
- [ ] Aba Carga: remover dimensões (Alt x Larg x Comp); manter só **Peso (kg)** e **Volume (m³)**.
- [ ] **BUG funcional**: edição de pedido não salva ao fechar — corrigir persistência.
- [ ] Peso/Volume devem aceitar **só decimais**.
- [ ] **Totalizador** no rodapé: nº de serviços selecionados, Peso Total, Volume Total (m³).

### 3.3 Embarcador (Serviços)
- [ ] Renomear título para **"Embarcar Serviços"** (hoje "Embarcar Pedidos").
- [ ] Adicionar botão **Roteirizar** os serviços selecionados.
- [ ] Aba "Materiais/Oferta": campos numéricos aceitando texto — corrigir; reduzir nomenclaturas em inglês.
- [ ] Campo/filtro de **Grau de Urgência** (ligado à aba Níveis de Urgência das Configs).
- [ ] Mesmos filtros de Pedidos (ID, Cliente, Data, Regiões, Tipo).

### 3.4 Roteirização — Nova (3 etapas)
**Etapa 1 — Serviços**
- [ ] Filtros na seleção; mais colunas (Nome, Tipo, Endereço, Data Prevista, Tempo de atendimento, Peso, Volume).
- [ ] Botão **editar pedido/serviço inline** (sem sair da tela).
- [ ] Sinalização de serviços **atrasados / a replanejar** (retornaram da execução).

**Etapa 2 — Veículos/Motoristas**
- [ ] Permitir atribuir **motorista E veículo** (ambos opcionais).
- [ ] Mais infos na tabela de veículos: placa, modelo, Peso Suportado, mínimo de pedidos, cubagem máxima.

**Etapa 3 — Configurações**
- [ ] Hora de início (data+hora), base inicial (partida), final da rota (conclusão), exigir/não marcação na sequência.

### 3.5 Roteirização — Lista
- [ ] **Filtros**: data, ID, Nome, Status.
- [ ] Visualizar com mais infos: Veículo, Peso total, Volume, prévia do mapa.
- [ ] Ações: **enviar rota p/ app**, **reabrir planejamento**, **gerar romaneio** (Motorista, Veículo, data/hora, nome da rota, serviços, previsão de chegada, endereço).

### 3.6 Agrupamentos (Regiões) — vários bugs
- [ ] **BUG**: regiões não persistem (somem ao atualizar a página).
- [ ] Selecionar quais regiões exibir no mapa.
- [ ] Ao desenhar polígono novo, mapa centraliza em local genérico — centralizar na região demarcada.
- [ ] Editar região clicando na lista (hoje só clicando no mapa).
- [ ] **Editar polígono** já cadastrado.
- [ ] Filtro de busca na lista; cadastro em tela cheia; **exclusão funcionando**.
- [ ] Restrição de horário **por dia da semana** (ex.: Seg 08–18, Dom 08–12).

### 3.7 Monitoramento de Serviços
- [ ] Mapa com 2 funções: novas solicitações + visualizar rota despachada/agendada (tooltip por alfinete).
- [ ] Mais colunas + filtros (Cliente, Tipo, Data Prevista, Grau de Urgência, Endereço).
- [ ] **Laço** de seleção no mapa, com contagem e soma de duração prevista.
- [ ] Botão Roteirizar → encaminha p/ planejamento já com serviços selecionados.

### 3.8 Monitoramento
- [ ] **BUG-003** (status em inglês) — ver tabela i18n.
- [ ] Opção de exibir regiões cadastradas no mapa (sem permitir cadastro aqui).
- [ ] Botão **tela cheia** (TVs/monitores).
- [ ] Atividades recentes: mostrar **nome da rota** dado pelo usuário; eventos de início/fim, serviços/clientes atendidos/cancelados com horário.
- [ ] Header: trocar "valor total de mercadoria" por **custo da rota** (custo fixo + R$/km do cadastro de Frotas).

### 3.9 Frotas (Veículos) — campos para roteirização
- [ ] Adicionar: Capacidade de Peso (kg), Capacidade de Volume (m³), Custo Fixo por Utilização (R$), Custo por Km (R$/km), Mínimo de Pedidos, Velocidade Média (km/h), Restrições de Região.
- [ ] Indicador visual de disponibilidade (em rota / disponível / manutenção).
- ⚠️ Relacionado ao arquivo aberto no IDE: `vehicle-type-template.entity.ts` (agility-services) — alinhar modelo de capacidade. Ver memória [[vehicle-capacity-model]].

### 3.10 Clientes
- [ ] **Geocodificação automática** do endereço.
- [ ] **Janela de Atendimento** (dias + horários).
- [ ] **Tempo Médio de Atendimento** por cliente.
- [ ] Histórico de atendimentos (entregas, ocorrências, cancelamentos).

### 3.11 Relatórios
- KPIs novos: Taxa de Realização (%), Taxa de Cancelamento (%), Custo Total por Rota, Custo por Entrega, Tempo Médio de Atendimento, Motivos de Não Realização (gráfico), Planejado x Realizado.
- (Módulo bem avaliado — melhorias incrementais.)

### 3.12 Financeiro
- [ ] Integração automática com roteirização: ao concluir rota, gerar registro financeiro (custo fixo + km × distância).
- [ ] Dashboard financeiro mensal (total pago a motoristas, custo/rota, custo/entrega, comparativo mês a mês).
- [ ] Aba Motoristas: extrato individual (rotas, valores, adiantamentos, saldo).

### 3.13 Chat (após corrigir WS)
- [ ] Mensagens pré-definidas (templates).
- [ ] Histórico pesquisável.
- [ ] Envio de fotos/documentos (comprovantes, avarias).

### 3.14 Protocolos
- [ ] Botão "+ Novo Protocolo" sempre visível.
- [ ] Integração com Monitoramento/Roteirização (gerar protocolo automático em ocorrências do motorista).
- [ ] Categorização (tipo, prioridade, SLA) + dashboard de métricas.

### 3.15 Usuários / Perfis
- [ ] **BUG-007**: "Delete" → "Excluir".
- [ ] Roles granulares (módulos/ações por tipo de usuário).
- [ ] Log de atividades por usuário (auditoria).
- [ ] Campo "Cargo" obrigatório.

### 3.16 Configurações
- [ ] **BUG-004 / BUG-005 / BUG-006** (acentuação + CPF).
- [ ] Jornada de trabalho alimentar alerta de planejamento fora de horário.
- [ ] Documentação inline das chaves de API.
- [ ] Níveis de Urgência integrados aos filtros de Pedidos/Embarcador/Roteirização.

---

## 4. Priorização sugerida (sprints)

### 🔴 Sprint 1 — Bloqueadores e ganhos rápidos
1. **BUG-002** WebSocket do Chat (crítico — também afeta indicadores de Monitoramento).
2. **i18n completo** (BUG-003/004/005/007) — varredura geral, baixo esforço, alto impacto de percepção.
3. **BUG-001** feedback de login.
4. **BUG-006** CPF placeholder.
5. **Agrupamentos**: persistência de regiões (bug que inviabiliza o cadastro).
6. **Pedidos**: salvar edição (bug funcional).

### 🟡 Sprint 2 — Operação de roteirização
1. Filtros + paginação configurável (Pedidos, Embarcador, Roteirização, Monitoramento).
2. Frotas: campos de capacidade/custo + indicador de disponibilidade.
3. Roteirização Nova (etapas 1–3): colunas, edição inline, motorista+veículo, base/hora.
4. Clientes: geocodificação + janela de atendimento + tempo médio.
5. Embarcador: título, botão Roteirizar, Níveis de Urgência.

### 🟢 Sprint 3 — Inteligência gerencial
1. Dashboard: filtros de período + KPIs de performance + gráficos.
2. Relatórios: novos KPIs.
3. Financeiro: integração automática de custos + dashboard.
4. Roteirização Lista: romaneio, reabrir, enviar p/ app, prévia.
5. Protocolos: integração + categorização.
6. Monitoramento: tela cheia + regiões + atividades nomeadas.

---

## 5. Dependências entre itens

- **Frotas (capacidade/custo)** → habilita: previsibilidade na Etapa 2 da roteirização, custo de rota no Monitoramento/Header, integração Financeira automática, KPIs de custo nos Relatórios.
- **Geocodificação** (Pedidos + Clientes) → precisão das rotas; serviço compartilhado no backend.
- **Níveis de Urgência** (Config) → filtros em Pedidos/Embarcador/Roteirização/Monitoramento de Serviços.
- **Regiões/Agrupamentos** (persistência + edição) → filtros por região e exibição em mapas (Dashboard/Monitoramento).
- **WebSocket** → Chat + indicadores tempo real em Monitoramento(s).

---

## 6. Automação de testes sugerida (CI/CD — Cypress/Playwright)

| Prioridade | Caso |
|-----------|------|
| Alta | Login OK + validação token JWT |
| Alta | Login falho + mensagem de erro |
| Alta | Health check WebSocket (Chat + Monitoramento) |
| Alta | CRUD completo de Veículos |
| Média | CRUD completo de Clientes |
| Média | Fluxo Nova Roteirização (3 etapas) |
| Média | Exportação CSV de Relatórios |
| Média | Filtros do Monitoramento |
| Baixa | Smoke test de navegação entre módulos |
| Baixa | Responsividade em várias resoluções |

---

## 7. Próximos passos

1. [ ] Confirmar **em qual repositório** vive cada item (platform / app / services / keycloak / infra).
2. [ ] Abrir issues/tickets a partir deste doc (1 por bug + épicos por módulo).
3. [ ] Validar **BUG-002** em QA (infra) antes de qualquer coisa.
4. [ ] Definir responsáveis e estimativas por sprint.
5. [ ] Configurar o pipeline de testes automatizados (seção 6).
