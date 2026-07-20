# Redesign do card da lista de roteirização (RouteItem)

Data: 2026-07-20

## Problema

A tela principal (`src/app/(auth)/(tabs)/index.tsx`) lista as rotas do motorista via
`FlatList` de `RouteItem`. O card atual tem dois problemas:

1. **Nome truncado ("pela metade")** — nome e pill de preço dividem a mesma linha;
   a pill não encolhe (`flexShrink:0`) e o nome tem `numberOfLines={1}`, então
   qualquer nome longo é cortado.
2. **Informação insuficiente** — o card ignora dados que o backend já envia em
   `RoutingResponse`: `date` (quando é a rota), `startedAt`, `hasReturn`, e os campos
   de cross-docking (`legType`, `origin/destinationFacilityName`).

Além disso há bugs de formatação: duração em horas inteiras (`Math.round(min/60)` →
rota de 25 min vira "0 h") e distância sem formatação (pode vir "12.7333 km").

## Escopo

Reescrever o card `RouteItem` e corrigir a formatação. Fora de escopo: query,
ordenação/filtro (`useRoutesScreen`) e o toggle de disponibilidade.

## Decisões (validadas com o usuário)

- **Data**: relativa + hora ("Hoje, 14:30" / "Amanhã, 08:00" / "Sex, 22/07 · 09:00"),
  via `date-fns` + locale ptBR, a partir do campo `date`.
- **Linha de local**: NÃO usar `originAddress`. Vira indicador de **retorno**
  (⟲ "ida e volta" quando `hasReturn`, senão nada). Nº de paradas fica na linha de
  métricas para não duplicar.
- **Valor (R$)**: esconder a pill quando `totalValue` é 0/null.
- **IN_PROGRESS**: destacar com **faixa lateral colorida** + borda tingida; status
  mostra "Iniciada há X min" (relativo, via `startedAt`).
- **Ação**: card inteiro clicável + **chevron** (`chevron-right`). Sem botão explícito.
- **Cross-docking**: quando `legType` presente, badge "Transferência"/"Last-mile" +
  linha "CD origem → CD destino" (`origin/destinationFacilityName`). Some em rota comum.
- **Métrica de transferência**: num trecho `legType === 'TRANSFER'`, `totalServices`
  é 0 (não há paradas de entrega). Em vez de "0 paradas" — que passa a sensação de
  não parar em lugar nenhum, quando na verdade ele para no CD destino — mostra
  **"N pedidos"** (ícone `inventory-2`) usando o novo campo `transferOrdersCount`.
  Last-mile mantém "N paradas". **Dependência de backend**: `transferOrdersCount`
  precisa ser incluído no payload leve de `GET /routings` (agility-services) para os
  trechos de transferência; enquanto não vier, o card mostra "0 pedidos".
- **Status/cores**: alinhar ao `StatusColorConfig` do theme (mesmo padrão do
  `src/components/RotaCard/RotaCard.tsx`), em vez do `getStatusColor` ad-hoc.
- **Ícones**: `MaterialIcons` via componente `Icon` (não emoji).

## Layout

```
┌─┬───────────────────────────────────────────────┐
│▍│ Entrega Zona Sul — Lote 42        [Transferência]│  faixa lateral = cor do status
│▍│ 🗓  Hoje, 14:30                                  │  ← date
│▍│ 🏭  CD Central → CD Zona Sul                     │  ← só cross-dock
│▍│ ┌─────────────────────────────────────────────┐ │
│▍│ │ 🚏 8 paradas    🛣 12,7 km    ⏱ 1h20        │ │
│▍│ └─────────────────────────────────────────────┘ │
│▍│ ● Iniciada há 25 min    ⟲ ida e volta  R$ 1.234,00 › │
└─┴───────────────────────────────────────────────┘
```

- Nome: `numberOfLines={2}`, linha inteira. Badge de tipo (Serviço/Produto) ou leg
  (Transferência/Last-mile) no canto superior direito.
- Faixa lateral: `Box` fino colorido com a cor do status à esquerda do conteúdo.

## Componentes

- `src/app/(auth)/(tabs)/_rotas/components/RouteItem.tsx` — reescrita do layout.
- `src/app/(auth)/(tabs)/_rotas/utils/format.ts` (novo):
  - `formatRouteDate(date)` → data relativa + hora (date-fns/ptBR).
  - `formatRelativeSince(date)` → "há 25 min" para `startedAt`.
  - `formatDuration(min)` → "45 min" / "1h20".
  - `formatDistance(km)` → "12,7 km".
  - `formatCurrency(v)` → "R$ 1.234,00" (null quando 0/null → esconde pill).
- `src/app/(auth)/(tabs)/_rotas/components/RoutesHeader.tsx` — condensar (imagem
  menor + margens) para caber mais card na primeira dobra.

## Testes / verificação

- `RouteItem` é UI pura sem estado; validação principal via typecheck + lint e revisão
  visual das variações (com/sem valor, ASSIGNED vs IN_PROGRESS, comum vs cross-dock).
- Utils de formatação são funções puras — cobrir casos de borda (0, null, <60 min,
  data hoje/amanhã/futura) se houver setup de teste no projeto.
