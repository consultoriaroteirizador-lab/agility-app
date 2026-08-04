# Apresentação comercial do ecossistema Agility

Data: 2026-07-29
Status: aprovado para implementação

## Objetivo

Material comercial que mostra a cobertura funcional do ecossistema Agility para
transportadoras, embarcadores e operações logísticas. Visão macro do produto,
com detalhe fino apenas nos diferenciais de venda.

## Público e tom

Cliente/prospect comercial. Linguagem de operação, não de engenharia: fala de
dor e ganho operacional, evita sigla técnica. Português do Brasil.

## Escopo

Dois formatos, mesmo conteúdo e mesma identidade:

1. **Deck** — slides navegáveis por seta, teclado e swipe, com barra de
   progresso e contador. Para apresentar ao vivo.
2. **One-page** — página única com rolagem, hero, grade de módulos e o mesmo
   diagrama de fluxo. Para deixar com o cliente.

Ambos em HTML auto-contido, publicados como Artifact.

Fora de escopo: preços, planos e ciclo de cobrança. O modelo modular aparece
como conceito ("ative o que a operação precisa"), sem valores.

## Identidade visual

Herdada do produto:

- Primária `#6D28D9`, clara `#8B5CF6`, escura `#5A21B5`
- Accent `#ff7a59`
- Deck em fundo escuro com gradiente roxo; one-page em fundo claro

## Estrutura (15 telas)

1. Capa
2. O problema — planilha, telefone e cliente no escuro
3. O ecossistema — Portal web, App do motorista, API de integração
4. Fluxo ponta a ponta — Pedido → Planejamento → Roteirização → Distribuição →
   Execução → Comprovação → Análise
5. Pedidos — importação em planilha, campos personalizados, agendamento,
   recorrência, etiquetas, filtros salvos, níveis de urgência
6. Modo Embarcador — portal próprio do embarcador: acompanha os próprios
   pedidos, cria serviço, envia para roteirização, exporta; e a gestão de
   embarcadores do lado da transportadora
7. Roteirização — perfis Last Mile, Field Service e Pickup & Delivery;
   otimização interna e avançada; restrições de janela, capacidade e cubagem,
   habilidade, zonas e rodízio; modelos salvos; cross-docking multi-trecho
8. Distribuição do trabalho — atribuição direta, **oferta de rota** a
   motoristas, terceirizados, ajudantes, agrupamentos
9. App do motorista — rotas e navegação, coleta e entrega, comprovantes,
   formulários e checklist, códigos de confirmação, ocorrências, jornada,
   carteira e ganhos, chat, avaliações
10. Monitoramento ao vivo — mapa em tempo real, telemetria do veículo, presença
    do motorista, ETA, finalização pelo operador com motivo, protocolos
11. **Replay de rota** — reconstrução do trajeto executado com linha do tempo e
    painel de estatísticas, para auditar o que aconteceu
12. Cliente final — rastreamento público por link, avaliação pública,
    notificações
13. Gestão e governança — frotas, manutenção, centros de distribuição, filiais,
    usuários por setor e cargo, trilha de auditoria de intervenções
14. Inteligência — indicadores e gráficos, relatórios, financeiro e carteira,
    ESG com emissão de CO₂
15. Integrações e fechamento — API do integrador, SSO, notificação push,
    isolamento por empresa; encerramento com a mensagem modular

## Decisões do cliente incorporadas

- **"Leilão" não é usado.** O termo em todo o material é **oferta de rota**.
- **Enterprise sai dos perfis de roteirização.** Era a junção dos outros três e
  não deve mais ser apresentado como perfil.
- **Modo Embarcador vira tela própria**, separada de Pedidos.
- **Replay de rota** entra como tela própria dentro do bloco de monitoramento.

## Base factual

Levantamento nos três repositórios:

- `agility-services` — 60+ módulos; catálogo em `src/modules/module-catalog.ts`;
  API do integrador com 14 recursos em `src/integrator/controllers/`;
  rastreamento e avaliação públicos, formulários, carteira, recorrência, zonas,
  restrições, ESG, financeiro, telemetria, notificação, custódia
- `agility-frontend-platform` — ~30 áreas no menu lateral; replay em
  `src/app/monitoring/components/ReplayTimeline.tsx` e `ReplayStatsPanel.tsx`;
  portal do embarcador em `src/app/shipper/`
- `lab-app` — abas de rotas, ofertas e menu; domínios de jornada, carteira,
  avaliação, formulário, protocolo, chat, rastreamento e ocorrências

Regra: nada entra na apresentação sem existir no código.

## Critério de sucesso

Um vendedor abre o material e consegue percorrer a operação inteira do cliente
sem abrir o sistema, e todo recurso citado existe de fato.
