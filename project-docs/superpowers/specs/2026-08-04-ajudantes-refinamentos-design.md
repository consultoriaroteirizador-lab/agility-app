# Ajudantes: ícones, bloco recolhível e visibilidade na lista de rotas

**Data:** 2026-08-04
**Repos:** `agility-services` (backend) + `lab-app` (app do motorista)
**Status:** design aprovado, pendente plano de implementação
**Continuação de:** `2026-08-04-equipe-e-ajudantes-no-app-design.md` (PRs `agility-services#453` e `agility-app#28`)

## 1. Problema

A entrega anterior colocou os ajudantes da viagem no detalhe da rota, com contato. Três
refinamentos pedidos pelo cliente, todos com a mesma raiz — **o motorista decide antes de
começar, e a tela precisa caber no polegar**:

1. Os botões de contato são texto ("Ligar", "WhatsApp"). Deveriam ser ícones.
2. O bloco de ajudantes ocupa espaço permanente acima da lista de paradas. Deveria ser
   recolhível, **sempre nascendo fechado**.
3. O motorista só descobre quem vai com ele **depois** de abrir a rota. Deveria ver ainda na
   lista de rotas, antes de começar.

## 2. O que já existe (levantado, não presumido)

| Fato | Onde | Consequência |
| --- | --- | --- |
| `Ionicons` (`@expo/vector-icons`) já é o padrão do app, em 10 arquivos | `menu/carteira/*`, `menu/ganhos`, `menu/avaliacoes` | `call-outline` e `logo-whatsapp` saem de graça, sem asset novo |
| `GET /routings/my-routings` devolve `mapper.toResponse(routing)` | `routing.controller.ts:484-507` | **Não inclui `helpers`** — só o `GET /routings/:id` inclui |
| A lista de rotas do app consome `useFindMyRoutings()` | `_rotas/hooks/useRoutesScreen.ts:71` | É esse payload que precisa ganhar os ajudantes |
| `/routings/paginated` já enriquece o resultado em lote | `routing.controller.ts:315-330` (`assignees`, `badges`) | O padrão de "mapper + spread de mapas em lote" já existe; seguir |
| `RoutingResponse.helpers` já é opcional no app | `routing/dto/response/routing.response.ts` | Tipo não muda |

## 3. Decisões de design

### 3.1 O ícone substitui o texto na tela, não na acessibilidade

