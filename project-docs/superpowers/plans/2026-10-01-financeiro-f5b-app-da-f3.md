# Financeiro F5b: a F3 no app do motorista. Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar ao app do motorista o que a F3 do back (agility-services #806) já expõe:
- aviso de troca da chave PIX (carteira, saque, Meus saques e a notificação);
- dívidas com a política de saque da empresa (`FREE`/`BLOCK_IF_OVERDUE`/`EXCESS_ONLY`), o teto do saque antes do erro e mensagens claras para `WITHDRAWAL_BLOCKED_BY_OVERDUE_DEBT`/`WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT`;
- a parcela de frete de cada motorista na troca de motorista (extrato, Ganhos e histórico);
- conclusão de pedido com cobrança só por `POST /services/:id/completion-details`, sem o `PATCH /complete` que a F3 passou a recusar.

**Architecture:** Igual à F5. A regra mora em funções puras (`_utils/` da rota e `src/domain/agility/wallet`), testadas com jest, e as telas só as chamam. O teto do saque vem de `GET /wallet/summary` (campos novos da F3) por um hook sob a chave `[KEY_WALLET, …]`, que as invalidações existentes já alcançam. O erro da API passa a carregar os campos extras do back (`maxAmountCents`), corrigidos uma vez no adaptador. Nada muda no back: o que não tem endpoint vira pendência na PR.

**Tech Stack:** React Native + Expo Router (typed routes), React Compiler ligado, TanStack Query 5.90, Restyle, jest-expo 29 com `react-test-renderer` (o repo não tem `@testing-library`).

**Spec:** `agility-services/project-docs/superpowers/specs/2026-09-25-financeiro-motorista-casos-de-uso-design.md`: seção 5 (App), seções 4.3 e 4.4, UC6, UC10, UC11, UC15 e UC16. Plano e ledger do back: `agility-services/project-docs/superpowers/plans/2026-09-29-financeiro-f3-dividas-divisao-e-fila.md` ("Fora desta fase" → F5b; Rulings 10, 14, 18, 21, 26 e 27) e `.superpowers/sdd/plan-f3/progress.md` (minors da Task 4 e das Tasks 15+16). Plano anterior do app, com os padrões que este segue: `project-docs/superpowers/plans/2026-09-28-financeiro-f5-app-do-motorista.md`.

## Global Constraints

