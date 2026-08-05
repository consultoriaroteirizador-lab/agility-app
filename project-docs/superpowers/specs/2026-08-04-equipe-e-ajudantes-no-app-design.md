# Equipe e ajudantes no app do motorista

**Data:** 2026-08-04
**Repos:** `agility-services` (backend) + `lab-app` (app do motorista)
**Status:** design aprovado, pendente plano de implementação

## 1. Problema

O motorista não tem como saber **quem trabalha com ele**. Duas perguntas distintas, hoje
sem resposta no app:

1. *"Quem está comigo nesta viagem?"* — os ajudantes escalados pelo operador naquela rota
   (`routing_helpers`).
2. *"Qual é a minha equipe?"* — a equipe fixa de cadastro (`Team`/`TeamMember`), entregue
   pelas PRs #444/#445/#446 e sem nenhum consumidor no app.

O motorista precisa **ver e contatar** (ligar / WhatsApp) essas pessoas — decisão do
cliente, 04/08/2026.

## 2. O que já existe (levantado, não presumido)

| Fato | Onde | Consequência |
| --- | --- | --- |
| `GET /routings/:id` já devolve `helpers: [{ id, collaboratorId, providerId, helperName }]` | `routing.service.ts:511` e `:1627` | O app **já recebe** o dado e o descarta: `RoutingResponse` não declara o campo. Zero requisição nova. |
| `GET /teams/roster/:personId?date=` devolve `personName`, `role`, `skillIds` | `team.controller.ts:82` | Contrato do P2, pronto. Falta telefone. |
| `GET /drivers/me` devolve `personId` + `linkType` (funciona p/ terceirizado) | `driver-profile.service.ts` | Prova que a resolução "quem sou eu" já é um problema resolvido no backend. |
| Terceirizado recebe as roles `COLLABORATOR` **e** `COLLABORATOR_DRIVER` | `provider.service.ts:230` | Passa nos guards dos dois endpoints. Não é preciso afrouxar nada. |
| `Collaborator.phone` e `Provider.phone` existem | `schema.prisma:1068` / `:999` | **Sem migration.** |
| `RolesGuard` faz match exato, não por prefixo | `roles.guard.ts` | `@Roles('COLLABORATOR')` só passa porque o motorista tem literalmente essa role. |

## 3. Decisões de design

### 3.1 Telefone só no endpoint `me` — não no enumerável

`GET /teams/roster/:personId` é `@Roles('COLLABORATOR')` **sem checagem de dono**: qualquer
motorista logado pede o roster de qualquer pessoa da empresa, e terceirizado tem essa role.
Hoje isso devolve nome e habilidades. Acrescentar telefone ali transforma o endpoint num
catálogo de contatos da empresa.

**Decisão:** novo `GET /teams/roster/me`, que resolve a pessoa pelo `sub` do JWT. O telefone
sai **só** por ele. `:personId` permanece exatamente como está.

Ganho colateral: o app faz 1 chamada em vez de 2 (`/drivers/me` + `/teams/roster/:id`) e
nunca precisa carregar o id interno da pessoa para perguntar por si mesmo — coerente com a
separação "id Keycloak no cliente, id interno no banco".

**Registrado e não corrigido (fora de escopo):** o telefone do ajudante trafega por
`GET /routings/:id`, que também não verifica se quem pergunta é o motorista daquela rota.
Essa brecha já existe hoje para o restante do payload da rota; o telefone não a cria. Se
virar prioridade, o padrão a seguir é o `withCodesIfOperator` (exposição condicional por
ator) que o próprio `routing.service.ts` já usa.

### 3.2 Uma única implementação de nome/telefone da pessoa

`team.mapper.ts:10-17` documenta que `resolvePersonName` é **cópia byte a byte** de
`nomeDoAjudante` (`routing.service.ts:127`), "sincronizada só por disciplina". Esta entrega
edita as duas para acrescentar o mesmo campo — é o momento de fechar a duplicação em vez de
criar a terceira cópia do mesmo bug futuro.

**Decisão:** extrair `src/shared/person-display.util.ts`:

```ts
export interface PersonDisplaySource {
    collaborator?: { firstName: string | null; lastName: string | null;
                     email: string | null; phone: string | null } | null;
    provider?: { personType: PersonType; tradeName: string | null; companyName: string | null;
                 firstName: string | null; lastName: string | null;
                 email: string; phone: string | null } | null;
    fallbackId?: string | null;
}

export function resolvePersonName(src: PersonDisplaySource): string | null;
export function resolvePersonPhone(src: PersonDisplaySource): string | null;
```