Os rótulos viram `Ionicons`, mas o texto migra para `accessibilityLabel` ("Ligar para Ana
Souza", "Abrir WhatsApp de Ana Souza"). Sem isso, um leitor de tela anuncia dois botões sem
nome — a troca ficaria visualmente melhor e funcionalmente pior.

A área de toque permanece em **44pt** mesmo com o ícone menor que o texto que ele substitui.
O alvo é o polegar de quem está num caminhão em movimento; encolher a área junto com o
desenho é o erro fácil desta mudança.

### 3.2 Um componente recolhível, usado nos dois lugares

O mesmo bloco aparece no detalhe da rota e no card da lista. É um componente só: o
`AjudantesDaRota` existente **sai** de
`src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/AjudantesDaRota.tsx` e vira
`src/components/AjudantesDaRota/`, exportado pelo barrel `@/components` — a única mudança
estrutural desta entrega. O arquivo antigo e sua entrada no `_components/index.ts` são
removidos; não fica cópia.

- **Fechado (estado inicial, sempre):** ícone de pessoas + "N ajudantes" + chevron.
- **Aberto:** as linhas de `PessoaContatoRow`.
- **Sem ajudante:** devolve `null` — nem cabeçalho, nem espaço, como já faz hoje.

O estado aberto/fechado é local (`useState`), **sem persistência**. Voltar para a tela
recomeça fechado: é literalmente o que "sempre abrir encolhido" pede, e persistir exigiria
decidir a chave (por rota? por sessão?) sem que ninguém tenha pedido isso.

### 3.3 A lista de rotas ganha os ajudantes em lote, não por rota

Buscar o detalhe de cada rota da lista seria N+1. O backend passa a devolver os ajudantes
junto com as rotas do motorista.

**Método novo:** `getRoutingHelpersByRoutingIds(ids: string[])` → `Map<routingId, helpers[]>`,
uma query para todas as rotas. O `getRoutingHelpers(id)` atual passa a delegar a ele — a
resolução de nome e telefone continua num lugar só, que é o que a entrega anterior acabou de
consertar. Reescrever a cascata aqui reabriria a duplicação recém-fechada.

**Onde entra:** o handler de `my-routings`, no mesmo padrão que `/paginated` já usa
(`...assignees.get(id)`, `...badges.get(id)`).

**Privacidade — este endpoint é mais estreito que o anterior, não mais largo.**
`my-routings` é `@Roles('COLLABORATOR_DRIVER')` e resolve o motorista pelo `sub` do JWT:
devolve **só as rotas dele**. O telefone circula num escopo menor que o do `GET /routings/:id`,
que qualquer `COLLABORATOR` consulta tendo um id de rota. Não abre superfície nova.

## 4. Escopo — backend (`agility-services`)

Uma PR, sem migration.

1. `getRoutingHelpersByRoutingIds(ids)` em `routing.service.ts`: uma query `findMany` com
   `routingId: { in: ids }`, agrupada num `Map`. Devolve **entrada vazia para rota sem
   ajudante** (o chamador não deve distinguir "não buscou" de "não tem").
2. `getRoutingHelpers(id)` delega ao método novo.
3. O handler de `my-routings` enriquece cada rota com `helpers`.

**Regressão a vigiar:** a lista vazia. Se o `Map` não tiver a chave e o handler fizer
`helpers: map.get(id)`, o campo vai `undefined` em vez de `[]` — e o app, que trata ausência
como "backend antigo", esconderia o bloco de rotas que **têm** ajudante. Usar `?? []`.

## 5. Escopo — app (`lab-app`)

1. **`PessoaContatoRow`**: ícones `call-outline` e `logo-whatsapp`, `accessibilityLabel`
   preservando o texto, alvo de toque 44pt.
2. **`AjudantesDaRota`** movido para `src/components/AjudantesDaRota/` e exportado pelo barrel;
   ganha `useState` local nascendo fechado. O detalhe da rota passa a importá-lo de
   `@/components`; o arquivo antigo e o export em `_components/index.ts` saem.
3. **`RouteItem`** (`_rotas/components/RouteItem.tsx`) renderiza o mesmo bloco, lendo
   `routing.helpers` do item da lista.

## 6. Fora de escopo

- Persistir o estado aberto/fechado.
- Ajudantes na tela de **ofertas** (`/routings/broadcasting`): antes de aceitar, a tripulação
  ainda não é dele. Se o cliente pedir, é outro endpoint e outra conversa.
- Qualquer escrita: o motorista vê e contata, não escala ninguém.

## 7. Ordem de entrega

Backend primeiro, **mas o risco é menor que o da entrega anterior**: sem o backend, `helpers`
vem ausente e o bloco apenas não aparece no card. Degradação limpa — não há mensagem falsa,
diferente do caso do `roster/me`, onde o app afirmaria que o motorista não tem equipe.

## 8. Testes

- **Backend:** unitário de `getRoutingHelpersByRoutingIds` cobrindo (a) várias rotas numa
  query só, (b) rota sem ajudante devolvendo lista vazia e não ausência, (c) `getRoutingHelpers`
  continuando a devolver o mesmo formato de antes (é o contrato que o `GET /routings/:id` já
  publica).
- **App:** o recolhível é orquestração de componente; o Jest do `lab-app` roda
  `testEnvironment: node`, sem jsdom, e não executa componente. Cobertura por roteiro manual,
  documentada no relatório da tarefa — mesma limitação já registrada na entrega anterior.