- **Repo e branch:** agility-app (= lab-app). Use o worktree `C:/tmp/agility-wt/fin-f5b`, na branch `feat/financeiro-f5b` criada a partir de `origin/main` (base `9445d11`, merge da F5 #73), e abra a PR contra `main` (este repo **não tem** `development`).
- **`node_modules` por junction, antes da Task 1:** `cmd /c mklink /J "C:\tmp\agility-wt\fin-f5b\node_modules" "c:\Users\daniel\Agility\Front\lab-app\node_modules"`. **Não rode `npm install`/`npm ci`.** Para remover a junction, só `cmd /c rmdir`, nunca `rm -rf` (apaga o alvo).
- **Deploy:** o back da F3 (agility-services #806) sobe **antes** do build do app. Com o back sem a F3, `GET /wallet/summary` vem sem `withdrawalWithDebtPolicy`/`withdrawableBalance` e o app degrada: teto = disponível, sem aviso de política (Task 2). O aviso de chave não aparece, porque `pixKeyChangedAt` não vem.
- **Dinheiro é inteiro em centavos** da API até a tela. Formate com `formatCurrency(v)` (`src/utils/formatCurrency.ts`, que divide por 100) e nunca divida por 100 à mão. A exceção é `Routing.totalValue`, que é **reais** (Task 10).
- **Mostre nome, nunca id:** nenhuma tela exibe `paymentId`, `walletId`, `cancelledBy`, `serviceId`, `routingId`, `sourceId` ou id de saque, nem o fim deles. A chave PIX do próprio motorista aparece inteira (R9 da F5); a anterior aparece **como o back mascarou** (`previousPixKeyMasked`).
- **Gesto de dinheiro:** `mutateAsync`; o erro aparece por `mensagemDaApi`/`withdrawalErrorMessage`, importados pelo caminho do arquivo e não pelo barrel `@/api`; `useSubmitLock` trava o envio e o botão fica `disabled` com envio em voo. Fechar e reabrir o modal, ou tocar de novo, **não** dispara um segundo POST. A ação "Usar o máximo" do toast só preenche o campo e nunca envia.
- **React Compiler:** ele descarta a dependência de `useMemo`/`useCallback` que o corpo não lê. O valor que invalida o memo tem de ser **lido** no corpo. Nesta fase, prefira cálculo direto no render (funções puras baratas) em vez de memo novo.
- **Chaves do react-query:** o react-query casa a chave por **prefixo posicional**, e `routeStopChangedKeys` é lista explícita. Toda query nova de dinheiro fica **sob `[KEY_WALLET, …]`**, porque assim `moneyChangedKeys()`, `PUSH_INVALIDATED_KEYS` e o `onSettled` do saque já a alcançam. Teste isso (Task 2). **Não** coloque `moneyChangedKeys()` dentro de `routeStopChangedKeys` (comentário em `src/domain/queryKeys.ts`).
- **Sem evento ao vivo como fonte:** socket com token congelado morre calado. Nenhuma tela desta fase depende de WebSocket. Carteira, saque e dívidas leem do GET e são invalidadas por chave (push recebido, saque, conclusão).
- **Erro não é vazio:** resumo que falhou não vira "R$ 0,00" nem "sem dívida", e política que não carregou não vira "livre" **na tela**. O app só deixa de mostrar o aviso, e o back decide.
- **Sem dependência nova.**
- **Comandos (os mesmos da F5, verificados em 28/09/2026):**
  - Teste: `npx jest --watchAll=false <padrão>`. O `npm test` é `--watchAll` e trava. O padrão é regex sobre o caminho, então use trechos **sem parênteses nem colchetes** (`menu/carteira/__tests__/saque`, `_hooks/__tests__/useServiceCompletion`). A 1ª execução de teste de tela leva ~50 s.
  - Tipos: `npx tsc --noEmit` (~15 s). Sem saída = ok.
  - Lint: `npx eslint <caminhos>`. Esperado: `0 errors`.
- **Arquivos existentes são CRLF.** Edite com a ferramenta Edit ou reescreva o arquivo inteiro com Write. Nunca use `sed -i`/`perl -pi`. Em busca multilinha num arquivo CRLF, zero ocorrências **não** prova ausência.
- **Commits sem acentuação**, no padrão do histórico (`feat(carteira): ...`, `fix(api): ...`), terminando com a linha `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Depois de cada commit, rode `graphify update .`. Se não existir no PATH, siga sem ele.

### Contrato do motorista na F3 (lido do código do back, `agility-services` `origin/development` com o merge #806)

Toda resposta vem envelopada em `{ success, message, result }`, e o `walletAPI` desembrulha com `unwrap`. O erro chega ao app como **objeto** `{ success: false, error: { message, code, validationErrors, …extras } }`. O `AllExceptionsFilter` do back (`src/common/filters/all-exceptions.filter.ts`) repassa os extras do corpo da exceção para dentro de `error`. **O adaptador do app (`src/api/baseResponseAdapter.ts:29-39`) hoje descarta esses extras.** A Task 1 corrige.

| Endpoint (`@Roles('DRIVER','COLLABORATOR','PROVIDER')`, `driverId` do token) | O que a F3 acrescentou | Task |
|---|---|---|
| `GET /wallet` (`wallet.controller.ts` → `DriverWalletEntity.toJson`) | `bankInfoChangedAt`, `pixKeyChangedAt` (ISO ou `null`) e `previousPixKeyMasked` (`null` quando não havia chave). Conta como troca o primeiro cadastro, a remoção e a troca de `pixKeyType` (`updateBankInfo`, Ruling 26). A máscara (`utils/pix-key-mask.util.ts`) é `*` × (n−4) + os 4 últimos, e chave de até 4 caracteres vira só `*`. | 4, 6 |
| `GET /wallet/summary` (`WalletService.getSummary`) | `withdrawalWithDebtPolicy` (`'FREE' \| 'BLOCK_IF_OVERDUE' \| 'EXCESS_ONLY'`, padrão `FREE`) e `withdrawableBalance` = `withdrawableCents(policy, available, debt)`, a mesma função do pedido de saque (Ruling 18). Vêm também `availableBalance` e `pendingAdvances`, que é a dívida aberta PENDING/PARTIAL. **Não** traz `overdueCount`. | 2 |
| `POST /wallet/withdrawal` (`WithdrawalService.requestWithdrawal`) | Sob a trava da carteira, a política recusa com 400 `{ code, message, maxAmountCents }` (`utils/withdrawal-debt-policy.util.ts`):<ul><li>`WITHDRAWAL_BLOCKED_BY_OVERDUE_DEBT` (`BLOCK_IF_OVERDUE` com vencida), com `maxAmountCents: 0`;</li><li>`WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT` (`EXCESS_ONLY`, valor > disponível − dívida), com `maxAmountCents` = o teto.</li></ul>O `message` do back já é pt-BR (com `R$` sem milhar). Pedir acima do disponível continua "Saldo disponível insuficiente". | 1, 3, 6 |
| `GET /wallet/withdrawals` (`WithdrawalRequestEntity.toJson`) | `walletPixKeyChangedAt` e `pixKeyChangedAfterRequest` (`true` quando a chave da carteira mudou **depois** do pedido). O saque vai para a chave **gravada no pedido** (Ruling 27). | 5 |
| `GET /wallet/advances` (`DriverAdvanceEntity.toJson`) | `paymentId`, `origin` (`'CASH_COLLECTION'` com `paymentId`, `'ADVANCE'` sem ele), `cancelledAt`, `cancelledBy` (id: **nunca exibir**) e `cancelReason`. O vencimento é `agora + cashReturnDueDays × 24 h` (Ruling 16). A descrição legada da cobrança é `Dinheiro recebido no service <uuid> — devolução pendente` ou `Cash recebido no service …` (`LEGACY_CASH_DEBT_DESCRIPTION_PREFIXES`). | 8 |
| `GET /wallet/advances/summary` | Sem mudança: `{ totalPending, count, overdueCount }`. É a única fonte de `overdueCount`. | 6, 8 |
| `GET /wallet/transactions` | Três origens novas de redistribuição (Ruling 21), todas com `sourceId = <idempotencyKey>_<shareId>` e `metadata.action = 'REDISTRIBUTE'`:<ul><li>`FREIGHT_SHARE_REDISTRIBUTION_IN`: `FREIGHT`, IN, aumenta o bloqueado;</li><li>`FREIGHT_SHARE_REDISTRIBUTION_RELEASE`: `FREIGHT_RELEASE`, `affectsBalance: false`;</li><li>`FREIGHT_SHARE_REDISTRIBUTION_REVERSAL`: `MANUAL_DEBIT`, OUT.</li></ul>A parcela nasce **por motorista** (`FREIGHT` de origem `FREIGHT_SHARE`, descrição `Frete a liberar - roteirização <código>`). | 9 |
| Notificação `wallet.pix_key_changed` (`notification.listener.ts` `handlePixKeyChanged`) | `SYSTEM_ALERT` ao próprio motorista: título "Chave PIX alterada", descrição com a chave nova mascarada, **sem `linkUrl`** e `metadata: { walletId, changedAt, previousPixKeyMasked }`. O push leva `data = { notificationId, type, ...metadata }` (`notification.service.ts` `create`). Dedup de 10 s por (usuário, tipo). | 7 |
| `POST /services/:id/completion-details` (`ServiceCompletionDetailsDto`) | `receivedValue` em **centavos** (`@IsNumber @Min(0)`) e `paymentMethod` (`CASH\|PIX\|CARD_DEBIT\|CARD_CREDIT`). Pedido `requiresPayment` exige `receivedValue > 0`. O `Payment` e a dívida (só `CASH`, para **qualquer** motorista) nascem na mesma conclusão (spec 4.3). | 11 |
| `PATCH /services/:id/complete` e `PUT /services/:id/status` → `COMPLETED` | Recusam pedido `requiresPayment` com 400 `SERVICE_REQUIRES_PAYMENT_DETAILS` (Ruling 10). | 12 |

**Sem endpoint para o motorista** (não invente; vira pendência de back na PR):
- parcela por rota (`routing_freight_shares`: paradas concluídas/totais, valor, status). Só existe `GET admin/wallet/freight-shares`, que é de operador;
- `paymentMethod` e a dívida (vencimento) em `GET /finance/payments`: o `PaymentMapper` não devolve nenhum dos dois;
- `cashReturnDueDays`: não está em `GET /drivers/me` (`companyFeatures`) nem em `/wallet/summary`;
- filtro `status` em `GET /wallet/advances`: o service aceita, mas o controller do motorista passa `undefined`;
- nome do cliente e código da rota na dívida: `AdvanceResponse` só tem ids.

### Chaves do react-query (telas de dinheiro)

| Chave | Hook |
|---|---|
| `['wallet','balance']` | `useGetWallet` (existe) |
| `['wallet','summary']` | `useWithdrawalAllowance` (**Task 2**) |
| `['wallet','advances','summary']` | `useGetAdvancesSummary` (existe) |
| `['wallet','transactions'\|'withdrawals'\|'advances','infinite', …]` | listas da F5 (existem) |
| `['wallet','earnings', startDateISO]` | `useFreightEarnings` (existe) |
| `['finance','payments','infinite', { startDate }]` | `useInfinitePayments` (existe) |

Quem invalida, sem mudança:
- o saque (`onSettled`) e os dados bancários invalidam `[KEY_WALLET]`;
- a conclusão de parada (`useServiceCompletion`) e o insucesso e a conclusão de rota (`useCompleteRouting`) invalidam `moneyChangedKeys()` = `[KEY_WALLET]` e `[KEY_FINANCE]`;
- o push recebido invalida `PUSH_INVALIDATED_KEYS`, que inclui `KEY_WALLET`.

## Review Focus

1. **Empresa `EXCESS_ONLY`, motorista pede mais que o permitido com o resumo desatualizado:** o back recusa com `maxAmountCents`. O motorista vê "o máximo que pode sacar agora é R$ X", e a ação "Usar o máximo" preenche o campo **sem enviar**. O botão destrava e não aparece toast verde. Teste na Task 6 (tela), na Task 3 (texto) e na Task 1 (o adaptador não pode comer `maxAmountCents`).
2. **A chave PIX foi trocada por outra pessoa:** na carteira, o motorista vê o alerta com a data e a chave anterior mascarada. O modal do saque mostra o destino. O primeiro cadastro **não** diz "alterada", e a remoção diz "removida". Testes nas Tasks 4 e 6.
3. **`GET /wallet/summary` falha, ou o back ainda não tem a F3:** o saque não trava e não inventa política. O teto é o disponível, sem aviso, e o back decide. Teste nas Tasks 2 e 6.
4. **Pedido com cobrança concluído:** `R$ 1.234,56` sai como `receivedValue: 123456`. Se o back recusar (400 `SERVICE_REQUIRES_PAYMENT_DETAILS` ou "receivedValue é obrigatório"), o motorista lê a frase do back, e não "Ocorreu um erro ao finalizar". Teste na Task 11.
5. **Rota com troca de motorista e redistribuição antes da liberação:** o motorista vê a SUA parcela. "Ganhos" conta só o `FREIGHT_SHARE_RELEASE` da parcela dele, e o extrato rotula a redução como redistribuição, e não como "Frete liberado" + "Débito da empresa". Teste na Task 9.

## Rulings (decisões que a spec e a F3 não fecharam)

| # | Decisão | Custo se errado |
|---|---|---|
| R1 | **`pixKeyChangedAfterRequest` aparece para o motorista** (item 5 do pedido; minor deferido nas Tasks 15+16 da F3). Aparece só em saque `PENDING`/`PROCESSING`, como aviso: "a chave mudou depois deste pedido, o pagamento vai para o destino gravado no pedido". É dado da própria carteira dele, e quem trocou sem ele saber é justamente o caso que ele precisa ver. **Não é pendência de back**: o minor fica resolvido como intencional. | O motorista que trocou a chave de propósito lê um aviso que já sabe. É um texto a mais. |
| R2 | **Janela de alerta da troca: 7 dias** (`PIX_CHANGE_ALERT_DAYS`). Dentro dela, aparece banner vermelho no topo da carteira e "Atenção" no modal do saque. Depois, só uma linha cinza junto da chave. | Troca de 8 dias atrás sai sem destaque. Mudar é uma constante. |
| R3 | **Teto do saque = menor entre o disponível (`GET /wallet`) e o `withdrawableBalance` (`GET /wallet/summary`).** Sem o resumo (carregando, erro ou back sem F3), o teto é o disponível e o back decide. | Com o resumo atrasado, o motorista pode digitar acima do permitido. O back recusa com o máximo (Review Focus 1). |
| R4 | **As mensagens dos dois códigos são do app**, porque o texto do back não tem milhar e trata o motorista como "você tem N dívidas" em todos os casos. O máximo vem de `maxAmountCents`. Sem esse campo, cai na frase do back. | Se o back mudar o código, o app mostra a frase do back, o que é aceitável. |
| R5 | **A parcela do motorista mora no livro-razão:**<ul><li>no Extrato, a linha de frete já nasce por parcela;</li><li>em Ganhos, o `FREIGHT_SHARE_RELEASE` da parcela.</li></ul>O histórico de rotas passa a rotular `totalValue` como **"Valor da rota"**, porque ele é o valor da rota inteira, e não o frete de quem a concluiu. Valor por rota com "N de M paradas" exige endpoint e é pendência de back. | O motorista não vê, dentro do histórico, quanto daquela rota é dele. Vê em Ganhos, pelo código da rota. |
| R6 | **O vencimento da cobrança fica na tela de dívidas** ("Adiantamentos": cada dívida `CASH_COLLECTION` com "Vence em"). "Cobranças" mantém o cartão que leva até lá. Vencimento por linha em Cobranças exige `paymentMethod` + dívida em `/finance/payments`, e é pendência. | Na linha da cobrança, o motorista não vê qual virou dívida. É o mesmo custo de R5 da F5. |
| R7 | **O aviso "dinheiro em mão vira dívida" vale para todo motorista** (spec 4.3: `CASH` vira dívida para CLT **e** terceirizado). Hoje só o CLT vê (`SharedEtapaFinalizacao.tsx:187-189`). O texto não diz o número de dias, porque `cashReturnDueDays` não chega ao motorista (pendência). | Nenhum: o terceirizado passa a ver um aviso que já valia para ele desde a F1. |
| R8 | **O app deixa de ter qualquer caminho para `PATCH /services/:id/complete` e `PUT /services/:id/status`.** Sai a tela órfã `dados-entrega` (nenhum `router.push` chega nela, e ela chamava `serviceService.complete` antes do completion-details e não mandava `receivedValue`). Saem também `useCompleteService`, `useChangeServiceStatus` e `handleCompleteService` (sem nenhum consumidor). Um teste de varredura impede a volta. | Se alguém quiser a tela de volta, ela está no histórico do git. Religar exige o `POST /completion-details`. |
| R9 | **O destino no modal do saque vem do `GET /wallet` em cache** (`staleTime` de 2 min). O back grava no pedido a chave do servidor naquele instante, e Meus saques mostra o destino gravado (com R1 se a chave mudar depois). | Uma troca feita nos últimos 2 min, sem push, pode não aparecer no modal. Aparece em Meus saques. |
| R10 | **A notificação da troca é reconhecida por `type = SYSTEM_ALERT` + `walletId` + `changedAt`** (no `metadata` da lista e achatados no `data` do push) e leva à carteira. O ideal é o back mandar `linkUrl`, o que fica como pendência menor. Com `linkUrl`, o do back ganha. | Outro `SYSTEM_ALERT` futuro com `walletId` e `changedAt` também abriria a carteira, o que é inofensivo. |
| R11 | **A tela de dívidas continua listando todos os status** (R12 da F5). Ganha o aviso da política, o título pela `origin` e o motivo do cancelamento (UC15). "Só em aberto" exige o filtro `status` no controller do motorista e é pendência. | Com muito histórico, a dívida aberta fica abaixo das devolvidas. O resumo no topo diz quantas estão em aberto e vencidas. |

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/api/baseResponse.ts`, `src/api/baseResponseAPI.ts` | modificar | `ErrorResponse(API)` aceita campos extras |
| `src/api/baseResponseAdapter.ts` | modificar | `toBaseResponseError` repassa os extras do back |
| `src/domain/agility/wallet/dto/types.ts` | modificar | `WithdrawalWithDebtPolicy`, `AdvanceOrigin`, 3 origens de redistribuição |
| `src/domain/agility/wallet/dto/response/wallet.response.ts` | modificar | campos da F3 em carteira, saque e dívida; `WalletSummaryResponse` |
| `src/domain/agility/wallet/walletAPI.ts` | modificar | `getSummary()` |
| `src/domain/agility/wallet/withdrawalAllowance.ts` | criar | `toWithdrawalAllowance`, `withdrawCapCents` |
| `src/domain/agility/wallet/useCase/useWithdrawalAllowance.ts` | criar | `['wallet','summary']` |
| `src/app/(auth)/(tabs)/menu/carteira/_utils/debtPolicy.ts` | criar | aviso da política, mensagem e máximo do erro do saque |
| `src/app/(auth)/(tabs)/menu/carteira/_utils/pixKeyNotice.ts` | criar | aviso de troca da chave PIX |
| `src/app/(auth)/(tabs)/menu/carteira/index.tsx` | modificar | banner e linha da troca da chave |
| `src/app/(auth)/(tabs)/menu/carteira/_utils/withdrawalDisplay.ts` | modificar | `pixNote`, `walletDestination` |
| `src/app/(auth)/(tabs)/menu/carteira/saques.tsx` | modificar | mostra `pixNote` |
| `src/app/(auth)/(tabs)/menu/carteira/saque.tsx` | reescrever | teto pela política, aviso, mensagem com o máximo, destino no modal |
| `src/domain/agility/notification/notificationTarget.ts` | modificar | `ehAvisoDeChavePix`; destino `/menu/carteira` |
| `src/services/notification/notificationRoutes.ts`, `NotificationContext.tsx` | modificar | push da troca abre a carteira |
| `src/app/(auth)/(tabs)/menu/carteira/_utils/advanceDisplay.ts` | modificar | título pela `origin`, texto do cancelamento |
| `src/app/(auth)/(tabs)/menu/carteira/adiantamentos.tsx` | modificar | aviso da política e motivo do cancelamento |
| `src/app/(auth)/(tabs)/menu/carteira/_utils/transactionDisplay.ts` | modificar | rótulos da redistribuição |
| `src/app/(auth)/(tabs)/menu/historico/_utils/routeValue.ts` | criar | "Valor da rota" |
| `src/app/(auth)/(tabs)/menu/historico/index.tsx`, `[routeId]/index.tsx` | modificar | usam `routeValueLabel` |
| `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/useServiceCompletion.ts` | modificar | toast com `mensagemDaApi` |
| `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/cashDebtWarning.ts` | criar | aviso de dinheiro em mão para todos |
| `…/parada/[pid]/_components/shared/SharedEtapaFinalizacao.tsx` | modificar | usa `cashDebtWarning` |
| `…/parada/[pid]/dados-entrega/index.tsx` | apagar | tela órfã que chamava `PATCH /complete` |
| `src/domain/agility/service/{serviceAPI,serviceService}.ts`, `useCase/{index,useCompleteService,useChangeServiceStatus}.ts`, `dto/{index.ts,request/change-service-status.request.ts}` | modificar/apagar | sai `complete` e `changeStatus` |
| `…/parada/[pid]/_hooks/useStopActions.ts`, `…/parada/[pid]/index.tsx`, `src/app/(auth)/(tabs)/rotas-detalhadas/_layout.tsx`, `src/types/navigation.ts`, `src/domain/queryKeys.ts` | modificar | sem `handleCompleteService` e sem a rota `dados-entrega` |
| `src/domain/agility/service/__tests__/conclusaoSoPorDetalhes.test.ts` | criar | varredura: nenhum `PATCH /complete`/`PUT /status` |

---

### Task 1: O erro da API carrega os campos extras do back

`baseResponseAdapter.toBaseResponseError` monta `error` com três campos fixos e descarta o resto. É o mesmo defeito que o back corrigiu no `AllExceptionsFilter` (memória "O 400 de override perde `violations`"). Sem esta task, o `maxAmountCents` da recusa do saque nunca chega à tela.

**Files:**
- Modify: `src/api/baseResponseAPI.ts`
- Modify: `src/api/baseResponse.ts`
- Modify: `src/api/baseResponseAdapter.ts:29-39`
- Test: `src/api/__tests__/baseResponseAdapter.test.ts` (criar)

**Interfaces:**
- Consumes: nada.
- Produces: o erro rejeitado pelo interceptor passa a ser `{ success, error: { ...extrasDoBack, message, code, validationErrors } }`. `ErrorResponse` e `ErrorResponseAPI` ganham `[extra: string]: unknown`. A Task 3 lê `error.maxAmountCents`.

- [ ] **Step 1: Escrever o teste que falha**

`src/api/__tests__/baseResponseAdapter.test.ts`:

```ts
/**
 * O back (`AllExceptionsFilter`) repassa dentro de `error` os campos extras da exceção —
 * ex.: `maxAmountCents` na recusa do saque pela política de dívida (F3). O adaptador do app
 * montava `error` com três campos fixos e o resto sumia aqui.
 */
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import type { BaseResponseAPI } from '../baseResponseAPI';
import { baseResponseAdapter } from '../baseResponseAdapter';

function erroComResposta(data: unknown): AxiosError<BaseResponseAPI<unknown>> {
    const config = { headers: new AxiosHeaders() };
    const response = { data, status: 400, statusText: 'Bad Request', headers: {}, config } as unknown as AxiosResponse<BaseResponseAPI<unknown>>;
    return new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, undefined, response);
}

describe('toBaseResponseError', () => {
    it('preserva os campos extras do back (maxAmountCents da recusa do saque)', () => {
        const r = baseResponseAdapter.toBaseResponseError(
            erroComResposta({
                success: false,
                message: 'Com R$ 30,00 em dívidas abertas, o saque máximo é R$ 70,00.',
                result: null,
                error: {
                    message: 'Com R$ 30,00 em dívidas abertas, o saque máximo é R$ 70,00.',
                    code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT',
                    validationErrors: null,
                    maxAmountCents: 7000,
                },
            }),
        );
        expect(r.error).toEqual({
            message: 'Com R$ 30,00 em dívidas abertas, o saque máximo é R$ 70,00.',
            code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT',
            validationErrors: [],
            maxAmountCents: 7000,
        });
    });

    it('os campos do envelope continuam com os mesmos padrões (o extra não os substitui)', () => {
        const r = baseResponseAdapter.toBaseResponseError(
            erroComResposta({ success: false, error: { message: '', validationErrors: null, violations: ['x'] } }),
        );
        expect(r.error).toEqual({ message: 'Erro desconhecido', code: 'N/A', validationErrors: [], violations: ['x'] });
    });

    it('sem resposta do servidor: continua AU-000, sem extras', () => {
        const config = { headers: new AxiosHeaders() };
        const r = baseResponseAdapter.toBaseResponseError(new AxiosError('Network Error', 'ERR_NETWORK', config));
        expect(r).toEqual({
            success: false,
            error: { message: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.', code: 'AU-000' },
        });
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --watchAll=false api/__tests__/baseResponseAdapter`
Expected: FAIL nos dois primeiros (`maxAmountCents` e `violations` ausentes no `toEqual`). O terceiro passa.

- [ ] **Step 3: Implementar**

Em `src/api/baseResponseAPI.ts`, troque o tipo `ErrorResponseAPI` por:

```ts
export type ErrorResponseAPI = {
    message?: string;
    code?: string;
    validationErrors?: ValidationErrorsResponseAPI[]
    /** Campos extras que o back põe no corpo da exceção (ex.: `maxAmountCents` do saque). */
    [extra: string]: unknown
}
```

Em `src/api/baseResponse.ts`, troque o tipo `ErrorResponse` por:

```ts
export type ErrorResponse = {
    message?: string;
    code?: string;
    validationErrors?: ValidationErrorsResponse[]
    /** Extras do back, repassados por `baseResponseAdapter.toBaseResponseError`. */
    [extra: string]: unknown
}
```

Em `src/api/baseResponseAdapter.ts`, no ramo `if (error.response)` de `toBaseResponseError`, troque o objeto `error` por:

```ts
            error: {
                // Extras do back primeiro: `message`/`code`/`validationErrors` abaixo sempre
                // ganham. Sem o repasse, o `maxAmountCents` da recusa do saque (F3) sumia aqui
                // — o mesmo defeito que o `AllExceptionsFilter` do back já corrigiu do lado dele.
                ...(responseData?.error ?? {}),
                message: responseData.error?.message || 'Erro desconhecido',
                code: responseData.error?.code || 'N/A',
                validationErrors: responseData.error?.validationErrors || [],
            },
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --watchAll=false api/__tests__`
Expected: PASS (os três novos e os de `apiErrorMessage`).
Run: `npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add src/api/baseResponse.ts src/api/baseResponseAPI.ts src/api/baseResponseAdapter.ts src/api/__tests__/baseResponseAdapter.test.ts
git commit -m "fix(api): erro da API preserva os campos extras do back (maxAmountCents do saque)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Contrato da F3 nos DTOs e teto do saque pelo `GET /wallet/summary`

**Files:**
- Modify: `src/domain/agility/wallet/dto/types.ts`
- Modify: `src/domain/agility/wallet/dto/response/wallet.response.ts`
- Modify: `src/domain/agility/wallet/walletAPI.ts`
- Create: `src/domain/agility/wallet/withdrawalAllowance.ts`
- Create: `src/domain/agility/wallet/useCase/useWithdrawalAllowance.ts`
- Modify: `src/domain/agility/wallet/useCase/index.ts`
- Test: `src/domain/agility/wallet/__tests__/withdrawalAllowance.test.ts` (criar)
- Test: `src/domain/agility/wallet/useCase/__tests__/useWithdrawalAllowance.test.tsx` (criar)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type WithdrawalWithDebtPolicy = 'FREE' | 'BLOCK_IF_OVERDUE' | 'EXCESS_ONLY'` e `type AdvanceOrigin = 'CASH_COLLECTION' | 'ADVANCE'` (`dto/types.ts`);
  - `LedgerSourceType.FREIGHT_SHARE_REDISTRIBUTION_IN | _RELEASE | _REVERSAL`;
  - `WalletResponse.pixKeyChangedAt?: string | null`, `previousPixKeyMasked?: string | null` e `bankInfoChangedAt?: string | null`;
  - `WithdrawalResponse.pixKeyChangedAfterRequest?: boolean` e `walletPixKeyChangedAt?: string | null`;
  - `AdvanceResponse.origin?: AdvanceOrigin`, `paymentId?`, `cancelledAt?` e `cancelReason?: string | null`;
  - `interface WalletSummaryResponse { availableBalance; pendingAdvances; withdrawalWithDebtPolicy; withdrawableBalance }`;
  - `walletAPI.getSummary(): Promise<WalletSummaryResponse>`;
  - `interface WithdrawalAllowance { policy: WithdrawalWithDebtPolicy; withdrawableCents: number; openDebtCents: number }`;
  - `toWithdrawalAllowance(s): WithdrawalAllowance | null`;
  - `withdrawCapCents(availableCents: number, allowance: WithdrawalAllowance | null): number`;
  - `useWithdrawalAllowance(): { allowance: WithdrawalAllowance | null; isLoading; isError; refetch }`, sob a chave `[KEY_WALLET, 'summary']`.

- [ ] **Step 1: Escrever os testes que falham**

`src/domain/agility/wallet/__tests__/withdrawalAllowance.test.ts`:

```ts
/**
 * Teto do saque pela política de dívida (F3, `GET /wallet/summary`). Back sem a F3 ou
 * resposta fora do contrato vira `null`: a tela cai no disponível e o back decide (R3).
 */
import { toWithdrawalAllowance, withdrawCapCents } from '../withdrawalAllowance';

type Resumo = Parameters<typeof toWithdrawalAllowance>[0];

describe('toWithdrawalAllowance', () => {
    it('lê a política, o teto e a dívida aberta do resumo', () => {
        const resumo = { availableBalance: 10000, pendingAdvances: 3000, withdrawalWithDebtPolicy: 'EXCESS_ONLY', withdrawableBalance: 7000 } as Resumo;
        expect(toWithdrawalAllowance(resumo)).toEqual({ policy: 'EXCESS_ONLY', withdrawableCents: 7000, openDebtCents: 3000 });
    });

    it('back sem a F3 (sem os campos novos): null', () => {
        expect(toWithdrawalAllowance({ availableBalance: 10000, pendingAdvances: 0 } as Resumo)).toBeNull();
    });

    it('política fora das três conhecidas: null', () => {
        expect(toWithdrawalAllowance({ availableBalance: 1, pendingAdvances: 0, withdrawalWithDebtPolicy: 'OUTRA', withdrawableBalance: 1 } as unknown as Resumo)).toBeNull();
    });

    it('teto fracionado ou negativo não é centavo válido: null', () => {
        expect(toWithdrawalAllowance({ availableBalance: 1, pendingAdvances: 0, withdrawalWithDebtPolicy: 'FREE', withdrawableBalance: 70.5 } as Resumo)).toBeNull();
        expect(toWithdrawalAllowance({ availableBalance: 1, pendingAdvances: 0, withdrawalWithDebtPolicy: 'FREE', withdrawableBalance: -1 } as Resumo)).toBeNull();
    });

    it('sem resumo: null', () => {
        expect(toWithdrawalAllowance(undefined)).toBeNull();
    });
});

describe('withdrawCapCents', () => {
    const politica = (withdrawableCents: number) => ({ policy: 'EXCESS_ONLY' as const, withdrawableCents, openDebtCents: 3000 });

    it('sem política conhecida: o disponível', () => {
        expect(withdrawCapCents(10000, null)).toBe(10000);
    });

    it('o menor entre o disponível e o que a política deixa', () => {
        expect(withdrawCapCents(10000, politica(7000))).toBe(7000);
        expect(withdrawCapCents(5000, politica(7000))).toBe(5000);
    });

    it('disponível negativo legado vira 0', () => {
        expect(withdrawCapCents(-500, null)).toBe(0);
    });
});
```

`src/domain/agility/wallet/useCase/__tests__/useWithdrawalAllowance.test.tsx`:

```tsx
/**
 * O resumo mora sob `[KEY_WALLET]`: o saque (`onSettled`), a conclusão (`moneyChangedKeys`)
 * e o push (`PUSH_INVALIDATED_KEYS`) já o invalidam, sem lista nova para manter.
 */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_WALLET, moneyChangedKeys } from '@/domain/queryKeys';

import { useWithdrawalAllowance } from '../useWithdrawalAllowance';

const mockGetSummary = jest.fn();
jest.mock('../../walletAPI', () => ({
    walletAPI: { getSummary: (...args: unknown[]) => mockGetSummary(...args) },
}));
jest.mock('@/services', () => ({
    useAuthCredentialsService: () => ({ authCredentials: { accessToken: 't', tenantId: 'c-1' } }),
}));

let resultado!: ReturnType<typeof useWithdrawalAllowance>;
function Probe() {
    resultado = useWithdrawalAllowance();
    return null;
}

async function settle() {
    for (let i = 0; i < 10; i++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
}

function montar(queryClient: QueryClient) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    return tree;
}

beforeEach(() => mockGetSummary.mockReset());

it('normaliza o resumo e refaz a busca quando [KEY_WALLET] é invalidada', async () => {
    mockGetSummary.mockResolvedValue({ availableBalance: 10000, pendingAdvances: 3000, withdrawalWithDebtPolicy: 'EXCESS_ONLY', withdrawableBalance: 7000 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const tree = montar(queryClient);
    await settle();

    expect(resultado.allowance).toEqual({ policy: 'EXCESS_ONLY', withdrawableCents: 7000, openDebtCents: 3000 });
    expect(mockGetSummary).toHaveBeenCalledTimes(1);

    await act(async () => {
        await queryClient.invalidateQueries({ queryKey: [KEY_WALLET] });
    });
    await settle();
    expect(mockGetSummary).toHaveBeenCalledTimes(2);

    act(() => tree.unmount());
    queryClient.clear();
});

it('moneyChangedKeys() alcança a chave do resumo (prefixo posicional)', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData([KEY_WALLET, 'summary'], null);
    for (const queryKey of moneyChangedKeys()) {
        await queryClient.invalidateQueries({ queryKey });
    }
    expect(queryClient.getQueryState([KEY_WALLET, 'summary'])?.isInvalidated).toBe(true);
    queryClient.clear();
});

it('erro do resumo: allowance null (a tela cai no disponível) e isError', async () => {
    mockGetSummary.mockRejectedValue({ success: false, error: { message: 'boom' } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const tree = montar(queryClient);
    await settle();

    expect(resultado.allowance).toBeNull();
    expect(resultado.isError).toBe(true);

    act(() => tree.unmount());
    queryClient.clear();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --watchAll=false wallet/__tests__/withdrawalAllowance wallet/useCase/__tests__/useWithdrawalAllowance`
Expected: FAIL com `Cannot find module '../withdrawalAllowance'` e `Cannot find module '../useWithdrawalAllowance'`.

- [ ] **Step 3: Implementar**

Em `src/domain/agility/wallet/dto/types.ts`, dentro de `LedgerSourceType`, logo depois de `FREIGHT_SHARE_REVERSAL: 'FREIGHT_SHARE_REVERSAL',`:

```ts
    // Redistribuição entre as parcelas da mesma rota (F3). `sourceId` = `<chave>_<parcela>`.
    FREIGHT_SHARE_REDISTRIBUTION_IN: 'FREIGHT_SHARE_REDISTRIBUTION_IN',
    FREIGHT_SHARE_REDISTRIBUTION_RELEASE: 'FREIGHT_SHARE_REDISTRIBUTION_RELEASE',
    FREIGHT_SHARE_REDISTRIBUTION_REVERSAL: 'FREIGHT_SHARE_REDISTRIBUTION_REVERSAL',
```

e, no fim do arquivo:

```ts
/** Política de saque com dívida da empresa (`Company.params.finance`, F3). Padrão `FREE`. */
export type WithdrawalWithDebtPolicy = 'FREE' | 'BLOCK_IF_OVERDUE' | 'EXCESS_ONLY';

/** Origem da dívida (`DriverAdvanceEntity.origin()`, F3): com `paymentId` é cobrança em dinheiro. */
export type AdvanceOrigin = 'CASH_COLLECTION' | 'ADVANCE';
```

Em `src/domain/agility/wallet/dto/response/wallet.response.ts`, troque o import por:

```ts
import {
    AdvanceOrigin,
    AdvanceStatus,
    LedgerDirection,
    PixKeyType,
    TransactionStatus,
    TransactionType,
    WithdrawalMethod,
    WithdrawalStatus,
    WithdrawalWithDebtPolicy,
} from '../types';
```

Em `WalletResponse`, logo depois de `pixKeyType?: PixKeyType | null;`:

```ts
    /** Última troca de banco, conta ou chave (F3). */
    bankInfoChangedAt?: string | null;
    /** Última troca da chave PIX, ISO (F3). Conta o primeiro cadastro, a remoção e a troca de tipo. */
    pixKeyChangedAt?: string | null;
    /** Chave anterior à última troca, já mascarada pelo back (4 últimos). `null` = não havia chave. */
    previousPixKeyMasked?: string | null;
```

Em `WithdrawalResponse`, logo depois de `driverName?: string | null;`:

```ts
    /** Última troca da chave da carteira (F3). */
    walletPixKeyChangedAt?: string | null;
    /** A chave da carteira mudou DEPOIS deste pedido; o pagamento vai para o destino gravado aqui (F3). */
    pixKeyChangedAfterRequest?: boolean;
```

Em `AdvanceResponse`, logo depois de `notes?: string;`:

```ts
    /** Pagamento em dinheiro que gerou a dívida (F3). Nunca exibir. */
    paymentId?: string | null;
    /** `CASH_COLLECTION` = dinheiro recebido de cliente; `ADVANCE` = adiantamento. */
    origin?: AdvanceOrigin;
    cancelledAt?: string | null;
    /** Motivo do cancelamento, escrito pela empresa (UC15). `cancelledBy` é id: não é tipado de propósito. */
    cancelReason?: string | null;
```

e, no fim do arquivo:

```ts
/** `GET /wallet/summary` (back `WalletService.getSummary`, F3). Só os campos que o app lê. */
export interface WalletSummaryResponse {
    availableBalance: number;
    /** Dívida aberta (PENDING/PARTIAL), em centavos. */
    pendingAdvances: number;
    withdrawalWithDebtPolicy: WithdrawalWithDebtPolicy;
    /** Quanto a política deixa sacar agora, em centavos (a mesma conta do pedido de saque). */
    withdrawableBalance: number;
}
```

Em `src/domain/agility/wallet/walletAPI.ts`, acrescente `WalletSummaryResponse` ao import de `./dto` e, depois de `getAdvancesSummary`, o método:

```ts
    /** Resumo (F3): política de saque com dívida e o teto que ela deixa (`withdrawableBalance`). */
    async getSummary(): Promise<WalletSummaryResponse> {
        const response = await apiAgility.get(`${BASE_URL}/summary`);
        return unwrap<WalletSummaryResponse>(response.data);
    },
```

`src/domain/agility/wallet/withdrawalAllowance.ts`:

```ts
// src/domain/agility/wallet/withdrawalAllowance.ts
import type { WalletSummaryResponse } from './dto/response/wallet.response';
import type { WithdrawalWithDebtPolicy } from './dto/types';

export interface WithdrawalAllowance {
    policy: WithdrawalWithDebtPolicy;
    /** Teto do saque pela política, em centavos (back: `withdrawableCents`). */
    withdrawableCents: number;
    /** Dívida aberta (PENDING/PARTIAL), em centavos. */
    openDebtCents: number;
}

const POLICIES: readonly string[] = ['FREE', 'BLOCK_IF_OVERDUE', 'EXCESS_ONLY'];

const isCents = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/**
 * Back sem a F3, ou resposta fora do contrato, vira `null`: a tela usa o disponível como
 * teto e o back decide no pedido (R3). Nunca inventa "FREE".
 */
export function toWithdrawalAllowance(s: Partial<WalletSummaryResponse> | null | undefined): WithdrawalAllowance | null {
    if (!s) return null;
    const policy = s.withdrawalWithDebtPolicy;
    if (!policy || !POLICIES.includes(policy)) return null;
    if (!isCents(s.withdrawableBalance)) return null;
    const openDebt = Number(s.pendingAdvances ?? 0);
    return {
        policy,
        withdrawableCents: s.withdrawableBalance,
        openDebtCents: Number.isFinite(openDebt) && openDebt > 0 ? openDebt : 0,
    };
}

/** Teto do campo de saque: o menor entre o disponível e o que a política deixa. */
export function withdrawCapCents(availableCents: number, allowance: WithdrawalAllowance | null): number {
    const disponivel = Math.max(0, availableCents);
    return allowance ? Math.min(disponivel, allowance.withdrawableCents) : disponivel;
}
```

`src/domain/agility/wallet/useCase/useWithdrawalAllowance.ts`:

```ts
// src/domain/agility/wallet/useCase/useWithdrawalAllowance.ts

import { useQuery } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { walletAPI } from '../walletAPI';
import { toWithdrawalAllowance } from '../withdrawalAllowance';

/**
 * Política de saque com dívida e o teto do saque (F3). Sob `[KEY_WALLET]` de propósito: o
 * saque, a conclusão de parada e o push já invalidam esse prefixo.
 */
export function useWithdrawalAllowance() {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY_WALLET, 'summary'],
        queryFn: async () => toWithdrawalAllowance(await walletAPI.getSummary()),
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 2,
    });

    return { allowance: data ?? null, isLoading, isError, refetch };
}
```

Em `src/domain/agility/wallet/useCase/index.ts`, acrescente:

```ts
export * from './useWithdrawalAllowance';
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --watchAll=false domain/agility/wallet`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add src/domain/agility/wallet
git commit -m "feat(carteira): contrato da F3 e teto do saque pelo GET /wallet/summary

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Textos da política de dívida e do erro do saque

**Files:**
- Create: `src/app/(auth)/(tabs)/menu/carteira/_utils/debtPolicy.ts`
- Test: `src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/debtPolicy.test.ts` (criar)

**Interfaces:**
- Consumes: `WithdrawalAllowance` (Task 2); o erro com `error.code`/`error.maxAmountCents` (Task 1); `mensagemDaApi` (`src/api/apiErrorMessage.ts`).
- Produces:
  - `interface PolicyNotice { tone: 'block' | 'limit' | 'info'; text: string }`;
  - `withdrawalPolicyNotice(allowance: WithdrawalAllowance | null, overdueCount: number | null): PolicyNotice | null`;
  - `withdrawalErrorMessage(error: unknown, fallback: string): string`;
  - `maxWithdrawalFromError(error: unknown): number | null`.

- [ ] **Step 1: Escrever o teste que falha**

`src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/debtPolicy.test.ts`:

```ts
import { formatCurrency } from '@/utils/formatCurrency';

import { maxWithdrawalFromError, withdrawalErrorMessage, withdrawalPolicyNotice } from '../debtPolicy';

type Allowance = NonNullable<Parameters<typeof withdrawalPolicyNotice>[0]>;
const politica = (over: Partial<Allowance>): Allowance => ({ policy: 'FREE', withdrawableCents: 10000, openDebtCents: 0, ...over });

describe('withdrawalPolicyNotice', () => {
    it('sem política carregada, ou FREE: nenhum aviso', () => {
        expect(withdrawalPolicyNotice(null, 2)).toBeNull();
        expect(withdrawalPolicyNotice(politica({ policy: 'FREE', openDebtCents: 5000 }), 2)).toBeNull();
    });

    it('BLOCK_IF_OVERDUE com vencida: bloqueio com a contagem', () => {
        expect(withdrawalPolicyNotice(politica({ policy: 'BLOCK_IF_OVERDUE', withdrawableCents: 0, openDebtCents: 5000 }), 2)).toEqual({
            tone: 'block',
            text: 'Saque bloqueado: você tem 2 dívida(s) vencida(s) com a empresa. Devolva o valor para liberar o saque.',
        });
    });

    it('BLOCK_IF_OVERDUE com dívida a vencer (ou contagem indisponível): só o aviso da regra', () => {
        const esperado = { tone: 'info', text: 'Na sua empresa, dívida vencida bloqueia o saque. Devolva o dinheiro até o vencimento.' };
        expect(withdrawalPolicyNotice(politica({ policy: 'BLOCK_IF_OVERDUE', openDebtCents: 5000 }), 0)).toEqual(esperado);
        expect(withdrawalPolicyNotice(politica({ policy: 'BLOCK_IF_OVERDUE', openDebtCents: 5000 }), null)).toEqual(esperado);
    });

    it('BLOCK_IF_OVERDUE sem dívida: nenhum aviso', () => {
        expect(withdrawalPolicyNotice(politica({ policy: 'BLOCK_IF_OVERDUE', openDebtCents: 0 }), 0)).toBeNull();
    });

    it('EXCESS_ONLY com dívida: diz o máximo', () => {
        expect(withdrawalPolicyNotice(politica({ policy: 'EXCESS_ONLY', withdrawableCents: 7000, openDebtCents: 3000 }), 0)).toEqual({
            tone: 'limit',
            text: `Com ${formatCurrency(3000)} em dívidas abertas, você pode sacar até ${formatCurrency(7000)}.`,
        });
    });

    it('EXCESS_ONLY com dívida que cobre o disponível: bloqueio sem "até R$ 0,00"', () => {
        expect(withdrawalPolicyNotice(politica({ policy: 'EXCESS_ONLY', withdrawableCents: 0, openDebtCents: 30000 }), 0)).toEqual({
            tone: 'block',
            text: `Com ${formatCurrency(30000)} em dívidas abertas, não há valor liberado para saque agora.`,
        });
    });
});

describe('withdrawalErrorMessage', () => {
    const erro = (error: Record<string, unknown>) => ({ success: false, error });

    it('WITHDRAWAL_BLOCKED_BY_OVERDUE_DEBT', () => {
        expect(withdrawalErrorMessage(erro({ code: 'WITHDRAWAL_BLOCKED_BY_OVERDUE_DEBT', message: 'x', maxAmountCents: 0 }), 'f')).toBe(
            'Saque bloqueado: você tem dívida vencida com a empresa. Devolva o valor à empresa para liberar o saque.',
        );
    });

    it('WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT com o máximo', () => {
        expect(withdrawalErrorMessage(erro({ code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', message: 'x', maxAmountCents: 4000 }), 'f')).toBe(
            `Você tem dívidas em aberto com a empresa. O máximo que pode sacar agora é ${formatCurrency(4000)}.`,
        );
    });

    it('WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT com máximo 0', () => {
        expect(withdrawalErrorMessage(erro({ code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', message: 'x', maxAmountCents: 0 }), 'f')).toBe(
            'Você tem dívidas em aberto com a empresa e, por enquanto, não há valor liberado para saque.',
        );
    });

    it('WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT sem o máximo (adaptador antigo): a frase do back', () => {
        expect(withdrawalErrorMessage(erro({ code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', message: 'Com R$ 30,00 em dívidas abertas, o saque máximo é R$ 40,00.' }), 'f')).toBe(
            'Com R$ 30,00 em dívidas abertas, o saque máximo é R$ 40,00.',
        );
    });

    it('outro erro: a frase do back; sem frase: o fallback', () => {
        expect(withdrawalErrorMessage(erro({ code: 'BAD_REQUEST', message: 'Saldo disponível insuficiente' }), 'f')).toBe('Saldo disponível insuficiente');
        expect(withdrawalErrorMessage(undefined, 'Não foi possível solicitar o saque.')).toBe('Não foi possível solicitar o saque.');
    });
});

describe('maxWithdrawalFromError', () => {
    it('só devolve o máximo da recusa EXCESS_ONLY, inteiro e > 0', () => {
        expect(maxWithdrawalFromError({ error: { code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', maxAmountCents: 4000 } })).toBe(4000);
        expect(maxWithdrawalFromError({ error: { code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', maxAmountCents: 0 } })).toBeNull();
        expect(maxWithdrawalFromError({ error: { code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', maxAmountCents: 40.5 } })).toBeNull();
        expect(maxWithdrawalFromError({ error: { code: 'WITHDRAWAL_BLOCKED_BY_OVERDUE_DEBT', maxAmountCents: 4000 } })).toBeNull();
        expect(maxWithdrawalFromError(undefined)).toBeNull();
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --watchAll=false carteira/_utils/__tests__/debtPolicy`
Expected: FAIL com `Cannot find module '../debtPolicy'`.

- [ ] **Step 3: Implementar**

`src/app/(auth)/(tabs)/menu/carteira/_utils/debtPolicy.ts`:

```ts
import { mensagemDaApi } from '@/api/apiErrorMessage';
import type { WithdrawalAllowance } from '@/domain/agility/wallet/withdrawalAllowance';
import { formatCurrency } from '@/utils/formatCurrency';

export interface PolicyNotice {
    /** `block`: não dá para sacar agora; `limit`: há teto; `info`: a regra vale, mas não trava hoje. */
    tone: 'block' | 'limit' | 'info';
    text: string;
}

/**
 * O que a política de saque com dívida da empresa (spec 4.4, UC11) significa para o motorista
 * AGORA. `overdueCount` vem de `/wallet/advances/summary` (o `/wallet/summary` não traz);
 * `null` = não carregou, e o texto não afirma bloqueio.
 */
export function withdrawalPolicyNotice(allowance: WithdrawalAllowance | null, overdueCount: number | null): PolicyNotice | null {
    if (!allowance || allowance.policy === 'FREE' || allowance.openDebtCents <= 0) return null;

    if (allowance.policy === 'BLOCK_IF_OVERDUE') {
        if (overdueCount && overdueCount > 0) {
            return {
                tone: 'block',
                text: `Saque bloqueado: você tem ${overdueCount} dívida(s) vencida(s) com a empresa. Devolva o valor para liberar o saque.`,
            };
        }
        return { tone: 'info', text: 'Na sua empresa, dívida vencida bloqueia o saque. Devolva o dinheiro até o vencimento.' };
    }

    // EXCESS_ONLY: só saca o que exceder a dívida em aberto.
    if (allowance.withdrawableCents <= 0) {
        return { tone: 'block', text: `Com ${formatCurrency(allowance.openDebtCents)} em dívidas abertas, não há valor liberado para saque agora.` };
    }
    return {
        tone: 'limit',
        text: `Com ${formatCurrency(allowance.openDebtCents)} em dívidas abertas, você pode sacar até ${formatCurrency(allowance.withdrawableCents)}.`,
    };
}

type ErroSaque = { error?: { code?: unknown; maxAmountCents?: unknown } } | undefined;

const BLOCKED = 'WITHDRAWAL_BLOCKED_BY_OVERDUE_DEBT';
const EXCEEDS = 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT';

/** `maxAmountCents` só chega se o adaptador repassar os extras (Task 1). */
function maxOf(error: unknown): number | null {
    const max = (error as ErroSaque)?.error?.maxAmountCents;
    return typeof max === 'number' && Number.isInteger(max) && max >= 0 ? max : null;
}

/** Mensagem do saque recusado. Os dois códigos da política têm texto do app (R4). */
export function withdrawalErrorMessage(error: unknown, fallback: string): string {
    const code = (error as ErroSaque)?.error?.code;
    if (code === BLOCKED) {
        return 'Saque bloqueado: você tem dívida vencida com a empresa. Devolva o valor à empresa para liberar o saque.';
    }
    if (code === EXCEEDS) {
        const max = maxOf(error);
        if (max !== null) {
            return max > 0
                ? `Você tem dívidas em aberto com a empresa. O máximo que pode sacar agora é ${formatCurrency(max)}.`
                : 'Você tem dívidas em aberto com a empresa e, por enquanto, não há valor liberado para saque.';
        }
    }
    return mensagemDaApi(error, fallback);
}

/** O máximo para a ação "Usar o máximo": só na recusa EXCESS_ONLY e só quando há o que sacar. */
export function maxWithdrawalFromError(error: unknown): number | null {
    if ((error as ErroSaque)?.error?.code !== EXCEEDS) return null;
    const max = maxOf(error);
    return max !== null && max > 0 ? max : null;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --watchAll=false carteira/_utils/__tests__/debtPolicy`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/menu/carteira/_utils/debtPolicy.ts" "src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/debtPolicy.test.ts"
git commit -m "feat(carteira): textos da politica de saque com divida e do erro do saque

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Aviso de troca da chave PIX na carteira

**Files:**
- Create: `src/app/(auth)/(tabs)/menu/carteira/_utils/pixKeyNotice.ts`
- Modify: `src/app/(auth)/(tabs)/menu/carteira/index.tsx`
- Test: `src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/pixKeyNotice.test.ts` (criar)
- Test: `src/app/(auth)/(tabs)/menu/carteira/__tests__/carteira.test.tsx` (acrescentar)

**Interfaces:**
- Consumes: `WalletResponse.pixKey`, `pixKeyChangedAt` e `previousPixKeyMasked` (Task 2); `formatDate` (`src/utils/formatDate.ts`, `DD/MM/AAAA HH:mm` no fuso do aparelho).
- Produces:
  - `PIX_CHANGE_ALERT_DAYS = 7`;
  - `interface PixKeyChangeNotice { recent: boolean; title: string; text: string }`;
  - `pixKeyChangeNotice(w, now?: Date): PixKeyChangeNotice | null`. A Task 6 também usa.

- [ ] **Step 1: Escrever os testes que falham**

`src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/pixKeyNotice.test.ts`:

```ts
import { formatDate } from '@/utils/formatDate';

import { PIX_CHANGE_ALERT_DAYS, pixKeyChangeNotice } from '../pixKeyNotice';

const AGORA = new Date('2026-10-01T15:00:00.000Z');
const HA_1H = '2026-10-01T14:00:00.000Z';
const DIA = 24 * 60 * 60 * 1000;

describe('pixKeyChangeNotice', () => {
    it('sem troca registrada: null', () => {
        expect(pixKeyChangeNotice({ pixKey: 'a@b.com', pixKeyChangedAt: null, previousPixKeyMasked: null }, AGORA)).toBeNull();
        expect(pixKeyChangeNotice(undefined, AGORA)).toBeNull();
    });

    it('troca há 1 hora: alerta com a data, a anterior mascarada e o pedido de falar com a central', () => {
        expect(pixKeyChangeNotice({ pixKey: 'nova@exemplo.com', pixKeyChangedAt: HA_1H, previousPixKeyMasked: '*******1234' }, AGORA)).toEqual({
            recent: true,
            title: 'Chave PIX alterada',
            text: `A chave PIX da sua carteira foi alterada em ${formatDate(HA_1H)}. A anterior era *******1234. Se não foi você, fale com a central antes de pedir saque.`,
        });
    });

    it('primeiro cadastro (sem anterior) não diz "alterada"', () => {
        const n = pixKeyChangeNotice({ pixKey: 'nova@exemplo.com', pixKeyChangedAt: HA_1H, previousPixKeyMasked: null }, AGORA);
        expect(n?.title).toBe('Chave PIX cadastrada');
        expect(n?.text).toBe(`A chave PIX da sua carteira foi cadastrada em ${formatDate(HA_1H)}. Se não foi você, fale com a central antes de pedir saque.`);
    });

    it('chave removida', () => {
        const n = pixKeyChangeNotice({ pixKey: null, pixKeyChangedAt: HA_1H, previousPixKeyMasked: '*******1234' }, AGORA);
        expect(n?.title).toBe('Chave PIX removida');
        expect(n?.text).toContain(`foi removida em ${formatDate(HA_1H)}.`);
    });

    it(`passados ${PIX_CHANGE_ALERT_DAYS} dias: sem alerta, só o registro`, () => {
        const quando = new Date(AGORA.getTime() - PIX_CHANGE_ALERT_DAYS * DIA).toISOString();
        const n = pixKeyChangeNotice({ pixKey: 'nova@exemplo.com', pixKeyChangedAt: quando, previousPixKeyMasked: '*******1234' }, AGORA);
        expect(n?.recent).toBe(false);
        expect(n?.text).toBe(`A chave PIX da sua carteira foi alterada em ${formatDate(quando)}. A anterior era *******1234.`);
    });

    it('data inválida: null', () => {
        expect(pixKeyChangeNotice({ pixKey: 'a@b.com', pixKeyChangedAt: 'ontem', previousPixKeyMasked: null }, AGORA)).toBeNull();
    });
});
```

Em `src/app/(auth)/(tabs)/menu/carteira/__tests__/carteira.test.tsx`, troque a assinatura de `render` para aceitar a carteira:

```tsx
function render(
    adiantamentos: Record<string, unknown> = { summary: { totalPending: 0, count: 0, overdueCount: 0 }, isError: false },
    carteira: Record<string, unknown> = {},
) {
    mockUseGetWallet.mockReturnValue({ wallet: { ...CARTEIRA, ...carteira }, isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false });
```

(o resto do corpo de `render` fica igual) e acrescente, dentro do `describe('Carteira', …)`:

```tsx
    it('chave PIX trocada há 1 hora: alerta no topo com a chave anterior mascarada', () => {
        const tree = render(undefined, {
            hasBankInfo: true,
            pixKey: 'nova@exemplo.com',
            pixKeyChangedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            previousPixKeyMasked: '*******1234',
        });
        expect(tree.root.findAllByProps({ testID: 'aviso-chave-pix' }).length).toBeGreaterThan(0);
        expect(texto(tree, 'aviso-chave-pix-texto')).toContain('A anterior era *******1234.');
        expect(texto(tree, 'aviso-chave-pix-texto')).toContain('Se não foi você, fale com a central');
    });

    it('troca de 30 dias atrás: sem alerta, só o registro junto da chave', () => {
        const tree = render(undefined, {
            hasBankInfo: true,
            pixKey: 'nova@exemplo.com',
            pixKeyChangedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            previousPixKeyMasked: '*******1234',
        });
        expect(tree.root.findAllByProps({ testID: 'aviso-chave-pix' })).toHaveLength(0);
        expect(texto(tree, 'chave-pix-alterada-em')).toContain('foi alterada em');
    });

    it('sem troca registrada: nenhum aviso de chave', () => {
        const tree = render(undefined, { hasBankInfo: true, pixKey: 'nova@exemplo.com', pixKeyChangedAt: null, previousPixKeyMasked: null });
        expect(tree.root.findAllByProps({ testID: 'aviso-chave-pix' })).toHaveLength(0);
        expect(tree.root.findAllByProps({ testID: 'chave-pix-alterada-em' })).toHaveLength(0);
    });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --watchAll=false carteira/_utils/__tests__/pixKeyNotice menu/carteira/__tests__/carteira`
Expected: FAIL. `Cannot find module '../pixKeyNotice'`, e os três testes novos da carteira falham (`aviso-chave-pix` ausente).

- [ ] **Step 3: Implementar**

`src/app/(auth)/(tabs)/menu/carteira/_utils/pixKeyNotice.ts`:

```ts
import type { WalletResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { formatDate } from '@/utils/formatDate';

/** Por quantos dias a troca aparece como ALERTA (R2). Depois, só o registro em cinza. */
export const PIX_CHANGE_ALERT_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PixKeyChangeNotice {
    /** Troca nos últimos `PIX_CHANGE_ALERT_DAYS` dias: banner de alerta. */
    recent: boolean;
    title: string;
    text: string;
}

type W = Pick<WalletResponse, 'pixKey' | 'pixKeyChangedAt' | 'previousPixKeyMasked'>;

/**
 * Troca de chave PIX é o passo do golpe que redireciona o saque (F3, Ruling 26). O back registra
 * `pixKeyChangedAt` e a anterior mascarada; o primeiro cadastro também conta como troca, por
 * isso o texto distingue cadastro, troca e remoção. A anterior aparece como o back mascarou.
 */
export function pixKeyChangeNotice(w: W | null | undefined, now: Date = new Date()): PixKeyChangeNotice | null {
    const changedAt = w?.pixKeyChangedAt;
    if (!changedAt) return null;
    const when = new Date(changedAt);
    if (isNaN(when.getTime())) return null;

    const quando = formatDate(when);
    const anterior = w?.previousPixKeyMasked?.trim() || null;
    const atual = w?.pixKey?.trim() || null;

    let title: string;
    let base: string;
    if (!atual) {
        title = 'Chave PIX removida';
        base = `A chave PIX da sua carteira foi removida em ${quando}.`;
    } else if (!anterior) {
        title = 'Chave PIX cadastrada';
        base = `A chave PIX da sua carteira foi cadastrada em ${quando}.`;
    } else {
        title = 'Chave PIX alterada';
        base = `A chave PIX da sua carteira foi alterada em ${quando}. A anterior era ${anterior}.`;
    }

    const recent = now.getTime() - when.getTime() < PIX_CHANGE_ALERT_DAYS * DAY_MS;
    return { recent, title, text: recent ? `${base} Se não foi você, fale com a central antes de pedir saque.` : base };
}
```

Em `src/app/(auth)/(tabs)/menu/carteira/index.tsx`:

1. Acrescente o import, depois do import de `formatCurrency`:

```tsx

import { pixKeyChangeNotice } from './_utils/pixKeyNotice';
```

2. Logo depois de `const hasOverdue = (advances?.overdueCount ?? 0) > 0;`:

```tsx
    // Calculado no render (sem memo): é barato, e o React Compiler não precisa de deps.
    const pixNotice = pixKeyChangeNotice(wallet);
```

3. Logo depois de `<ScrollView refreshControl={…}>` e do `<Box>` que o segue, **antes** do comentário `{/* Os quatro números vêm prontos do GET /wallet (F2); nenhum é somado aqui. */}`:

```tsx
                    {/* Troca de chave PIX recente (F3): o golpe que redireciona o saque. */}
                    {pixNotice?.recent && (
                        <Box testID="aviso-chave-pix" p="m16" mb="b16" borderRadius="s12" borderWidth={1} borderColor="redError">
                            <Box flexDirection="row" alignItems="center">
                                <Ionicons name="warning" size={16} color="#F44336" />
                                <Text ml="l8" fontSize={measure.m14} fontWeightPreset="bold" color="colorTextError">
                                    {pixNotice.title}
                                </Text>
                            </Box>
                            <Text testID="aviso-chave-pix-texto" mt="t8" fontSize={measure.m13} color="colorTextSecondary">
                                {pixNotice.text}
                            </Text>
                        </Box>
                    )}
```

4. No bloco de dados bancários, dentro do `<Box>` de `{!!wallet.pixKey && (…)}`, logo depois do `<Text …>{wallet.pixKey}</Text>`:

```tsx
                                            {pixNotice && !pixNotice.recent && (
                                                <Text testID="chave-pix-alterada-em" fontSize={measure.m11} color="colorTextSecondary" mt="t4">
                                                    {pixNotice.text}
                                                </Text>
                                            )}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --watchAll=false carteira/_utils/__tests__/pixKeyNotice menu/carteira/__tests__/carteira`
Expected: PASS (os novos e os quatro antigos da carteira).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/menu/carteira/_utils/pixKeyNotice.ts" "src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/pixKeyNotice.test.ts" "src/app/(auth)/(tabs)/menu/carteira/index.tsx" "src/app/(auth)/(tabs)/menu/carteira/__tests__/carteira.test.tsx"
git commit -m "feat(carteira): aviso de troca da chave PIX com a anterior mascarada

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Destino do saque e chave trocada depois do pedido

**Files:**
- Modify: `src/app/(auth)/(tabs)/menu/carteira/_utils/withdrawalDisplay.ts`
- Modify: `src/app/(auth)/(tabs)/menu/carteira/saques.tsx`
- Test: `src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/withdrawalDisplay.test.ts` (acrescentar)

**Interfaces:**
- Consumes: `WithdrawalResponse.pixKeyChangedAfterRequest` (Task 2).
- Produces:
  - `WithdrawalDisplay.pixNote: string | null`;
  - `walletDestination(w: Pick<WalletResponse, 'pixKey' | 'bankName' | 'bankAgency' | 'bankAccount'>): string`, que a Task 6 usa no modal.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `withdrawalDisplay.test.ts`. Troque o import do topo por `import { describeWithdrawal, walletDestination } from '../withdrawalDisplay';` e cole no fim do arquivo:

```ts
describe('chave trocada depois do pedido (F3, R1)', () => {
    const AVISO =
        'Sua chave PIX mudou depois deste pedido. O pagamento vai para o destino acima, gravado no pedido. Se não foi você quem trocou a chave, fale com a central.';

    it('saque aguardando com a chave trocada depois: aviso', () => {
        expect(describeWithdrawal(saque({ pixKeyChangedAfterRequest: true } as Partial<W>)).pixNote).toBe(AVISO);
        expect(describeWithdrawal(saque({ status: 'PROCESSING' as W['status'], pixKeyChangedAfterRequest: true } as Partial<W>)).pixNote).toBe(AVISO);
    });

    it('saque já pago, recusado ou sem troca: sem aviso', () => {
        expect(describeWithdrawal(saque({ status: 'COMPLETED' as W['status'], pixKeyChangedAfterRequest: true } as Partial<W>)).pixNote).toBeNull();
        expect(describeWithdrawal(saque({ status: 'CANCELLED' as W['status'], pixKeyChangedAfterRequest: true } as Partial<W>)).pixNote).toBeNull();
        expect(describeWithdrawal(saque({ pixKeyChangedAfterRequest: false } as Partial<W>)).pixNote).toBeNull();
        expect(describeWithdrawal(saque()).pixNote).toBeNull();
    });
});

describe('walletDestination', () => {
    it('com chave PIX: o back paga por PIX', () => {
        expect(walletDestination({ pixKey: 'nova@exemplo.com', bankName: 'Banco X', bankAgency: '1', bankAccount: '2' })).toBe('PIX: nova@exemplo.com');
    });

    it('sem chave: TED com a conta', () => {
        expect(walletDestination({ pixKey: null, bankName: 'Banco X', bankAgency: '0001', bankAccount: '12345-6' })).toBe(
            'TED: Banco X · Ag. 0001 · Conta 12345-6',
        );
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --watchAll=false carteira/_utils/__tests__/withdrawalDisplay`
Expected: FAIL (`walletDestination` não exportado; `pixNote` `undefined`).

- [ ] **Step 3: Implementar**

Em `withdrawalDisplay.ts`:

1. Troque os imports por:

```ts
import type { WalletResponse, WithdrawalResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { WithdrawalMethod, WithdrawalStatus } from '@/domain/agility/wallet/dto/types';
import type { StatusColorConfig } from '@/theme';
```

2. Troque `type W = …` e a interface por:

```ts
type Destino = Pick<WithdrawalResponse, 'method' | 'pixKey' | 'bankName' | 'bankAgency' | 'bankAccount'>;
type W = Destino & Pick<WithdrawalResponse, 'status' | 'rejectionReason' | 'lastError' | 'pixKeyChangedAfterRequest'>;

export interface WithdrawalDisplay {
    status: StatusColorConfig;
    /** Para onde o dinheiro foi (snapshot gravado no pedido, não os dados de hoje). */
    destination: string;
    note: string | null;
    /** A chave da carteira mudou DEPOIS do pedido (F3). Só enquanto o saque não foi decidido. */
    pixNote: string | null;
}
```

3. Troque a assinatura `function destinationOf(w: W): string {` por `function destinationOf(w: Destino): string {` (o corpo fica igual).

4. Antes de `export function describeWithdrawal`, acrescente:

```ts
/**
 * R1: o back expõe `pixKeyChangedAfterRequest` também ao motorista. Quem trocou a chave sem
 * ele saber é exatamente o caso que ele precisa ver; o dinheiro vai para o destino do pedido.
 */
function pixNoteOf(w: W): string | null {
    if (!w.pixKeyChangedAfterRequest) return null;
    if (w.status !== WithdrawalStatus.PENDING && w.status !== WithdrawalStatus.PROCESSING) return null;
    return 'Sua chave PIX mudou depois deste pedido. O pagamento vai para o destino acima, gravado no pedido. Se não foi você quem trocou a chave, fale com a central.';
}
```

5. Em `describeWithdrawal`, acrescente `pixNote: pixNoteOf(w),` ao objeto devolvido.

6. No fim do arquivo:

```ts
/** Para onde um saque pedido AGORA iria: o back escolhe PIX se há chave, senão TED (`withdrawal.service.ts`). */
export function walletDestination(w: Pick<WalletResponse, 'pixKey' | 'bankName' | 'bankAgency' | 'bankAccount'>): string {
    return destinationOf({
        method: w.pixKey ? WithdrawalMethod.PIX : WithdrawalMethod.TED,
        pixKey: w.pixKey ?? null,
        bankName: w.bankName ?? null,
        bankAgency: w.bankAgency ?? null,
        bankAccount: w.bankAccount ?? null,
    });
}
```

Em `saques.tsx`, logo depois do bloco `{display.note && (…)}`:

```tsx
            {display.pixNote && (
                <Text testID={`aviso-chave-${item.id}`} fontSize={measure.m12} color="colorTextWarning" mt="t8">
                    {display.pixNote}
                </Text>
            )}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --watchAll=false carteira/_utils/__tests__/withdrawalDisplay`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/menu/carteira/_utils/withdrawalDisplay.ts" "src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/withdrawalDisplay.test.ts" "src/app/(auth)/(tabs)/menu/carteira/saques.tsx"
git commit -m "feat(saques): aviso de chave PIX trocada depois do pedido e destino da carteira

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Saque com a política de dívida, o máximo e o destino

**Files:**
- Modify (reescrever): `src/app/(auth)/(tabs)/menu/carteira/saque.tsx`
- Test: `src/app/(auth)/(tabs)/menu/carteira/__tests__/saque.test.tsx` (acrescentar)

**Interfaces:**
- Consumes:
  - `useWithdrawalAllowance` e `withdrawCapCents` (Task 2);
  - `withdrawalPolicyNotice`, `withdrawalErrorMessage` e `maxWithdrawalFromError` (Task 3);
  - `pixKeyChangeNotice` (Task 4);
  - `walletDestination` (Task 5);
  - `useGetAdvancesSummary` (existe).
- Produces: a tela, com os testIDs `aviso-politica-divida`, `aviso-politica-divida-texto` e `sacar-tudo`.

- [ ] **Step 1: Escrever os testes que falham**

Em `saque.test.tsx`:

1. Troque o mock do modal por um que guarde também o `text`:

```tsx
type ModalProps = { isVisible: boolean; text?: string; onPress?: () => Promise<void> | void; onClose: () => void };
let mockModalProps: ModalProps | null = null;
jest.mock('@/components/Modal/Modal', () => ({
    __esModule: true,
    default: (props: ModalProps) => {
        mockModalProps = props;
        return null;
    },
}));
```

2. Troque `type MockWallet` e o mock do barrel por:

```tsx
type MockWallet =
    | {
          availableBalance: number;
          hasBankInfo: boolean;
          balance: number;
          pixKey?: string | null;
          pixKeyChangedAt?: string | null;
          previousPixKeyMasked?: string | null;
      }
    | undefined;
const mockUseGetWallet = jest.fn<
    { wallet: MockWallet; isLoading: boolean; isError: boolean; refetch: typeof mockRefetchWallet },
    []
>(() => ({
    wallet: { availableBalance: 10000, hasBankInfo: true, balance: 10000 },
    isLoading: false,
    isError: false,
    refetch: mockRefetchWallet,
}));
const mockUseWithdrawalAllowance = jest.fn<{ allowance: unknown }, []>(() => ({ allowance: null }));
const mockUseGetAdvancesSummary = jest.fn<{ summary: unknown }, []>(() => ({ summary: undefined }));
jest.mock('@/domain/agility/wallet', () => ({
    useGetWallet: () => mockUseGetWallet(),
    useRequestWithdrawal: () => ({ requestWithdrawal: mockRequestWithdrawal, isPending: false }),
    useWithdrawalAllowance: () => mockUseWithdrawalAllowance(),
    useGetAdvancesSummary: () => mockUseGetAdvancesSummary(),
}));
```

3. No `beforeEach`, acrescente:

```tsx
    mockUseWithdrawalAllowance.mockReturnValue({ allowance: null });
    mockUseGetAdvancesSummary.mockReturnValue({ summary: undefined });
```

4. Acrescente `import { formatCurrency } from '@/utils/formatCurrency';` aos imports e, depois de `botao`, os helpers:

```tsx
const campo = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAll((n) => typeof n.props.onChangeCents === 'function')[0];
const texto = (tree: TestRenderer.ReactTestRenderer, testID: string) => tree.root.findAllByProps({ testID })[0]?.props.children;
```

5. Acrescente um `describe` novo no fim do arquivo:

```tsx
describe('Saque — política de dívida (F3)', () => {
    it('EXCESS_ONLY: o teto do campo e o "Sacar tudo" são o máximo da política, com o aviso', () => {
        mockUseWithdrawalAllowance.mockReturnValue({ allowance: { policy: 'EXCESS_ONLY', withdrawableCents: 7000, openDebtCents: 3000 } });
        const tree = render();

        expect(campo(tree).props.maxCents).toBe(7000);
        expect(tree.root.findAllByProps({ testID: 'sacar-tudo' })[0].props.disabled).toBe(false);
        expect(texto(tree, 'aviso-politica-divida-texto')).toBe(
            `Com ${formatCurrency(3000)} em dívidas abertas, você pode sacar até ${formatCurrency(7000)}.`,
        );
    });

    it('valor acima do teto da política: não abre o modal e diz o máximo', () => {
        mockUseWithdrawalAllowance.mockReturnValue({ allowance: { policy: 'EXCESS_ONLY', withdrawableCents: 7000, openDebtCents: 3000 } });
        const tree = render();
        digitarEPedir(tree, 8000);

        expect(mockModalProps?.isVisible).toBe(false);
        expect(mockShowToast).toHaveBeenCalledWith({
            message: `Pela regra de dívidas da empresa, o máximo agora é ${formatCurrency(7000)}`,
            type: 'error',
        });
    });

    it('back recusa pela política com o máximo: mensagem com o valor, ação que só preenche o campo', async () => {
        mockRequestWithdrawal.mockRejectedValue({
            success: false,
            error: { code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', message: 'Com R$ 60,00 em dívidas abertas, o saque máximo é R$ 40,00.', maxAmountCents: 4000 },
        });
        const tree = render();
        digitarEPedir(tree, 5000);

        await act(async () => {
            await mockModalProps!.onPress!();
        });

        const toast = mockShowToast.mock.calls[mockShowToast.mock.calls.length - 1][0];
        expect(toast.message).toBe(`Você tem dívidas em aberto com a empresa. O máximo que pode sacar agora é ${formatCurrency(4000)}.`);
        expect(toast.type).toBe('error');
        expect(toast.action.title).toBe('Usar o máximo');

        act(() => {
            toast.action.onPress();
        });
        expect(campo(tree).props.valueCents).toBe(4000);
        expect(mockRequestWithdrawal).toHaveBeenCalledTimes(1);
        expect(mockRouter.replace).not.toHaveBeenCalled();
        expect(botao(tree).props.disabled).toBe(false);
    });

    it('BLOCK_IF_OVERDUE com dívida vencida: aviso de bloqueio, "Sacar tudo" e o botão travados', () => {
        mockUseWithdrawalAllowance.mockReturnValue({ allowance: { policy: 'BLOCK_IF_OVERDUE', withdrawableCents: 0, openDebtCents: 5000 } });
        mockUseGetAdvancesSummary.mockReturnValue({ summary: { totalPending: 5000, count: 1, overdueCount: 1 } });
        const tree = render();

        expect(texto(tree, 'aviso-politica-divida-texto')).toBe(
            'Saque bloqueado: você tem 1 dívida(s) vencida(s) com a empresa. Devolva o valor para liberar o saque.',
        );
        expect(tree.root.findAllByProps({ testID: 'sacar-tudo' })[0].props.disabled).toBe(true);
        act(() => {
            campo(tree).props.onChangeCents(5000);
        });
        expect(botao(tree).props.disabled).toBe(true);
    });

    it('resumo da política indisponível: teto é o disponível e nenhum aviso inventado', () => {
        mockUseWithdrawalAllowance.mockReturnValue({ allowance: null });
        const tree = render();
        expect(campo(tree).props.maxCents).toBe(10000);
        expect(tree.root.findAllByProps({ testID: 'aviso-politica-divida' })).toHaveLength(0);
    });

    it('modal mostra o destino e o alerta de chave trocada recentemente', () => {
        mockUseGetWallet.mockReturnValue({
            wallet: {
                availableBalance: 10000,
                hasBankInfo: true,
                balance: 10000,
                pixKey: 'nova@exemplo.com',
                pixKeyChangedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                previousPixKeyMasked: '*******1234',
            },
            isLoading: false,
            isError: false,
            refetch: mockRefetchWallet,
        });
        const tree = render();
        digitarEPedir(tree, 5000);

        expect(mockModalProps?.isVisible).toBe(true);
        expect(mockModalProps?.text).toContain('Destino: PIX: nova@exemplo.com');
        expect(mockModalProps?.text).toContain('Atenção: A chave PIX da sua carteira foi alterada em');
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --watchAll=false menu/carteira/__tests__/saque`
Expected: os 5 testes antigos PASSAM, e os 6 novos FALHAM (`maxCents` 10000 em vez de 7000, `sacar-tudo`/`aviso-politica-divida` ausentes, sem `action` no toast, sem "Destino:" no modal).

- [ ] **Step 3: Implementar**

Reescreva `src/app/(auth)/(tabs)/menu/carteira/saque.tsx` inteiro com Write:

```tsx
// src/app/(auth)/(tabs)/menu/carteira/saque.tsx

import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, BRLInput, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import Modal from '@/components/Modal/Modal';
import { useGetAdvancesSummary, useGetWallet, useRequestWithdrawal, useWithdrawalAllowance } from '@/domain/agility/wallet';
import { withdrawCapCents } from '@/domain/agility/wallet/withdrawalAllowance';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { maxWithdrawalFromError, withdrawalErrorMessage, withdrawalPolicyNotice } from './_utils/debtPolicy';
import { pixKeyChangeNotice } from './_utils/pixKeyNotice';
import { walletDestination } from './_utils/withdrawalDisplay';

const MIN_WITHDRAWAL_CENTS = 100; // R$ 1,00, o mesmo @Min(100) do CreateWithdrawalDto

export default function SaqueScreen() {
    const router = useRouter();
    const { showToast } = useToastService();
    const [amountCents, setAmountCents] = useState<number | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const { wallet, isLoading: isLoadingWallet, isError: isWalletError, refetch: refetchWallet } = useGetWallet();
    const { allowance } = useWithdrawalAllowance();
    const { summary: debts } = useGetAdvancesSummary();
    const { requestWithdrawal } = useRequestWithdrawal();
    const { run, isSubmitting, isLocked } = useSubmitLock();

    const availableBalance = wallet?.availableBalance ?? 0;
    // Teto = menor entre o disponível e o que a política de dívida deixa (F3). Sem o resumo
    // (carregando, erro, back sem F3), o teto é o disponível e o back decide (R3).
    const cap = withdrawCapCents(availableBalance, allowance);
    const limitedByDebt = cap < Math.max(0, availableBalance);
    const value = amountCents ?? 0;
    const policyNotice = withdrawalPolicyNotice(allowance, debts?.overdueCount ?? null);
    const pixNotice = pixKeyChangeNotice(wallet);

    function goToBankInfo() {
        router.push('/menu/carteira/config/dados-bancarios');
    }

    function goToDebts() {
        router.push('/menu/carteira/adiantamentos');
    }

    function handleRequestSaque() {
        // Com um pedido em voo, reabrir o modal permitiria um segundo POST.
        if (isLocked()) return;
        if (value < MIN_WITHDRAWAL_CENTS) {
            showToast({ message: 'O valor mínimo para saque é R$ 1,00', type: 'error' });
            return;
        }
        if (value > cap) {
            showToast({
                message: limitedByDebt
                    ? `Pela regra de dívidas da empresa, o máximo agora é ${formatCurrency(cap)}`
                    : 'Saldo insuficiente para este saque',
                type: 'error',
            });
            return;
        }
        if (!wallet?.hasBankInfo) {
            showToast({
                message: 'Configure seus dados bancários antes de sacar',
                type: 'error',
                action: { title: 'Configurar', onPress: goToBankInfo },
            });
            return;
        }
        setShowConfirmModal(true);
    }

    async function handleConfirmSaque() {
        setShowConfirmModal(false);
        await run(async () => {
            try {
                await requestWithdrawal({ amount: value });
                showToast({ message: 'Saque solicitado. Acompanhe em Meus saques.', type: 'success' });
                // `replace`: voltar não reabre o formulário preenchido (R10 da F5).
                router.replace('/menu/carteira/saques');
            } catch (error) {
                // O valor digitado fica. A recusa pela política de dívida (F3) traz o máximo: a
                // mensagem diz o número e a ação SÓ preenche o campo — enviar é outro toque.
                const max = maxWithdrawalFromError(error);
                showToast({
                    message: withdrawalErrorMessage(error, 'Não foi possível solicitar o saque. Tente novamente.'),
                    type: 'error',
                    ...(max !== null ? { action: { title: 'Usar o máximo', onPress: () => setAmountCents(max) } } : {}),
                });
            }
        });
    }

    if (isLoadingWallet) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Saque</Text>}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    // GET /wallet falhou e não há nada em cache: mostrar R$ 0,00 + "Configure seus dados
    // bancários" mentiria. Erro pede "Tentar novamente", nunca cai no vazio.
    if (isWalletError && !wallet) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Saque</Text>}>
                <Box flex={1} justifyContent="center" alignItems="center" p="m24">
                    <Ionicons name="alert-circle" size={40} color="#F44336" />
                    <Text mt="t16" color="colorTextSecondary" textAlign="center">
                        Não foi possível carregar sua carteira.
                    </Text>
                    <TouchableOpacityBox
                        testID="saque-carteira-erro"
                        accessibilityRole="button"
                        mt="t16"
                        p="m12"
                        onPress={() => refetchWallet()}
                    >
                        <Text color="colorTextPrimary" fontWeightPreset="semibold">
                            Tentar novamente
                        </Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    const invalid = value < MIN_WITHDRAWAL_CENTS || value > cap || !wallet?.hasBankInfo;
    const disabledReason = !wallet?.hasBankInfo
        ? 'Configure seus dados bancários para sacar'
        : value < MIN_WITHDRAWAL_CENTS
            ? `Valor mínimo: ${formatCurrency(MIN_WITHDRAWAL_CENTS)}`
            : value > cap
                ? limitedByDebt
                    ? `Máximo pela regra de dívidas: ${formatCurrency(cap)}`
                    : 'Valor maior que o saldo disponível'
                : null;

    // Destino e alerta de chave (F3): o motorista confere PARA ONDE vai antes de confirmar (R9).
    const confirmText = [
        `Deseja solicitar o saque de ${formatCurrency(value)}?`,
        wallet ? `Destino: ${walletDestination(wallet)}` : null,
        pixNotice?.recent ? `Atenção: ${pixNotice.text}` : null,
        'O valor sai do disponível e fica em "Saque pendente" até o pagamento.',
    ]
        .filter(Boolean)
        .join('\n\n');

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Saque</Text>}>
            <ScrollView>
                <Box pt="t16">
                    <Box mt="t24" p="m20" borderRadius="s16" alignItems="center">
                        <Text fontSize={measure.m14} color="colorTextSecondary">
                            Disponível para saque
                        </Text>
                        <Text fontSize={28} fontWeight="bold" mt="t8" color="colorTextSuccess">
                            {formatCurrency(availableBalance)}
                        </Text>
                    </Box>

                    {policyNotice && (
                        <TouchableOpacityBox
                            testID="aviso-politica-divida"
                            mt="t16"
                            p="m16"
                            borderRadius="s12"
                            backgroundColor="gray50"
                            onPress={goToDebts}
                            accessibilityRole="button"
                        >
                            <Text
                                testID="aviso-politica-divida-texto"
                                fontSize={measure.m13}
                                color={policyNotice.tone === 'block' ? 'colorTextError' : 'colorTextWarning'}
                            >
                                {policyNotice.text}
                            </Text>
                            <Text mt="t4" fontSize={measure.m12} color="colorTextPrimary">
                                Ver o que devo à empresa
                            </Text>
                        </TouchableOpacityBox>
                    )}

                    <Box mt="t24">
                        <Text fontSize={measure.m14} fontWeightPreset="semibold" mb="b8">
                            Valor do saque
                        </Text>
                        <BRLInput valueCents={amountCents} onChangeCents={setAmountCents} maxCents={cap} placeholder="R$ 0,00" />

                        <TouchableOpacityBox
                            testID="sacar-tudo"
                            mt="t8"
                            onPress={() => setAmountCents(cap)}
                            disabled={cap < MIN_WITHDRAWAL_CENTS || isSubmitting}
                        >
                            <Text fontSize={measure.m12} color="colorTextPrimary">
                                {`Sacar tudo (${formatCurrency(cap)})`}
                            </Text>
                        </TouchableOpacityBox>
                    </Box>

                    {value > 0 && (
                        <Box mt="t24" p="m16" borderRadius="s12">
                            <Box flexDirection="row" justifyContent="space-between">
                                <Text color="colorTextSecondary">Valor solicitado</Text>
                                <Text fontWeightPreset="semibold">{formatCurrency(value)}</Text>
                            </Box>
                            <Box flexDirection="row" justifyContent="space-between" mt="t12" pt="t12" borderTopWidth={1}>
                                <Text fontWeightPreset="bold">Você recebe</Text>
                                <Text fontWeightPreset="bold" color="colorTextSuccess">
                                    {formatCurrency(value)}
                                </Text>
                            </Box>
                        </Box>
                    )}

                    <TouchableOpacityBox mt="t24" onPress={goToBankInfo} flexDirection="row" alignItems="center">
                        <Ionicons
                            name={wallet?.hasBankInfo ? 'checkmark-circle' : 'alert-circle'}
                            size={measure.m20}
                            color={wallet?.hasBankInfo ? '#4CAF50' : '#FF9800'}
                        />
                        <Text ml="l8" color="colorTextSecondary" flex={1}>
                            {wallet?.hasBankInfo ? 'Dados bancários configurados' : 'Configure seus dados bancários (toque para abrir)'}
                        </Text>
                        <Ionicons name="chevron-forward" size={measure.m16} color="#9CA3AF" />
                    </TouchableOpacityBox>

                    <Box mt="t32" mb="b8">
                        <Button title="Solicitar Saque" onPress={handleRequestSaque} isLoading={isSubmitting} disabled={invalid || isSubmitting} />
                    </Box>

                    {disabledReason && (
                        <Text fontSize={measure.m12} color="colorTextSecondary" textAlign="center" mb="b16">
                            {disabledReason}
                        </Text>
                    )}

                    <Box p="m16" borderRadius="s12" mt="t16">
                        <Text fontSize={measure.m12} color="colorTextSecondary" textAlign="center">
                            O saque é pago pela empresa, normalmente em até 24 horas úteis. Até lá, o valor sai do disponível e fica em
                            &quot;Saque pendente&quot;.
                        </Text>
                    </Box>
                </Box>
            </ScrollView>

            <Modal
                preset="action"
                isVisible={showConfirmModal && !isSubmitting}
                title="Confirmar saque"
                text={confirmText}
                buttonActionTitle="Confirmar"
                buttonCloseTitle="Cancelar"
                onPress={handleConfirmSaque}
                onClose={() => setShowConfirmModal(false)}
            />
        </ScreenBase>
    );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --watchAll=false menu/carteira/__tests__/saque`
Expected: PASS, os 11. O "back recusa" antigo continua com `{ message: 'Saldo disponível insuficiente', type: 'error' }` exato, sem `action`.
Run: `npx tsc --noEmit && npx eslint "src/app/(auth)/(tabs)/menu/carteira"`
Expected: sem saída do `tsc`; eslint com `0 errors`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/menu/carteira/saque.tsx" "src/app/(auth)/(tabs)/menu/carteira/__tests__/saque.test.tsx"
git commit -m "feat(saque): teto pela politica de divida, mensagem com o maximo e destino no modal

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: A notificação da troca de chave leva à carteira

A notificação `wallet.pix_key_changed` vem como `SYSTEM_ALERT` **sem `linkUrl`**. Hoje o toque não leva a lugar nenhum: o item da lista, o banner e o push ficam mortos.

**Files:**
- Modify: `src/domain/agility/notification/notificationTarget.ts`
- Modify: `src/services/notification/notificationRoutes.ts`
- Modify: `src/services/notification/NotificationContext.tsx` (`handleNotificationNavigation`)
- Test: `src/domain/agility/notification/__tests__/notificationTarget.test.ts` (acrescentar)
- Test: `src/services/notification/__tests__/notificationRoutes.test.ts` (criar)

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces:
  - `ehAvisoDeChavePix(dados: { type?: unknown; walletId?: unknown; changedAt?: unknown } | null | undefined): boolean`;
  - `resolverDestinoDaNotificacao` devolve `{ tipo: 'caminho', caminho: '/menu/carteira' }` para o aviso;
  - `notificationRoutes.carteira()`.

- [ ] **Step 1: Escrever os testes que falham**

Em `notificationTarget.test.ts`, acrescente `ehAvisoDeChavePix` ao import de `'../notificationTarget'` e, no fim do arquivo:

```ts
describe('aviso de troca da chave PIX (F3)', () => {
    const metadata = { walletId: 'w-1', changedAt: '2026-10-01T14:00:00.000Z', previousPixKeyMasked: '*******1234' };

    it('SYSTEM_ALERT com walletId e changedAt, sem linkUrl, leva à carteira', () => {
        expect(resolverDestinoDaNotificacao(notificacao({ type: NotificationType.SYSTEM_ALERT, metadata }))).toEqual({
            tipo: 'caminho',
            caminho: '/menu/carteira',
        });
    });

    it('linkUrl explícito do back continua ganhando', () => {
        expect(resolverDestinoDaNotificacao(notificacao({ metadata, linkUrl: '/menu/carteira/saques' }))).toEqual({
            tipo: 'caminho',
            caminho: '/menu/carteira/saques',
        });
    });

    it('SYSTEM_ALERT sem os campos da carteira segue sem destino', () => {
        expect(resolverDestinoDaNotificacao(notificacao({ metadata: { foo: 1 } }))).toBeNull();
    });

    it('ehAvisoDeChavePix lê os dados achatados do push', () => {
        expect(ehAvisoDeChavePix({ type: 'SYSTEM_ALERT', walletId: 'w-1', changedAt: '2026-10-01T14:00:00.000Z' })).toBe(true);
        expect(ehAvisoDeChavePix({ type: 'ROUTE_COMPLETED', walletId: 'w-1', changedAt: '2026-10-01T14:00:00.000Z' })).toBe(false);
        expect(ehAvisoDeChavePix({ type: 'SYSTEM_ALERT', walletId: 'w-1' })).toBe(false);
        expect(ehAvisoDeChavePix(undefined)).toBe(false);
    });
});
```

`src/services/notification/__tests__/notificationRoutes.test.ts`:

```ts
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
    router: { navigate: (...args: unknown[]) => mockNavigate(...args), replace: jest.fn(), push: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { notificationRoutes } = require('../notificationRoutes');

it('"carteira" abre a carteira (push da troca da chave PIX, F3)', () => {
    notificationRoutes.carteira();
    expect(mockNavigate).toHaveBeenCalledWith('/(auth)/(tabs)/menu/carteira');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --watchAll=false notification/__tests__/notificationTarget services/notification/__tests__/notificationRoutes`
Expected: FAIL (`ehAvisoDeChavePix` não exportado; destino `null`; `notificationRoutes.carteira is not a function`).

- [ ] **Step 3: Implementar**

Em `notificationTarget.ts`, antes de `export function resolverDestinoDaNotificacao`:

```ts
/**
 * Aviso de troca da chave PIX (F3, `notification.listener.ts` `handlePixKeyChanged` no back):
 * `SYSTEM_ALERT` sem `linkUrl`, com `walletId` e `changedAt` no metadata. No push, os mesmos
 * campos vêm achatados em `data` (R10).
 */
export function ehAvisoDeChavePix(dados: { type?: unknown; walletId?: unknown; changedAt?: unknown } | null | undefined): boolean {
    return dados?.type === NotificationType.SYSTEM_ALERT && typeof dados.walletId === 'string' && typeof dados.changedAt === 'string';
}
```

No `switch`, no ramo `case NotificationType.SYSTEM_ALERT:` + `default:`, como **primeira** linha do bloco:

```ts
            // `type` depois do spread: um `metadata.type` nunca substitui o tipo da notificação.
            if (!notification.linkUrl && ehAvisoDeChavePix({ ...(notification.metadata ?? {}), type: notification.type })) {
                return caminho('/menu/carteira');
            }
```

Em `notificationRoutes.ts`, no bloco `// Menu`, logo depois de `menu: () => …,`:

```ts
    // Carteira: push da troca de chave PIX (F3), que não traz `route` do back.
    carteira: () => router.navigate('/(auth)/(tabs)/menu/carteira' as Href),
```

Em `NotificationContext.tsx`, acrescente o import:

```ts
import { ehAvisoDeChavePix } from "@/domain/agility/notification/notificationTarget";
```

e em `handleNotificationNavigation`, logo depois do bloco `if (isOfferPush) { … }`:

```ts
      // Aviso de troca da chave PIX (F3): o back não manda `route`, e os dados vêm achatados
      // do metadata (`walletId`, `changedAt`). Leva à carteira, onde está o alerta.
      if (!data.route && !data.screen && ehAvisoDeChavePix(data)) {
        data = { ...data, route: "carteira" };
      }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --watchAll=false notification/__tests__ services/notificationBanner`
Expected: PASS (os novos, os antigos de `notificationTarget` e o `NotificationBannerProvider`).
Run: `npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add src/domain/agility/notification/notificationTarget.ts src/domain/agility/notification/__tests__/notificationTarget.test.ts src/services/notification/notificationRoutes.ts src/services/notification/NotificationContext.tsx src/services/notification/__tests__/notificationRoutes.test.ts
git commit -m "feat(notificacao): aviso de troca da chave PIX abre a carteira

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Dívidas com origem, cancelamento e política de saque

**Files:**
- Modify: `src/app/(auth)/(tabs)/menu/carteira/_utils/advanceDisplay.ts`
- Modify: `src/app/(auth)/(tabs)/menu/carteira/adiantamentos.tsx`
- Test: `src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/advanceDisplay.test.ts` (acrescentar)
- Test: `src/app/(auth)/(tabs)/menu/carteira/__tests__/adiantamentos.test.tsx` (acrescentar)

**Interfaces:**
- Consumes: `AdvanceResponse.origin` e `cancelReason` (Task 2); `useWithdrawalAllowance` (Task 2); `withdrawalPolicyNotice` (Task 3).
- Produces:
  - `advanceTitle(a: Pick<AdvanceResponse, 'description' | 'origin'>)`;
  - `advanceCancelText(a: Pick<AdvanceResponse, 'status' | 'cancelReason'>): string | null`;
  - na tela, os testIDs `aviso-politica-divida`, `aviso-politica-divida-texto` e `cancelamento-<id>`.

- [ ] **Step 1: Escrever os testes que falham**

Em `advanceDisplay.test.ts`, acrescente `advanceCancelText` ao import de `'../advanceDisplay'` e, no fim:

```ts
describe('título pela origem (F3)', () => {
    it('origin CASH_COLLECTION é dinheiro de cliente, qualquer que seja a descrição', () => {
        expect(advanceTitle({ description: 'Cobrança na entrega', origin: 'CASH_COLLECTION' })).toBe('Dinheiro recebido de cliente');
    });

    it('descrição legada "Cash recebido no service …" também (dívida de pod antigo)', () => {
        expect(advanceTitle({ description: 'Cash recebido no service 2f6c1c8e-1111', origin: 'ADVANCE' })).toBe('Dinheiro recebido de cliente');
    });

    it('adiantamento mostra a descrição do operador', () => {
        expect(advanceTitle({ description: 'Adiantamento combustível', origin: 'ADVANCE' })).toBe('Adiantamento combustível');
    });
});

describe('advanceCancelText (UC15)', () => {
    it('cancelada com motivo: o motivo que a empresa escreveu', () => {
        expect(advanceCancelText({ status: 'CANCELLED' as never, cancelReason: 'Pedido estornado ao cliente' })).toBe(
            'Cancelada pela empresa: Pedido estornado ao cliente',
        );
    });

    it('cancelada sem motivo', () => {
        expect(advanceCancelText({ status: 'CANCELLED' as never, cancelReason: null })).toBe('Cancelada pela empresa.');
    });

    it('não cancelada: null', () => {
        expect(advanceCancelText({ status: 'PENDING' as never, cancelReason: 'x' })).toBeNull();
    });
});
```

Em `adiantamentos.test.tsx`:

1. Troque o mock do barrel por:

```tsx
const mockUseInfiniteAdvances = jest.fn();
const mockUseGetAdvancesSummary = jest.fn();
const mockUseWithdrawalAllowance = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useInfiniteAdvances: () => mockUseInfiniteAdvances(),
    useGetAdvancesSummary: () => mockUseGetAdvancesSummary(),
    useWithdrawalAllowance: () => mockUseWithdrawalAllowance(),
}));
```

2. Troque a assinatura de `render` por `function render(lista: Record<string, unknown>, resumo: Record<string, unknown>, politica: Record<string, unknown> = {}) {` e acrescente, como primeira linha do corpo:

```tsx
    mockUseWithdrawalAllowance.mockReturnValue({ allowance: null, ...politica });
```

3. No fim do `describe('Adiantamentos', …)`:

```tsx
    it('dívida cancelada mostra o motivo que a empresa escreveu', () => {
        const tree = render(
            {
                items: [
                    {
                        id: 'a-2',
                        amount: 5000,
                        pendingAmount: 0,
                        returnedAmount: 0,
                        status: 'CANCELLED',
                        description: 'Dinheiro recebido no service 2f6c1c8e-1111 — devolução pendente',
                        origin: 'CASH_COLLECTION',
                        cancelReason: 'Pedido estornado ao cliente',
                        isOverdue: false,
                        createdAt: '2026-09-23T12:00:00.000Z',
                    },
                ],
            },
            { summary: { totalPending: 0, count: 0, overdueCount: 0 }, isError: false },
        );
        expect(tree.root.findAllByProps({ testID: 'cancelamento-a-2' })[0].props.children).toBe('Cancelada pela empresa: Pedido estornado ao cliente');
    });

    it('BLOCK_IF_OVERDUE com vencida: aviso de bloqueio do saque no topo', () => {
        const tree = render(
            { items: [] },
            { summary: { totalPending: 5000, count: 1, overdueCount: 1 }, isError: false },
            { allowance: { policy: 'BLOCK_IF_OVERDUE', withdrawableCents: 0, openDebtCents: 5000 } },
        );
        expect(tree.root.findAllByProps({ testID: 'aviso-politica-divida-texto' })[0].props.children).toBe(
            'Saque bloqueado: você tem 1 dívida(s) vencida(s) com a empresa. Devolva o valor para liberar o saque.',
        );
    });

    it('política livre ou não carregada: sem aviso', () => {
        const tree = render({ items: [] }, { summary: { totalPending: 5000, count: 1, overdueCount: 1 }, isError: false });
        expect(existe(tree, 'aviso-politica-divida')).toBe(false);
    });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --watchAll=false carteira/_utils/__tests__/advanceDisplay menu/carteira/__tests__/adiantamentos`
Expected: FAIL. O título pela origem com descrição nova falha, e a legada "Cash" também. `advanceCancelText` não existe, e faltam `cancelamento-a-2` e o aviso.

- [ ] **Step 3: Implementar**

Em `advanceDisplay.ts`:

1. Acrescente o import `import { AdvanceStatus } from '@/domain/agility/wallet/dto/types';` (logo depois do import de `AdvanceResponse`).
2. Troque o comentário + `CASH_DEBT_PREFIX` + `advanceTitle` por:

```ts
/**
 * Dívida de cobrança em dinheiro: pela `origin` (F3, `CASH_COLLECTION` = tem `paymentId`) ou,
 * na legada sem vínculo, pela descrição do listener ("Dinheiro recebido no service <uuid> —
 * devolução pendente" ou o prefixo antigo "Cash recebido no service "). O id não vai para a
 * tela (regra "nome, nunca id").
 */
const CASH_DEBT_PREFIX = /^(Dinheiro|Cash) recebido no service /;

export function advanceTitle(a: Pick<AdvanceResponse, 'description' | 'origin'>): string {
    if (a.origin === 'CASH_COLLECTION' || CASH_DEBT_PREFIX.test(a.description ?? '')) return 'Dinheiro recebido de cliente';
    return a.description;
}

/** UC15: a empresa cancelou a dívida (ex.: pedido estornado). O motivo é escrito para o motorista. */
export function advanceCancelText(a: Pick<AdvanceResponse, 'status' | 'cancelReason'>): string | null {
    if (a.status !== AdvanceStatus.CANCELLED) return null;
    const motivo = a.cancelReason?.trim();
    return motivo ? `Cancelada pela empresa: ${motivo}` : 'Cancelada pela empresa.';
}
```

Em `adiantamentos.tsx`:

1. Troque o import do barrel por `import { useGetAdvancesSummary, useInfiniteAdvances, useWithdrawalAllowance } from '@/domain/agility/wallet';`, e o de `advanceDisplay` por:

```tsx
import { advanceCancelText, advanceDueText, advanceOverdueText, advanceTitle } from './_utils/advanceDisplay';
import { withdrawalPolicyNotice } from './_utils/debtPolicy';
```

2. Em `AdvanceItem`, logo depois de `const open = …;`:

```tsx
    const cancelText = advanceCancelText(item);
```

e, como último filho do `<Box p="m16" …>` (depois do bloco `{open && due && (…)}`):

```tsx
            {cancelText && (
                <Text testID={`cancelamento-${item.id}`} mt="t12" fontSize={measure.m12} color="colorTextSecondary">
                    {cancelText}
                </Text>
            )}
```

3. Em `AdiantamentosScreen`, logo depois da linha do `useGetAdvancesSummary()`:

```tsx
    const { allowance } = useWithdrawalAllowance();
    const policyNotice = withdrawalPolicyNotice(allowance, summary?.overdueCount ?? null);
    const aviso = policyNotice ? (
        <Box testID="aviso-politica-divida" mt="t16" p="m16" borderRadius="s12" backgroundColor="gray50">
            <Text
                testID="aviso-politica-divida-texto"
                fontSize={measure.m13}
                color={policyNotice.tone === 'block' ? 'colorTextError' : 'colorTextWarning'}
            >
                {policyNotice.text}
            </Text>
        </Box>
    ) : null;
```

4. No `return`, troque a linha `{resumo}` por:

```tsx
            {aviso}
            {resumo}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --watchAll=false carteira/_utils/__tests__/advanceDisplay menu/carteira/__tests__/adiantamentos`
Expected: PASS (novos e antigos).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/menu/carteira/_utils/advanceDisplay.ts" "src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/advanceDisplay.test.ts" "src/app/(auth)/(tabs)/menu/carteira/adiantamentos.tsx" "src/app/(auth)/(tabs)/menu/carteira/__tests__/adiantamentos.test.tsx"
git commit -m "feat(dividas): origem, motivo do cancelamento e politica de saque na tela de dividas

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Redistribuição de frete no extrato e nos Ganhos

Hoje, numa rota com troca de motorista em que o operador **reduz** a parcela de um deles antes de liberar, esse motorista vê no extrato:
- "Frete liberado", com "Frete a liberar → Disponível", que é falso: é a parte que ele **perdeu**;
- "Débito da empresa", em "Ajustes".

`groupReleasedFreight` (Ganhos) já ignora as três origens novas, e esta task só o fixa com teste.

**Files:**
- Modify: `src/app/(auth)/(tabs)/menu/carteira/_utils/transactionDisplay.ts`
- Test: `src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/transactionDisplay.test.ts` (acrescentar)
- Test: `src/domain/agility/wallet/__tests__/freightEarnings.test.ts` (acrescentar)

**Interfaces:**
- Consumes: `LedgerSourceType.FREIGHT_SHARE_REDISTRIBUTION_*` (Task 2).
- Produces: `describeTransaction`/`categoryOf` reconhecem as três origens. Nenhuma assinatura muda.

- [ ] **Step 1: Escrever os testes**

No fim de `transactionDisplay.test.ts`:

```ts
describe('redistribuição entre motoristas da mesma rota (F3)', () => {
    it('acréscimo: FREIGHT IN, rótulo próprio e categoria frete', () => {
        const d = describeTransaction(tx({ type: 'FREIGHT' as Tx['type'], direction: 'IN', sourceType: 'FREIGHT_SHARE_REDISTRIBUTION_IN' }));
        expect(d.label).toBe('Frete redistribuído (acréscimo)');
        expect(d.category).toBe('freight');
        expect(d.amountText).toBe(`+${formatCurrency(5000)}`);
    });

    it('redução: FREIGHT_RELEASE sem sinal NÃO é "Frete liberado"', () => {
        const d = describeTransaction(
            tx({
                type: 'FREIGHT_RELEASE' as Tx['type'],
                direction: 'IN',
                affectsBalance: false,
                sourceType: 'FREIGHT_SHARE_REDISTRIBUTION_RELEASE',
                metadata: { action: 'REDISTRIBUTE' },
            }),
        );
        expect(d.label).toBe('Frete redistribuído (redução)');
        expect(d.label).not.toBe('Frete liberado');
        expect(d.amountText).toBe(formatCurrency(5000));
    });

    it('estorno da redução: MANUAL_DEBIT em frete, não em ajustes', () => {
        const linha = tx({ type: 'MANUAL_DEBIT' as Tx['type'], direction: 'OUT', sourceType: 'FREIGHT_SHARE_REDISTRIBUTION_REVERSAL' });
        expect(describeTransaction(linha).label).toBe('Estorno da redistribuição');
        expect(describeTransaction(linha).amountText).toBe(`-${formatCurrency(5000)}`);
        expect(filterTransactions([linha], 'freight')).toHaveLength(1);
        expect(filterTransactions([linha], 'adjustments')).toHaveLength(0);
    });
});
```

No fim de `freightEarnings.test.ts`:

```ts
describe('redistribuição antes da liberação (F3)', () => {
    const reducao = (over: Partial<Line> & { id: string }) =>
        linha({
            type: 'FREIGHT_RELEASE' as Line['type'],
            sourceType: 'FREIGHT_SHARE_REDISTRIBUTION_RELEASE',
            sourceId: 'chave-1_share-1',
            description: 'Frete redistribuído (desbloqueio da redução) - roteirização LMR-260920-A1',
            amount: 4000,
            ...over,
        });
    const estornoDaReducao = (over: Partial<Line> & { id: string }) =>
        linha({
            type: 'MANUAL_DEBIT' as Line['type'],
            direction: 'OUT',
            sourceType: 'FREIGHT_SHARE_REDISTRIBUTION_REVERSAL',
            sourceId: 'chave-1_share-1',
            description: 'Frete redistribuído (redução) - roteirização LMR-260920-A1',
            amount: 4000,
            ...over,
        });

    it('conta só a liberação da parcela, já com o valor redistribuído, uma vez', () => {
        const itens = groupReleasedFreight([reducao({ id: 'r0' }), estornoDaReducao({ id: 'e0' }), linha({ id: 'r1', amount: 6000 })]);
        expect(itens).toHaveLength(1);
        expect(itens[0]).toMatchObject({ shareId: 'share-1', releasedCents: 6000 });
        expect(totalReleasedCents(itens)).toBe(6000);
    });

    it('só a redistribuição, sem liberação: nada em Ganhos', () => {
        expect(groupReleasedFreight([reducao({ id: 'r0' }), estornoDaReducao({ id: 'e0' })])).toEqual([]);
    });
});
```

- [ ] **Step 2: Rodar**

Run: `npx jest --watchAll=false carteira/_utils/__tests__/transactionDisplay wallet/__tests__/freightEarnings`
Expected: os 3 de `transactionDisplay` FALHAM ("Frete liberado" e "Débito da empresa" no lugar dos rótulos novos; o estorno cai em `adjustments`). Os 2 de `freightEarnings` PASSAM: o comportamento já é o certo e o teste o fixa. Se algum de `freightEarnings` falhar, **pare**: `groupReleasedFreight` está contando redistribuição, e isso é bug de dinheiro a corrigir antes de seguir.

- [ ] **Step 3: Implementar**

Em `transactionDisplay.ts`, logo depois da constante `FREIGHT_CANCEL`:

```ts
/**
 * Redistribuição do frete entre as parcelas da mesma rota (F3, troca de motorista). Move o
 * BLOQUEADO antes da liberação: o acréscimo entra em "Frete a liberar"; a redução sai de lá
 * e é estornada no mesmo gesto. Sem estes desvios a redução aparecia como "Frete liberado"
 * e o estorno como "Débito da empresa".
 */
const REDISTRIBUTION_IN: TypeConfig = {
    label: 'Frete redistribuído (acréscimo)', icon: 'swap-horizontal', iconColor: '#9C27B0', bgColor: '#F3E5F5', category: 'freight',
    movement: 'Fica em "Frete a liberar" até a empresa liberar',
};
const REDISTRIBUTION_RELEASE: TypeConfig = {
    label: 'Frete redistribuído (redução)', icon: 'swap-horizontal', iconColor: '#FF9800', bgColor: '#FFF3E0', category: 'freight',
    movement: 'Sai de "Frete a liberar" e é estornado',
};
const REDISTRIBUTION_REVERSAL: TypeConfig = {
    label: 'Estorno da redistribuição', icon: 'return-down-back', iconColor: '#F44336', bgColor: '#FFEBEE', category: 'freight',
};

/** A origem decide antes do tipo: o mesmo `type` serve a gestos diferentes. */
const BY_SOURCE: Partial<Record<string, TypeConfig>> = {
    [LedgerSourceType.FREIGHT_SHARE_REVERSAL]: FREIGHT_REVERSAL,
    [LedgerSourceType.FREIGHT_SHARE_REDISTRIBUTION_IN]: REDISTRIBUTION_IN,
    [LedgerSourceType.FREIGHT_SHARE_REDISTRIBUTION_RELEASE]: REDISTRIBUTION_RELEASE,
    [LedgerSourceType.FREIGHT_SHARE_REDISTRIBUTION_REVERSAL]: REDISTRIBUTION_REVERSAL,
};
```

e troque `configOf` por:

```ts
function configOf(tx: Pick<TransactionResponse, 'type' | 'sourceType' | 'metadata'>): TypeConfig {
    const porOrigem = BY_SOURCE[tx.sourceType];
    if (porOrigem) return porOrigem;
    if (tx.type === TransactionType.FREIGHT_RELEASE && tx.metadata?.action === 'CANCEL') return FREIGHT_CANCEL;
    return TYPE_CONFIG[tx.type] ?? UNKNOWN;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --watchAll=false carteira/_utils/__tests__/transactionDisplay wallet/__tests__/freightEarnings menu/carteira/__tests__/extrato`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/menu/carteira/_utils/transactionDisplay.ts" "src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/transactionDisplay.test.ts" src/domain/agility/wallet/__tests__/freightEarnings.test.ts
git commit -m "feat(extrato): redistribuicao de frete entre motoristas com rotulo proprio

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Histórico rotula o valor como "Valor da rota"

`Routing.totalValue` (reais) é o valor da rota inteira. Numa rota com troca de motorista, cada um recebe a sua parcela (F3, UC10), e o número sem rótulo no histórico lê como "o que eu ganhei". A parcela de cada um fica em Ganhos e no Extrato (R5).

**Files:**
- Create: `src/app/(auth)/(tabs)/menu/historico/_utils/routeValue.ts`
- Modify: `src/app/(auth)/(tabs)/menu/historico/index.tsx:27-30,140`
- Modify: `src/app/(auth)/(tabs)/menu/historico/[routeId]/index.tsx:93-96,267`
- Test: `src/app/(auth)/(tabs)/menu/historico/_utils/__tests__/routeValue.test.ts` (criar)

**Interfaces:**
- Consumes: nada.
- Produces: `routeValueLabel(totalValueReais?: number | null): string`.

- [ ] **Step 1: Escrever o teste que falha**

`src/app/(auth)/(tabs)/menu/historico/_utils/__tests__/routeValue.test.ts`:

```ts
import { routeValueLabel } from '../routeValue';

describe('routeValueLabel', () => {
    it('rotula o total como valor da ROTA (reais), não como frete do motorista', () => {
        expect(routeValueLabel(500)).toMatch(/^Valor da rota: R\$\s500,00$/);
        expect(routeValueLabel(1234.5)).toMatch(/^Valor da rota: R\$\s1\.234,50$/);
    });

    it('sem valor: R$ 0,00', () => {
        expect(routeValueLabel(null)).toMatch(/^Valor da rota: R\$\s0,00$/);
        expect(routeValueLabel(undefined)).toMatch(/^Valor da rota: R\$\s0,00$/);
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --watchAll=false historico/_utils/__tests__/routeValue`
Expected: FAIL com `Cannot find module '../routeValue'`.

- [ ] **Step 3: Implementar**

`src/app/(auth)/(tabs)/menu/historico/_utils/routeValue.ts`:

```ts
/**
 * `Routing.totalValue` é o valor da ROTA inteira, em reais — não o frete de quem a concluiu.
 * Com troca de motorista (F3) cada um recebe a sua parcela, que aparece em Ganhos e no
 * Extrato. Por isso o rótulo explícito (R5).
 */
export function routeValueLabel(totalValueReais?: number | null): string {
    const valor = typeof totalValueReais === 'number' && Number.isFinite(totalValueReais) && totalValueReais > 0 ? totalValueReais : 0;
    return `Valor da rota: ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
}
```

Em `historico/index.tsx`:
- apague a função `formatPrice` (linhas 27-30), que só era usada na linha 140;
- troque `{formatPrice(rota.totalValue)}` por `{routeValueLabel(rota.totalValue)}`;
- acrescente o import `import { routeValueLabel } from './_utils/routeValue';` depois dos imports de `@/…`, separado por linha em branco.

Em `historico/[routeId]/index.tsx`:
- apague a `const formatarPreco = …` (linhas 93-96), que só era usada na linha 267;
- troque `{formatarPreco(routing.totalValue)}` por `{routeValueLabel(routing.totalValue)}`;
- acrescente o import `import { routeValueLabel } from '../_utils/routeValue';` no grupo de imports relativos.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --watchAll=false historico/_utils/__tests__/routeValue`
Expected: PASS.
Run: `npx tsc --noEmit && npx eslint "src/app/(auth)/(tabs)/menu/historico"`
Expected: sem saída do `tsc`; eslint com `0 errors` (sem `formatPrice`/`formatarPreco` sem uso).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/menu/historico"
git commit -m "feat(historico): total da rota rotulado como Valor da rota, nao frete do motorista

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Conclusão com cobrança: a frase do back e o aviso de dinheiro para todos

O caminho ativo já é o certo. `useServiceCompletion.handleFinalizar` (todas as telas de finalização, via `SharedEtapaFinalizacao`) chama `POST /services/:id/completion-details` com `receivedValue = parseBRLToCents(paymentAmount)` (`useServiceCompletion.ts:236-246`), e o retorno faz o mesmo. Faltam três coisas:
- **nenhum teste fixa o payload em centavos**;
- o toast de erro lê `e.message`, mas o interceptor rejeita `{ error: { message } }`. A recusa do back (400) vira "Ocorreu um erro ao finalizar." e o motorista não sabe o que faltou;
- o aviso "dinheiro em mão vira dívida" só aparece para CLT, mas desde a F1 vale para todo motorista (R7).

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/useServiceCompletion.ts:1-16,334-338`
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/cashDebtWarning.ts`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/SharedEtapaFinalizacao.tsx:11,185-189,639-641`
- Test: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/__tests__/useServiceCompletion.test.tsx` (acrescentar)
- Test: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/cashDebtWarning.test.ts` (criar)

**Interfaces:**
- Consumes: `mensagemDaApi` (`src/api/apiErrorMessage.ts`).
- Produces: `showsCashDebtWarning(paymentMethod: PaymentMethodType | null | undefined): boolean` e `CASH_DEBT_WARNING_TEXT: string`.

- [ ] **Step 1: Escrever os testes que falham**

Em `useServiceCompletion.test.tsx`:

1. Depois do `jest.mock('../getCurrentCoords', …)`, acrescente:

```tsx
const mockShowToast = jest.fn();
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: mockShowToast }) }));
```

2. Em `interface ParadaOverrides`, acrescente:

```tsx
    /** Pedido carregado no contexto (só os campos que o hook lê). */
    service?: Record<string, unknown> | null;
    paymentAmount?: string;
    paymentMethod?: string | null;
```

e em `makeParadaContext` troque as linhas `service: null,`, `paymentAmount: '',` e `paymentMethod: null,` por:

```tsx
        service: overrides.service ?? null,
        paymentAmount: overrides.paymentAmount ?? '',
        paymentMethod: overrides.paymentMethod ?? null,
```

3. No `afterEach` do `describe` principal, acrescente `mockShowToast.mockReset();`.

4. Antes do `describe('invalidação de dinheiro na conclusão (Task F5)', …)`:

```tsx
    describe('cobrança na entrega (F5b)', () => {
        const comCobranca = (over: ParadaOverrides = {}) =>
            makeParadaContext({
                completionRequirements: ALL_HIDDEN,
                hasFormGroups: true,
                photos: [{ uri: 'a.jpg' }],
                signature: 'sig.png',
                service: { id: 'service-1', requiresPayment: true },
                paymentAmount: 'R$ 1.234,56',
                paymentMethod: 'CASH',
                ...over,
            });

        it('valor em CENTAVOS inteiros e a forma de pagamento vão no completion-details', async () => {
            mockedUseParada.mockReturnValue(comCobranca());
            const result = runHook('entrega');

            await act(async () => {
                await result.handleFinalizar();
            });

            expect(mockCompleteServiceWithDetailsAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'service-1',
                    details: expect.objectContaining({ receivedValue: 123456, paymentMethod: 'CASH' }),
                }),
            );
        });

        it('back recusa a conclusão: o toast mostra a frase do back, não o genérico', async () => {
            const frase =
                'Este pedido tem cobrança na entrega: conclua pela finalização com detalhes, informando o valor recebido e a forma de pagamento.';
            mockCompleteServiceWithDetailsAsync.mockRejectedValue({
                success: false,
                error: { code: 'SERVICE_REQUIRES_PAYMENT_DETAILS', message: frase },
            });
            mockedUseParada.mockReturnValue(comCobranca());
            const result = runHook('entrega');

            await act(async () => {
                await result.handleFinalizar();
            });

            expect(mockShowToast).toHaveBeenCalledWith({ message: frase, type: 'error' });
        });
    });
```

`src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/cashDebtWarning.test.ts`:

```ts
import { PaymentMethodType } from '@/domain/agility/service/dto/types';

import { showsCashDebtWarning } from '../cashDebtWarning';

describe('showsCashDebtWarning (spec 4.3)', () => {
    it('dinheiro vivo: aviso para qualquer motorista (a função nem recebe o tipo dele)', () => {
        expect(showsCashDebtWarning(PaymentMethodType.CASH)).toBe(true);
    });

    it('PIX, cartão ou nada escolhido: sem aviso', () => {
        expect(showsCashDebtWarning(PaymentMethodType.PIX)).toBe(false);
        expect(showsCashDebtWarning(PaymentMethodType.CARD_DEBIT)).toBe(false);
        expect(showsCashDebtWarning(PaymentMethodType.CARD_CREDIT)).toBe(false);
        expect(showsCashDebtWarning(null)).toBe(false);
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --watchAll=false _hooks/__tests__/useServiceCompletion _utils/__tests__/cashDebtWarning`
Expected:
- "valor em CENTAVOS" **PASSA** (o caminho já é o certo; o teste o fixa);
- "back recusa a conclusão" **FALHA**: o toast recebe `'Ocorreu um erro ao finalizar.'`;
- `cashDebtWarning` FALHA com `Cannot find module`.

- [ ] **Step 3: Implementar**

Em `useServiceCompletion.ts`, acrescente o import `import { mensagemDaApi } from '@/api/apiErrorMessage';` como primeiro import de `@/…`, e no `catch` externo de `handleFinalizar` troque:

```ts
                const errorMessage = (e as { message?: string })?.message || 'Ocorreu um erro ao finalizar.';
```

por:

```ts
                // O interceptor rejeita `{ error: { message } }`, não um `Error`: ler só `e.message`
                // escondia a recusa do back (ex.: 400 SERVICE_REQUIRES_PAYMENT_DETAILS, F3).
                const errorMessage = mensagemDaApi(e, 'Ocorreu um erro ao finalizar.');
```

`src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/cashDebtWarning.ts`:

```ts
import { PaymentMethodType } from '@/domain/agility/service/dto/types';

/**
 * Dinheiro vivo recebido do cliente é da empresa e vira dívida para QUALQUER motorista —
 * funcionário ou terceirizado (spec financeiro 4.3; F1 tirou o crédito do terceirizado).
 * PIX e cartão caem na conta da empresa e não mexem na carteira.
 */
export function showsCashDebtWarning(paymentMethod: PaymentMethodType | null | undefined): boolean {
    return paymentMethod === PaymentMethodType.CASH;
}

/** O prazo em dias (`cashReturnDueDays`) não chega ao app: o texto não promete número (R7). */
export const CASH_DEBT_WARNING_TEXT =
    'Esse valor é da empresa. Vai aparecer em "A devolver à empresa" na sua carteira, com prazo de devolução, até você devolver.';
```

Em `SharedEtapaFinalizacao.tsx`:
1. Troque as linhas 185-189 (o comentário "Inferência: …", `useAuthCredentialsService()`, `isCollaborator` e `showCashDebtWarning`) por:

```tsx
  // Spec 4.3: dinheiro em mão vira dívida para todo motorista, não só o funcionário.
  const showCashDebtWarning = showsCashDebtWarning(paymentMethod);
```

2. Troque o texto `Esse valor é da empresa. Vai aparecer como dívida na sua carteira até você devolver ao escritório.` por `{CASH_DEBT_WARNING_TEXT}`.
3. Acrescente o import `import { CASH_DEBT_WARNING_TEXT, showsCashDebtWarning } from '../../_utils/cashDebtWarning';` no grupo de imports relativos.
4. Rode `npx eslint` no arquivo. Se `useAuthCredentialsService` (linha 11) ficar sem uso, apague o import.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --watchAll=false _hooks/__tests__/useServiceCompletion _utils/__tests__/cashDebtWarning`
Expected: PASS (inclusive os testes antigos de `useServiceCompletion`).
Run: `npx tsc --noEmit && npx eslint "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/useServiceCompletion.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/SharedEtapaFinalizacao.tsx" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/cashDebtWarning.ts"`
Expected: sem saída do `tsc`; eslint com `0 errors`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/useServiceCompletion.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/__tests__/useServiceCompletion.test.tsx" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/cashDebtWarning.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/cashDebtWarning.test.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/SharedEtapaFinalizacao.tsx"
git commit -m "fix(conclusao): recusa do back aparece no toast e aviso de dinheiro vale para todo motorista

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Sem caminho de conclusão fora do completion-details

A F3 fez `PATCH /services/:id/complete` e `PUT /services/:id/status` → `COMPLETED` recusarem pedido com cobrança. No app, os dois sobrevivem só em código morto, que alguém pode religar:
- `dados-entrega/index.tsx` é tela órfã: só o `_layout` e o tipo de navegação a citam. Ela chama `serviceService.complete` e depois o completion-details, **sem** `receivedValue`;
- `useStopActions.handleCompleteService` é devolvido e desestruturado em `parada/[pid]/index.tsx:125`, mas nunca é chamado;
- `useChangeServiceStatus` não tem consumidor.

Esta task apaga os três e prende o caminho com um teste de varredura (R8).

**Files:**
- Create: `src/domain/agility/service/__tests__/conclusaoSoPorDetalhes.test.ts`
- Delete: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/dados-entrega/index.tsx`
- Delete: `src/domain/agility/service/useCase/useCompleteService.ts`, `src/domain/agility/service/useCase/useChangeServiceStatus.ts`
- Delete: `src/domain/agility/service/dto/request/change-service-status.request.ts`, se o Step 3 confirmar que não há outro uso
- Modify: `src/domain/agility/service/serviceAPI.ts` (sai `complete`, `changeStatus` e o import de `ChangeServiceStatusRequest`)
- Modify: `src/domain/agility/service/serviceService.ts` (idem)
- Modify: `src/domain/agility/service/useCase/index.ts`, `src/domain/agility/service/dto/index.ts`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/useStopActions.ts`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/__tests__/useStopActions.test.tsx`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/index.tsx:125,129`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/_layout.tsx`, `src/types/navigation.ts`
- Modify (comentário): `src/domain/queryKeys.ts`, `src/domain/__tests__/routeStopQueryKeys.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `serviceAPI`/`serviceService` **sem** `complete` e `changeStatus`; `useStopActions` **sem** `handleCompleteService`/`isCompleting`. `completeWithDetails` não muda.

- [ ] **Step 1: Escrever o teste de varredura**

`src/domain/agility/service/__tests__/conclusaoSoPorDetalhes.test.ts`:

```ts
/**
 * Pedido com cobrança só conclui por `POST /services/:id/completion-details` (F3, back:
 * `SERVICE_REQUIRES_PAYMENT_DETAILS`). `PATCH /services/:id/complete` e `PUT /services/:id/status`
 * recusam esse pedido e não levam valor nem forma de pagamento. O app não guarda nenhum caminho
 * para eles — nem em tela órfã, nem em hook sem consumidor (R8).
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../../..');
const PROIBIDOS = [/\/services\/\$\{[^}]+\}\/complete[`'"]/, /\/services\/\$\{[^}]+\}\/status[`'"]/];

function arquivosFonte(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
        const caminho = path.join(dir, entrada.name);
        if (entrada.isDirectory()) return entrada.name === '__tests__' || entrada.name === 'node_modules' ? [] : arquivosFonte(caminho);
        return /\.tsx?$/.test(entrada.name) && !/\.test\.tsx?$/.test(entrada.name) ? [caminho] : [];
    });
}

it('nenhum código do app chama PATCH /services/:id/complete nem PUT /services/:id/status', () => {
    const achados = arquivosFonte(SRC).flatMap((arquivo) => {
        const texto = fs.readFileSync(arquivo, 'utf8');
        return PROIBIDOS.filter((re) => re.test(texto)).map((re) => `${path.relative(SRC, arquivo)} ~ ${re}`);
    });
    expect(achados).toEqual([]);
});

it('o caminho com cobrança continua existindo', () => {
    const api = fs.readFileSync(path.join(SRC, 'domain/agility/service/serviceAPI.ts'), 'utf8');
    expect(api).toMatch(/\/services\/\$\{id\}\/completion-details/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --watchAll=false service/__tests__/conclusaoSoPorDetalhes`
Expected: FAIL no primeiro teste, listando `domain/agility/service/serviceAPI.ts` nos dois padrões. O segundo passa.

- [ ] **Step 3: Apagar os caminhos**

1. Confira que não há uso fora do domínio de serviço. Os `Grep` de `ChangeServiceStatusRequest`, `useChangeServiceStatus`, `useCompleteService\b`, `serviceService.complete\b` e `dados-entrega` em `src/` devem achar só os arquivos listados acima. Se aparecer outro consumidor, **pare** e reporte: R8 parte da premissa de que não há nenhum.
2. `git rm "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/dados-entrega/index.tsx" src/domain/agility/service/useCase/useCompleteService.ts src/domain/agility/service/useCase/useChangeServiceStatus.ts src/domain/agility/service/dto/request/change-service-status.request.ts`
3. `src/domain/agility/service/dto/index.ts`: apague a linha `export type { ChangeServiceStatusRequest } from './request/change-service-status.request'`.
4. `src/domain/agility/service/useCase/index.ts`: apague `export { useCompleteService } from './useCompleteService'` e `export { useChangeServiceStatus } from './useChangeServiceStatus'`.
5. `serviceAPI.ts`: apague a função `complete` inteira (`async function complete(id: Id, completionNotes?: string) … }`, que faz o `PATCH /services/${id}/complete`), a função `changeStatus` inteira (o `PUT /services/${id}/status`), as entradas `complete,` e `changeStatus,` do objeto exportado e `ChangeServiceStatusRequest,` do import de tipos.
6. `serviceService.ts`: apague `async function complete(…) { return serviceAPI.complete(…) }`, `async function changeStatus(…) { return serviceAPI.changeStatus(…) }`, as entradas `complete,` e `changeStatus,` de `serviceService` e `ChangeServiceStatusRequest,` do import.
7. `useStopActions.ts`:
   - tire `useCompleteService,` do import de `@/domain/agility/service/useCase`;
   - apague o bloco `const { completeService, isLoading: isCompleting } = useCompleteService({ … });` inteiro;
   - apague `const handleCompleteService = useCallback(() => { completeService({ id: serviceId }); }, [completeService, serviceId]);`;
   - tire `handleCompleteService,` e `isCompleting,` do `return`;
   - se `moneyChangedKeys` ficar sem uso (só era lido nesse bloco), tire-o do import de `@/domain/queryKeys`.
8. `parada/[pid]/index.tsx`: tire `handleCompleteService,` e `isCompleting,` da desestruturação de `useStopActions({ serviceId, … })` (linhas 125 e 129).
9. `rotas-detalhadas/_layout.tsx`: apague `<Stack.Screen name="[id]/parada/[pid]/dados-entrega" />`.
10. `src/types/navigation.ts`: apague a linha ``| `/rotas-detalhadas/${string}/parada/${string}/dados-entrega` ``.
11. `useStopActions.test.tsx`:
    - tire `useCompleteService` do `jest.mock('@/domain/agility/service/useCase', …)`, a variável `completeSuccess` e a linha `completeSuccess = undefined;` do `afterEach`;
    - apague o teste `'handleCompleteService (conclusão): invalida carteira e financeiro'`;
    - troque o comentário do topo por:

```tsx
/**
 * `useStopActions` só inicia parada e atendimento: nenhum dos dois conclui nada, então não
 * invalidam o dinheiro. A conclusão mora em `useServiceCompletion` (completion-details), o
 * único caminho que leva o valor recebido (F5b, R8).
 */
```

12. `src/domain/queryKeys.ts`: no comentário de `moneyChangedKeys`, troque a lista ``(`useServiceCompletion`, `dados-entrega`, `useStopActions`, `insucesso`, `useCompleteRouting`)`` por ``(`useServiceCompletion`, `insucesso`, `useCompleteRouting`)``. Faça o mesmo no comentário de `src/domain/__tests__/routeStopQueryKeys.test.ts:87`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --watchAll=false service/__tests__/conclusaoSoPorDetalhes _hooks/__tests__ domain/__tests__/routeStopQueryKeys`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: sem saída. Erro de `href` tipado citando `dados-entrega` significa que sobrou referência: ache e apague.
Run: `npx eslint src/domain/agility/service "src/app/(auth)/(tabs)/rotas-detalhadas"`
Expected: `0 errors`.

- [ ] **Step 5: Commit**

```bash
git add -A src/domain/agility/service "src/app/(auth)/(tabs)/rotas-detalhadas" src/types/navigation.ts src/domain/queryKeys.ts src/domain/__tests__/routeStopQueryKeys.test.ts
git commit -m "refactor(conclusao): remove PATCH /complete e PUT /status do app; conclusao so por completion-details

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Verificação final, mutação, aparelho e PR

- [ ] **Step 1: Suítes tocadas, tipos e lint**

```bash
npx jest --watchAll=false api/__tests__ domain/agility/wallet menu/carteira menu/historico notification/__tests__ services/notification _hooks/__tests__ _utils/__tests__/cashDebtWarning service/__tests__ domain/__tests__
npx tsc --noEmit
npx eslint src/api "src/app/(auth)/(tabs)/menu/carteira" "src/app/(auth)/(tabs)/menu/historico" src/domain/agility/wallet src/domain/agility/notification src/domain/agility/service src/services/notification "src/app/(auth)/(tabs)/rotas-detalhadas"
```

Expected: jest verde, `tsc` sem saída e eslint com `0 errors`.

- [ ] **Step 2: Suíte inteira**

Run: `npx jest --watchAll=false`
Expected: verde. Se algo falhar fora dos caminhos do Step 1, prove que a falha já existe em `origin/main` antes de chamá-la de pré-existente: rode o mesmo teste num worktree limpo de `origin/main`. Não use `git stash` nem `git checkout origin/main -- <arquivo>` neste worktree.

- [ ] **Step 3: Mutação nos pontos do Review Focus**

Os arquivos já estão commitados, então `git checkout -- <arquivo>` desfaz a mutação. Para cada linha: aplique a mutação com Edit, rode o teste indicado, **confirme que FALHA** e reverta.

| # | Mutação | Teste que precisa falhar |
|---|---|---|
| 1 | `baseResponseAdapter.ts`: apagar a linha `...(responseData?.error ?? {}),` | `api/__tests__/baseResponseAdapter` ("preserva os campos extras") |
| 2 | `withdrawalAllowance.ts`: `withdrawCapCents` devolve sempre `disponivel` | `wallet/__tests__/withdrawalAllowance` e `menu/carteira/__tests__/saque` ("EXCESS_ONLY: o teto…") |
| 3 | `debtPolicy.ts`: `maxWithdrawalFromError` devolve sempre `null` | `menu/carteira/__tests__/saque` ("back recusa pela política com o máximo") |
| 4 | `pixKeyNotice.ts`: `const recent = false` | `carteira/_utils/__tests__/pixKeyNotice` e `menu/carteira/__tests__/carteira` ("trocada há 1 hora") |
| 5 | `useServiceCompletion.ts`: voltar a `(e as { message?: string })?.message \|\| 'Ocorreu um erro ao finalizar.'` | `_hooks/__tests__/useServiceCompletion` ("back recusa a conclusão") |
| 6 | `transactionDisplay.ts`: apagar a linha de `FREIGHT_SHARE_REDISTRIBUTION_RELEASE` em `BY_SOURCE` | `carteira/_utils/__tests__/transactionDisplay` ("redução") |
| 7 | `serviceAPI.ts`: recriar `` apiAgility.patch(`/services/${id}/complete`) `` numa função qualquer | `service/__tests__/conclusaoSoPorDetalhes` |

Se algum teste passar verde com a mutação, ele não cobre o que diz. Corrija o teste antes de seguir.

- [ ] **Step 4: Conferência no aparelho (dev com a F3 do back no ar)**

Com o dev client apontando para o `dev` e a F3 deployada, use um motorista com carteira.
1. **Chave PIX:**
   - troque a chave em Dados bancários: a carteira mostra o alerta "Chave PIX alterada" com a anterior mascarada;
   - a notificação "Chave PIX alterada" chega, e tocar nela (na aba e no push) abre a carteira.
2. **Política `EXCESS_ONLY`** (o operador configura em Configurações → Financeiro, ou por `PATCH` das configurações da empresa no dev). Com uma dívida aberta:
   - o saque mostra "você pode sacar até R$ X", e "Sacar tudo" usa X;
   - pedir acima disso a partir de outro aparelho mostra a mensagem com o máximo e "Usar o máximo".
3. **Política `BLOCK_IF_OVERDUE`,** com uma dívida vencida (`cashReturnDueDays` 0): o saque fica bloqueado com o aviso, e "Adiantamentos" mostra o mesmo aviso.
4. **Meus saques:** peça um saque e troque a chave em seguida. O saque mostra o aviso de chave trocada depois do pedido.
5. **Conclusão com cobrança em dinheiro:** termine como terceirizado. O aviso "dinheiro em mão" aparece, e a dívida surge em "Adiantamentos" com "Vence em".

Se o aparelho não estiver disponível, escreva na PR, em linha própria: **"não validado no aparelho"**.

- [ ] **Step 5: `graphify update .`**, se existir no PATH.

- [ ] **Step 6: Push e PR contra `main`**

```bash
export GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never
timeout 120 git push -q https://DanielASantos-dev@github.com/consultoriaroteirizador-lab/agility-app.git HEAD:refs/heads/feat/financeiro-f5b
```

Abra a PR `feat/financeiro-f5b` → `main` (GitHub MCP `create_pull_request` ou `gh pr create --base main`). O corpo deve ter:
- **o que muda para o motorista:**
  - alerta de troca de chave PIX (carteira, modal do saque e Meus saques) e a notificação que abre a carteira;
  - teto do saque pela política de dívida, com mensagens dos dois códigos e "Usar o máximo";
  - dívidas com origem, motivo do cancelamento e aviso da política;
  - redistribuição de frete legível no extrato;
  - "Valor da rota" no histórico;
  - a recusa do back na conclusão aparece no toast, e o aviso de dinheiro em mão vale para todo motorista;
- **o que sai:** a tela órfã `dados-entrega`, `useCompleteService`, `useChangeServiceStatus`, `handleCompleteService` e `serviceAPI.complete`/`changeStatus` (R8), e o teste de varredura que impede a volta;
- **ordem de deploy:** o build do app **depois** da F3 do back (#806) em cada ambiente. Com back antigo, o app degrada (sem aviso de chave e com o teto no disponível) e não quebra;
- **pendências de back** (sem endpoint, nada inventado):
  - parcela por rota para o motorista (paradas concluídas/totais, valor, status);
  - `paymentMethod` e a dívida (vencimento) em `GET /finance/payments` (R6);
  - `cashReturnDueDays` exposto ao motorista (R7);
  - filtro `status` em `GET /wallet/advances` no controller do motorista (R11);
  - nome do cliente e código da rota em `AdvanceResponse`;
  - `linkUrl` na notificação `wallet.pix_key_changed` (R10), e o dedup de 10 s por (usuário, `SYSTEM_ALERT`), que pode engolir a notificação da troca se outro alerta do motorista sair na mesma janela;
- **decisão registrada:** `pixKeyChangedAfterRequest` **aparece** para o motorista (R1), e o minor das Tasks 15+16 da F3 fica resolvido como intencional;
- a tabela de Rulings deste plano (R1–R11), resumida;
- a linha do Step 4 (validado ou "não validado no aparelho");
- no fim: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Fora desta fase

- **Back (pendências, anotadas na PR pelo Step 6 da Task 13):**
  - parcela por rota para o motorista;
  - `paymentMethod` e a dívida em `/finance/payments`;
  - `cashReturnDueDays` exposto;
  - filtro `status` em `/wallet/advances`;
  - nomes na dívida;
  - `linkUrl` e o dedup da notificação da troca de chave.
- **Valor por rota em ofertas e na lista de rotas ativas** (`RouteItem`, `RotaCard`, `ofertas/`): ali `totalValue` é o preço da oferta ou da rota **antes** de qualquer divisão, e continua como está. Só o histórico de rotas concluídas ganha o rótulo (R5).
- **Operador:** nada de plataforma aqui (é a F4b).