As duas chamadas atuais viram adaptações de shape (`routing_helpers` passa
`{ collaborator: row.helper, provider: row.provider, fallbackId: row.helperId }`). A cascata
de nome é preservada **sem alteração de comportamento** — inclusive o ramo PJ/PF por
`personType`. A terceira implementação divergente, `ProviderEntity.displayName()`, fica como
está: tem ordem de fallback deliberadamente diferente e outros consumidores.

`resolvePersonPhone` **não** cai para `Collaborator.recoveryPhone`. Esse campo é
declaradamente "próprio **ou de supervisor**" — usá-lo como fallback faria o motorista ligar
para a pessoa errada achando que liga para o colega.

### 3.3 Uma única resolução de "quem é o usuário logado"

`DriverProfileService.getMe` já carrega a assimetria sutil entre os dois caminhos
(`CollaboratorService.findByKeycloakUserId` **lança**, `ProviderService` **resolve null**).
O endpoint novo precisa da mesma resolução. Copiá-la seria repetir o erro do item 3.2 antes
mesmo de ele esfriar.

**Decisão:** `PersonIdentityService.resolveByKeycloakUserId(sub)` → `{ personId, personType }
| null`, em módulo próprio, consumido pelo `TeamModule` e — refatorando — pelo
`DriverProfileService`. Diferença deliberada em relação ao `/drivers/me`: **não exige
`Driver` vinculado**. A pergunta aqui é "quem é esta pessoa", não "esta pessoa é motorista".

### 3.4 A tela do menu mostra as duas fontes

Decisão do cliente: "equipe fixa **+** tripulação de hoje" na mesma tela, em blocos
separados e rotulados. São dados de naturezas diferentes (cadastro estável vs. escala do
dia) e misturá-los numa lista só faria o motorista achar que um ajudante eventual entrou na
equipe dele.

## 4. Escopo — backend (`agility-services`)

Uma PR, sem migration.

1. **`src/shared/person-display.util.ts`** (§3.2) + testes das duas cascatas, incluindo
   prestador PJ sem `tradeName` e colaborador sem nome nem email.
2. **`TeamMapper`**: `phone` no recorte de tipo `PrismaTeamMemberWithPerson` e `personPhone`
   no `TeamMemberEntity.toJson()`, delegando ao util.

   **As repositories NÃO precisam mudar.** Verificado: os `include` são de modelo inteiro
   (`collaborator: { include: { collaboratorSkills: … } }` e, no routing,
   `include: { helper: true, provider: true }`) — o `select` aninhado só estreita a junction
   de skills, não a pessoa. `phone` já vem no runtime hoje; o que falta é o **tipo** declará-lo.
   Isto invalida a preocupação inicial de "o include precisa trazer `phone`", herdada do
   incidente do `personName`: lá o problema era outro.
3. **`routing.service.ts`**: `helperPhone` no retorno de `getRoutingHelpers`, delegando ao
   util; `nomeDoAjudante` e `AjudanteRow` deixam de existir.
4. **`PersonIdentityService`** (§3.3) + refactor do `DriverProfileService` para consumi-lo.
5. **`GET /teams/roster/me?date=`**, `@Roles('COLLABORATOR')`, declarado **antes** de
   `@Get(':id')` — mesma armadilha de rota estática que `by-person` e `roster` já
   documentam. Sem equipe ativa → lista vazia, não 404: "não tenho equipe" é uma resposta,
   não um erro.

   Resposta em envelope, **diferente** do `:personId` (que devolve array cru):

   ```jsonc
   { "personId": "…", "personType": "COLLABORATOR" | "PROVIDER",
     "members": [ { …membro, "personPhone": "…" } ] }
   ```

   O `personId` no envelope não é enfeite: o roster **inclui a própria pessoa** por
   contrato do P2, e sem ele o app precisaria de uma segunda chamada (`/drivers/me`) só
   para descobrir qual das linhas é ele mesmo — anulando o ganho de §3.1.

**Regressão a vigiar:** `personPhone` só pode aparecer no `toJson()` do membro quando a
origem for o endpoint `me`. Se `TeamMemberEntity.toJson()` passar a emitir o campo
incondicionalmente, o telefone vaza pelo `:personId` e pelo `GET /teams` — que embute os
membros. O campo deve ser omitido (não `null`) nas demais superfícies.

## 5. Escopo — app (`lab-app`)

### 5.1 Ajudantes no detalhe da rota

- `RoutingHelperResponse` (`id`, `collaboratorId`, `providerId`, `helperName`, `helperPhone`)
  e `helpers?: RoutingHelperResponse[]` em `RoutingResponse`.
- Componente `AjudantesDaRota` em `rotas-detalhadas/[id]/_components/`, lendo do
  `RotaContext`. **Nenhuma requisição nova** — confirmado: o `routing` do contexto vem de
  `useRouteDetails` → `useFindOneRouting` → `GET /routings/:id`, que é justamente o endpoint
  que embute `helpers`. (O `useFindMyRoutings` que também aparece no contexto serve a outra
  pergunta — "há outra rota em andamento" — e seu payload leve **não** traz `helpers`.)
- Posição: abaixo do `RouteProgress`, antes das abas. **Não renderiza nada** quando a lista
  é vazia — rota sem ajudante não ganha espaço morto nem título órfão.

### 5.2 Tela "Minha equipe"

- Item novo no array `itens` de `menu/index.tsx` → rota `menu/equipe/`.
- Domínio novo `src/domain/agility/team/` no formato dos demais (`teamAPI`, `teamService`,
  `dto/`, `useCase/useMyTeamRoster`).
- **Bloco "Minha equipe"**: `GET /teams/roster/me`. Líder destacado. **Habilidades NÃO
  exibidas** (correção de 04/08, durante a execução): o roster devolve `skillIds` como
  números, não nomes. Mostrar `1, 5, 7` ao motorista não informa nada, e traduzir exigiria
  outra chamada de API — escopo que ninguém pediu.
  **Filtra a própria pessoa** — o roster inclui quem perguntou, por contrato do P2; sem o
  filtro o motorista aparece na própria lista (armadilha já registrada na plataforma). O
  filtro usa o `personId` do próprio envelope (§4.5), sem chamada adicional.
- **Bloco "Comigo hoje"**: ajudantes da rota em andamento
  (`useFindMyRoutings({ status: 'IN_PROGRESS' })` → `useFindOneRouting(id)`). Sem rota em
  andamento, o bloco não aparece.
- **Estado vazio honesto:** "Você ainda não faz parte de uma equipe". É o cenário provável
  em produção — o cadastro de equipe é recente e o relatório de migração nunca rodou lá.
  A tela não pode sugerir erro nem oferecer ação que o motorista não tem (ele não cria
  equipe).

### 5.3 Contato

`PessoaContatoRow` em `src/components/`, compartilhado pelos três blocos:

- Ligar → `tel:`.
- WhatsApp → `whatsapp://send?phone=` com fallback `https://wa.me/` quando o app não está
  instalado (`Linking.canOpenURL`).
- Telefone ausente → linha **sem botões**, nome preservado. Nunca esconder a pessoa por
  falta de contato.
- Normalização do número (só dígitos, DDI 55 quando ausente) em função pura testada — é
  onde esse tipo de tela costuma quebrar em silêncio.

### 5.4 Remoção de código morto

`useAssignDriverToTeam`, `useRemoveDriverFromTeam` e os métodos correspondentes de
`driverService`/`driverAPI` apontam para `/drivers/:id/assign-team` e `/remove-team`, que
**não existem mais no backend** (verificado por grep: zero ocorrências em `agility-services/src`).
Foram removidos na entrega B do épico de equipes. São chamadas garantidas de 404. Remover.

## 6. Fora de escopo

- Chat entre motorista e equipe (o menu/chat do `lab-app` é stub legado).
- Qualquer escrita: o motorista **vê**, não edita equipe nem escala ajudante.
- Gate de dono no `GET /routings/:id` (§3.1).
- `Team.name` na tela: o roster devolve `teamId`, não o nome. Buscá-lo custaria uma
  requisição a mais para exibir um rótulo que o motorista não usa para decidir nada. Se o
  cliente pedir, o caminho é acrescentar `teamName` ao roster, não uma segunda chamada.

## 7. Ordem de entrega

Backend **primeiro**, na mesma janela. O app degrada de forma benigna se subir antes
(`helperPhone`/`personPhone` ausentes ⇒ linhas sem botão de contato, e a tela do menu
responde 404 no `roster/me`), mas a tela nasce inútil — mesma lição da entrega B.

## 8. Testes

- **Backend:** unitários do util (§4.1) cobrindo as duas cascatas e a ausência de fallback
  para `recoveryPhone`; spec da repository provando que o `include` traz `phone` (o teste
  que já protege `personName` do mesmo modo); teste do `roster/me` para colaborador,
  prestador e usuário sem equipe.
- **App:** função pura de normalização de telefone. O restante é orquestração de
  componente — cobertura por roteiro manual, documentada no relatório da tarefa, seguindo a
  limitação já registrada nesses repos.
