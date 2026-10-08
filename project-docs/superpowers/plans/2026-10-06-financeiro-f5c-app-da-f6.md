# Financeiro F5c: o app do motorista lê os contratos da F6. Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O app do motorista passa a usar o que a F6 do back expõe:
- **Saque:** o pedido manda `idempotencyKey` (toque duplo com rede lenta não cria dois saques), e a repetição de um saque já tratado diz o estado real.
- **Cobranças:** mostram a forma de pagamento, o cancelado como "Cancelado" com motivo e o que falta devolver, com vencimento.
- **Conclusão com dinheiro vivo:** o aviso diz o prazo em dias ("devolva em até N dias").
- **Dívidas:** abrem filtradas em "Em aberto" e mostram cliente e rota por nome.
- **Fretes:** o histórico da rota mostra a parte do motorista ("N de M paradas", status, motivo do ajuste). Ganhos lista os fretes a liberar por rota.
- **Erros novos:** `IDEMPOTENCY_KEY_REUSED` e `WALLET_INVARIANT_VIOLATION` ganham texto do app.

**Architecture:** Um endpoint novo (`GET /wallet/freight-shares`) e campos novos nas respostas que o app já busca.
- **Cache:** toda query nova fica sob `[KEY_WALLET, …]`, que o saque, a conclusão e o push já invalidam.
- **Resumo da carteira:** a query `[KEY_WALLET, 'summary']` passa a guardar a resposta **crua**. Cada leitura (política de saque, prazo de devolução) sai por `select`, para duas formas de dado nunca disputarem a mesma chave.
- **Texto de tela:** mora em funções puras nos `_utils/` de cada tela, testadas sozinhas.
- **Chave do saque:** é gerada uma vez por montagem da tela (`useState(() => Crypto.randomUUID())`, `expo-crypto`, que já é dependência).

**Tech Stack:** React Native + Expo Router (SDK 54), React 19 com React Compiler, @tanstack/react-query 5, Restyle, Jest 29 (`jest-expo`) + `react-test-renderer`.

**Spec e contratos:**
- agility-services, `project-docs/superpowers/specs/2026-09-25-financeiro-motorista-casos-de-uso-design.md` (seções 5 e 6: telas);
- agility-services PR #838, seção "Contratos novos (F4c/F5c)", e PR #842 (`WALLET_INVARIANT_VIOLATION`);
- agility-services `project-docs/superpowers/plans/2026-10-02-financeiro-f6-travas-e-dados-faltantes.md` (Rulings R1, R2, R10–R15);
- este repo, `project-docs/superpowers/plans/2026-10-01-financeiro-f5b-app-da-f3.md`, seções "Sem endpoint para o motorista", "Fora desta fase" e Rulings R5, R7, R11.

## Global Constraints

- **Repo e branch:**
  - agility-app (= lab-app), worktree `C:/tmp/agility-wt/fin-f5c`, branch `feat/financeiro-f5c` criada a partir de `origin/main` (`84156e6`), com a junção do `node_modules` já feita;
  - PR contra `main` (este repo **não tem** `development`), com o plano no 1º commit e a PR em rascunho;
  - a implementação entra na mesma branch depois da revisão do plano;
  - **não rode `npm install`/`npm ci`**, e para remover a junção use só `cmd /c rmdir`.
- **GATE de deploy (o mais importante deste plano):** nenhum build (loja ou atualização OTA) que aponte para um ambiente sai antes de o agility-services **com a #838** estar no ar **naquele ambiente**.
  - **Por quê:** o back roda com `forbidNonWhitelisted`. Num back sem a F6, `idempotencyKey` no `POST /wallet/withdrawal` e `status` no `GET /wallet/advances` dão 400 `VALIDATION_ERROR`, e o saque **inteiro** quebra.
  - **Dev:** já tem a #838.
  - **Produção:** conferir pelo bump da imagem no agility-infra (a tag da imagem não é SHA de commit; merge não é deploy) antes de qualquer build de produção.
- **Dinheiro é inteiro em centavos** da API até a tela. Formate com `formatCurrency(v)` (`src/utils/formatCurrency.ts`, que divide por 100) e nunca divida por 100 à mão. **Não** use o `formatCurrency` de `src/app/(auth)/(tabs)/_rotas/utils/format.ts`: é homônimo e recebe **reais**.
- **Mostre nome, nunca id:**
  - nenhuma tela exibe `paymentId`, `advanceId`, `routingId`, `serviceId`, `walletId`, id de parcela ou de saque, nem a `idempotencyKey`;
  - rota aparece por `routingName || routingCode`;
  - todo teste de tela que renderiza uma linha assere que o id do fixture **não** aparece.
- **Gesto de dinheiro:**
  - `mutateAsync`;
  - erro por `withdrawalErrorMessage`/`mensagemDaApi`, importados pelo caminho do arquivo e não pelo barrel `@/api`;
  - `useSubmitLock` trava o envio.
  - A chave do saque é **uma por montagem da tela**, reenviada em toda tentativa daquela tela, mesmo que o valor mude (R1).
- **React Compiler:** ele descarta a dependência de `useMemo`/`useCallback` que o corpo não lê. Prefira cálculo direto no render (funções puras baratas). Funções passadas a `select` do react-query ficam no nível do módulo (referência estável).
- **Chaves do react-query:** o react-query casa por **prefixo posicional**. Toda query nova fica sob `[KEY_WALLET, …]`. **Não** coloque `moneyChangedKeys()` dentro de `routeStopChangedKeys`.
- **Erro não é vazio:** lista ou cartão que falhou mostra erro com "Toque para tentar de novo", nunca "nenhum" nem R$ 0,00. Resposta vazia de verdade (ex.: rota sem parcela) é diferente de erro.
- **Testes de tela mockam o barrel `@/domain/agility/wallet`.** Enum usado como **valor** numa tela vem de `@/domain/agility/wallet/dto/types` (caminho do arquivo), nunca do barrel, que o teste substitui. Todo hook novo usado por uma tela já testada entra no `jest.mock` do barrel daquele teste.
- **Sem dependência nova.** `expo-crypto` (`~15.0.8`) já está em `dependencies`.
- **Comandos (os mesmos da F5/F5b):**
  - Teste: `npx jest --watchAll=false <padrão>`. O `npm test` é `--watchAll` e trava. O padrão é regex sobre o caminho: use trechos **sem parênteses nem colchetes** (`menu/carteira/__tests__/saque`). A 1ª execução de teste de tela leva ~50 s.
  - Tipos: `npx tsc --noEmit` (sem saída = ok).
  - Lint: `npx eslint <caminhos>` (esperado `0 errors`).
- **Arquivos existentes são CRLF.** Edite com a ferramenta Edit ou reescreva com Write. Nunca `sed -i`/`perl -pi`. Busca multilinha com zero ocorrências num arquivo CRLF não prova ausência.
- **Commits sem acentuação**, no padrão do histórico (`feat(carteira): ...`, `feat(ganhos): ...`), terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git add` com caminhos explícitos. Depois de cada commit, `graphify update .` se existir no PATH.

## Contrato da API

| Rota | O que muda | Forma exata |
|---|---|---|
| `POST /wallet/withdrawal` | corpo aceita `idempotencyKey` (UUID) | Corpo `{ amount, idempotencyKey }`. A repetição (mesma chave, mesmo `amount`) devolve **201 com o saque já gravado, no estado atual** (pode ser `CANCELLED`, `COMPLETED`, `FAILED`). A mesma chave com outro `amount` dá 400 `IDEMPOTENCY_KEY_REUSED`, sem gravar. A chave só fica presa se o saque foi gravado: recusa antes da gravação (dívida, saldo) deixa a chave livre. |
| `GET /finance/payments` (o motorista sempre recebe a lista com `driverId` forçado pelo token) | `paymentMethod`, `cancelledAt`, `cancelReason`, `debt` | `paymentMethod: 'CASH' \| 'PIX' \| 'CARD_DEBIT' \| 'CARD_CREDIT' \| null`; `cancelledAt: string \| null`; `cancelReason: string \| null`; `debt: { advanceId, status: 'PENDING'\|'PARTIAL'\|'RETURNED'\|'CANCELLED', amountCents, returnedAmountCents, pendingAmountCents, dueDate: string \| null, isOverdue: boolean } \| null`. `debt` só existe para dinheiro vivo; `null` = sem dívida ligada. |
| `GET /wallet/summary` | `cashReturnDueDays` | Inteiro em `[0, 365]`, nunca `null` (padrão 7). `0` = vence na hora. Back sem a F6 não manda. |
| `GET /wallet/advances` | query `status` e rótulos | `status=PENDING,PARTIAL` (vírgula; vazio = todos; desconhecido = 400). Cada item ganha `routingCode`, `routingName`, `customerName` (`string \| null`). A `description` da dívida de dinheiro vivo continua com o id do pedido (R13 da F6). |
| `GET /wallet/freight-shares` | **novo** | Query `routingId?` (UUID), `status?` (**um** de `A_LIBERAR \| LIBERADA \| CANCELADA \| SEM_VALOR`), `page`, `limit` (≤ 100). Resposta `{ data, meta: { page, limit, total, totalPages } }`. Item: `{ id, routingId, routingCode, routingName, status, stopsCompleted, stopsTotal, valueMode, fullAmountCents, amountToReleaseCents, releasedAmountCents: number \| null, releasedAt, adjustReason, cancelledAt, cancelReason, createdAt }`. `amountToReleaseCents` é 0 fora de `A_LIBERAR`. Recorte sempre pelo motorista do token: rota de outro = lista vazia. |
| notificação `wallet.pix_key_changed` | `linkUrl: 'carteira'` | Lista: `linkUrl: 'carteira'`, `metadata: { walletId, changedAt, previousPixKeyMasked }`. Push: `data.route: 'carteira'`. Sem dedup. |

## Códigos de erro novos

| Código | HTTP | Onde | Texto do app |
|---|---|---|---|
| `IDEMPOTENCY_KEY_REUSED` | 400 | saque | "Esta tela já enviou um pedido de saque com outro valor. Confira em Meus saques antes de pedir de novo." + ação "Meus saques" no toast |
| `WALLET_INVARIANT_VIOLATION` | 409 | saque (único gesto do motorista que lança na carteira) | "Sua carteira está com o saldo em revisão e não aceitou o saque agora. Nada foi descontado. Fale com a central." (o texto do back fala de "conferência", que é do operador) |

## Rulings (decisões que a F6 e a F5b não fixavam)

| # | Decisão | Por quê |
|---|---|---|
| R1 | A chave do saque nasce na montagem da tela (`useState(() => Crypto.randomUUID())`) e vale para toda tentativa daquela tela, **inclusive com outro valor**. Ela sobrevive a abrir "Dados bancários" por cima (a tela de saque continua montada) e some no sucesso (`router.replace`). | Gerar chave nova quando o valor muda reabre o buraco que a F6 fechou: se o 1º pedido foi gravado e a resposta se perdeu, a chave nova cria um 2º saque. Com a mesma chave, o back devolve `IDEMPOTENCY_KEY_REUSED` e o app manda conferir Meus saques. |
| R2 | Sucesso devolve o saque. Se o status dele **não** é `PENDING`/`PROCESSING` (repetição de um pedido que a empresa já tratou), o toast diz o estado real: `COMPLETED` "Este saque já foi pago.", `CANCELLED` "Este saque foi recusado pela empresa. Veja o motivo em Meus saques.", `FAILED` "Este saque teve falha no pagamento. Veja em Meus saques.". A tela vai para Meus saques em todos os casos. Sem status (back antigo) conta como pedido novo. | Review Focus 1 da F6: a repetição devolve o pedido "no estado em que está". O toast "Saque solicitado" mentiria. O toast só tem `success`/`error`: pago é `success`, recusado e falha são `error`. |
| R3 | Cobranças: `REJECTED` + `cancelledAt` vira o selo "Cancelado" com a linha "Cancelado pela empresa: <motivo>". Sem `cancelledAt`, continua "Recusado". | Mesma regra do painel (F4c R1) e do texto da dívida cancelada (`advanceCancelText`). |
| R4 | A linha da dívida na cobrança sai só quando `debt` vem preenchido: "A devolver: R$ X · Vence em dd/mm/aaaa" (ou "Venceu em", em vermelho), "Devolvido à empresa" ou "Devolução cancelada pela empresa". `debt: null` não escreve nada. | `null` pode ser cobrança em PIX ou dívida que o job ainda não criou. Afirmar "sem dívida" seria mentir no segundo caso. O dia usa `advanceDueText`/`advanceOverdueText` (mesma regra de fuso das dívidas). |
| R5 | O aviso da conclusão com dinheiro vivo usa `cashReturnDueDays` do resumo. `0` vira "deve ser devolvido hoje"; `1`, "em até 1 dia"; `N`, "em até N dias". Sem o número (resumo não carregou, offline, back antigo), o texto de hoje, sem número (R7 da F5b). | O back calcula o vencimento como agora + N×24h, então "em até N dias" é exato. A query só roda quando o aviso aparece (pagamento em dinheiro). |
| R6 | A tela de dívidas abre em **"Em aberto"** (`status=PENDING,PARTIAL`), com o atalho "Todas". O vazio diz "Nenhuma dívida em aberto." no filtro aberto. **Muda o R11 da F5b** (que listava tudo por falta do filtro): **decisão de produto a confirmar na revisão do plano.** | Com histórico longo, a dívida aberta ficava abaixo das devolvidas. Quem chega pelo cartão "Toque para ver os vencimentos" quer as abertas. |
| R7 | Dívida mostra "Cliente: X" e "Rota: Y" debaixo do título quando o back manda. O título continua `advanceTitle` (a descrição com o id nunca aparece). | R13 da F6. |
| R8 | A parcela do motorista aparece como: status ("A liberar", "Liberado", "Cancelado", "Sem valor"), valor (`amountToReleaseCents` em A_LIBERAR, `releasedAmountCents` em LIBERADA, R$ 0,00 em SEM_VALOR, nenhum valor em CANCELADA), "N de M paradas" e a nota ("Ajuste da empresa: …", "Cancelado pela empresa: …", "Esperando a empresa liberar", "Sem valor nesta rota: a empresa redistribuiu o frete"). Nunca o sugerido, o proporcional nem a política. | R10 da F6: o motorista vê `adjustReason`/`cancelReason` e não vê o resto. O painel (F4c) avisa o operador que o motivo é visível. |
| R9 | No histórico da rota, o cartão "Sua parte nesta rota" some quando a lista vem **vazia** (rota sem frete para ele, ex.: CLT fora de oferta). Em erro, mostra o erro com toque para tentar de novo. | Vazio é resposta legítima; erro não é vazio. |
| R10 | Ganhos ganha "Fretes a liberar por rota" (`status=A_LIBERAR`, uma página de 50). Passou disso, a seção diz "Mostrando 50 de N". A seção não depende do período escolhido (é o que está bloqueado **agora**). | O cartão "Frete a liberar" já mostra o total. A lista diz de quais rotas ele vem. |
| R11 | A notificação da troca de chave **não muda código**. Com `linkUrl: 'carteira'`, o destino vira a rota nomeada `carteira`, que o mapa compartilhado já resolve. O fallback por `walletId`/`changedAt` continua para notificação antiga. A Task 10 só fixa isso em teste. | A tabela da F6 diz "app (já trata; o fallback continua)". |

## Review Focus

1. **Saque repetido depois que a empresa já recusou** (mesma tela, rede caiu na 1ª resposta, o motorista toca de novo): o back devolve o saque `CANCELLED`, o toast diz "recusado pela empresa" e a tela vai para Meus saques, sem "Saque solicitado". Teste na Task 2.
2. **Mesma tela, 1ª tentativa recusada pela política de dívida, 2ª com valor menor:** a chave é a mesma e o back aceita (nada foi gravado na 1ª). O app não gera chave nova nem trava o 2º envio. Teste na Task 2 (mesma chave nas duas chamadas).
3. **Conclusão em dinheiro com o resumo da carteira falhando (offline):** o aviso aparece com o texto sem número, nunca "0 dias" nem vazio. Teste na Task 4.
4. **Cobrança em dinheiro com `debt: null`** (job da dívida ainda não rodou) ou de back antigo (sem os campos): nenhuma linha de dívida, nenhuma "Forma:" inventada, selo como hoje. Testes na Task 5.
5. **Parcela da rota com erro de rede no histórico:** o cartão mostra erro com toque para tentar de novo, e não some como se a rota não tivesse frete. Teste na Task 8.

## Fora desta fase

- **Painel:** nada aqui (é a F4c, `agility-frontend-platform`).
- **O valor por rota em ofertas e na lista de rotas ativas** (`RouteItem`, `RotaCard`, `ofertas/`): continua o preço da oferta ou da rota (F5b, "Fora desta fase").
- **O título "Rota <id>" no cabeçalho do histórico da rota** (`historico/[routeId]/index.tsx:164`, `routing.name || \`Rota ${routing.code || routing.id}\``): mostra o id quando a rota não tem nome nem código. É anterior a este plano e a tela não tem teste. Fica anotado na PR como pendência.
- **Teste no aparelho:** gate de build, fora do plano. A Task 11 lista o roteiro na PR.

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/app/(auth)/(tabs)/menu/carteira/_utils/debtPolicy.ts` (+ teste) | Modificar | textos de `IDEMPOTENCY_KEY_REUSED` e `WALLET_INVARIANT_VIOLATION`; `isWithdrawalKeyReused` |
| `src/app/(auth)/(tabs)/menu/carteira/_utils/withdrawalSubmit.ts` (+ teste) | Criar | `withdrawalSubmitToast`: o toast do sucesso pelo status devolvido |
| `src/domain/agility/wallet/dto/request/wallet.request.ts` | Modificar | `idempotencyKey` no `CreateWithdrawalRequest`; `ListDriverFreightSharesRequest` |
| `src/app/(auth)/(tabs)/menu/carteira/saque.tsx` (+ `__tests__/saque.test.tsx`) | Modificar | chave por montagem, toast pelo status, ação "Meus saques" |
| `src/domain/agility/wallet/dto/response/wallet.response.ts` | Modificar | `cashReturnDueDays`; rótulos da dívida; `DriverFreightShareResponse` |
| `src/domain/agility/wallet/dto/types.ts` | Modificar | `FreightShareStatus` |
| `src/domain/agility/wallet/withdrawalAllowance.ts` (+ teste) | Modificar | `cashReturnDueDaysOf` |
| `src/domain/agility/wallet/useCase/useWithdrawalAllowance.ts` (+ teste) | Modificar | resumo cru no cache + `select`; `useCashReturnDueDays` |
| `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/cashDebtWarning.ts` (+ teste) | Modificar | `cashDebtWarningText(days)` |
| `.../parada/[pid]/_components/shared/SharedEtapaFinalizacao.tsx` | Modificar | aviso com o prazo |
| `src/domain/agility/finance/dto/response/payment.response.ts` | Modificar | `paymentMethod`, `cancelledAt`, `cancelReason`, `debt` |
| `src/app/(auth)/(tabs)/menu/ganhos/_utils/paymentDisplay.ts` (+ teste) | Modificar | cancelado, forma de pagamento, linha da dívida |
| `src/app/(auth)/(tabs)/menu/ganhos/cobrancas.tsx` | Modificar | renderiza as linhas novas |
| `src/domain/agility/wallet/walletAPI.ts` (+ `__tests__/walletAPI.test.ts`, novo) | Modificar/Criar | `status` nas dívidas; `getFreightShares`; corpo do saque |
| `src/domain/agility/wallet/useCase/useInfiniteWalletLists.ts` (+ teste) | Modificar | `useInfiniteAdvances(filter)` |
| `src/app/(auth)/(tabs)/menu/carteira/_utils/advanceDisplay.ts` (+ teste) | Modificar | `advanceContext` |
| `src/app/(auth)/(tabs)/menu/carteira/adiantamentos.tsx` (+ teste) | Modificar | filtro Em aberto/Todas; cliente e rota |
| `src/domain/agility/wallet/useCase/useDriverFreightShares.ts` (+ teste), `useCase/index.ts` | Criar/Modificar | query das parcelas do motorista |
| `src/app/(auth)/(tabs)/menu/ganhos/_utils/freightShareDisplay.ts` (+ teste) | Criar | `describeFreightShare` |
| `src/app/(auth)/(tabs)/menu/historico/_components/RouteFreightShareCard.tsx` (+ teste) | Criar | cartão "Sua parte nesta rota" |
| `src/app/(auth)/(tabs)/menu/historico/[routeId]/index.tsx` | Modificar | monta o cartão |
| `src/app/(auth)/(tabs)/menu/ganhos/_components/PendingFreightByRoute.tsx` (+ teste) | Criar | seção "Fretes a liberar por rota" |
| `src/app/(auth)/(tabs)/menu/ganhos/index.tsx`, `ganhos/__tests__/periodoRecomputa.test.tsx` | Modificar | monta a seção; mock do barrel |
| `src/domain/agility/notification/__tests__/notificationTarget.test.ts` | Modificar | fixa `linkUrl: 'carteira'` |

Atalho usado nos comandos abaixo: `M="src/app/(auth)/(tabs)/menu"`.

---

### Task 1: Linha de base e textos do saque

**Files:**
- Modify: `src/app/(auth)/(tabs)/menu/carteira/_utils/debtPolicy.ts:56-92`
- Modify: `src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/debtPolicy.test.ts`
- Create: `src/app/(auth)/(tabs)/menu/carteira/_utils/withdrawalSubmit.ts`
- Create: `src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/withdrawalSubmit.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `withdrawalErrorMessage(error, fallback)` passa a cobrir `IDEMPOTENCY_KEY_REUSED` e `WALLET_INVARIANT_VIOLATION`;
  - `isWithdrawalKeyReused(error: unknown): boolean`;
  - `withdrawalSubmitToast(w: { status?: WithdrawalStatus | string } | null | undefined): { message: string; type: 'success' | 'error' }`.

- [ ] **Step 0: Linha de base** (no worktree)

```bash
cd C:/tmp/agility-wt/fin-f5c
test -e node_modules/.bin/jest && echo "node_modules ok"
npx tsc --noEmit; echo "tsc=$?"
npx jest --watchAll=false 2>&1 | grep -E "Tests:|Suites:"
```

Anote a contagem de testes e o resultado do `tsc` para a PR. Falha que já existe na linha de base não é deste plano: anote e siga.

- [ ] **Step 1: Teste que falha (textos)**

Em `debtPolicy.test.ts` (o arquivo já importa `withdrawalErrorMessage`; acrescente `isWithdrawalKeyReused` no import):

```ts
describe('erros da F6 no saque', () => {
    const erro = (code: string, extra: Record<string, unknown> = {}) => ({ success: false, error: { code, message: 'texto do back', ...extra } });

    it('IDEMPOTENCY_KEY_REUSED manda conferir Meus saques', () => {
        expect(withdrawalErrorMessage(erro('IDEMPOTENCY_KEY_REUSED'), 'fallback')).toBe(
            'Esta tela já enviou um pedido de saque com outro valor. Confira em Meus saques antes de pedir de novo.',
        );
        expect(isWithdrawalKeyReused(erro('IDEMPOTENCY_KEY_REUSED'))).toBe(true);
        expect(isWithdrawalKeyReused(erro('WITHDRAWAL_BLOCKED_BY_OVERDUE_DEBT'))).toBe(false);
        expect(isWithdrawalKeyReused(undefined)).toBe(false);
    });

    it('WALLET_INVARIANT_VIOLATION (409) não repete o texto do back, que é do operador', () => {
        const msg = withdrawalErrorMessage(erro('WALLET_INVARIANT_VIOLATION', { constraint: 'driver_wallets_balance_non_negative' }), 'fallback');
        expect(msg).toBe('Sua carteira está com o saldo em revisão e não aceitou o saque agora. Nada foi descontado. Fale com a central.');
        expect(msg).not.toContain('driver_wallets');
    });
});
```

Run: `npx jest --watchAll=false carteira/_utils/__tests__/debtPolicy`
Expected: FAIL (`isWithdrawalKeyReused` não existe; o texto é o do back).

- [ ] **Step 2: Implementar em `debtPolicy.ts`**

Depois de `const EXCEEDS = ...`:

```ts
const KEY_REUSED = 'IDEMPOTENCY_KEY_REUSED';
const INVARIANT = 'WALLET_INVARIANT_VIOLATION';
```

Em `withdrawalErrorMessage`, antes do `return mensagemDaApi(error, fallback);`:

```ts
    if (code === KEY_REUSED) {
        return 'Esta tela já enviou um pedido de saque com outro valor. Confira em Meus saques antes de pedir de novo.';
    }
    if (code === INVARIANT) {
        return 'Sua carteira está com o saldo em revisão e não aceitou o saque agora. Nada foi descontado. Fale com a central.';
    }
```

No fim do arquivo:

```ts
/**
 * A chave do saque (F6) já foi usada nesta tela com outro valor: o 1º pedido pode ter sido
 * gravado com a resposta perdida. A tela oferece ir a Meus saques em vez de tentar de novo.
 */
export function isWithdrawalKeyReused(error: unknown): boolean {
    return (error as ErroSaque)?.error?.code === KEY_REUSED;
}
```

Run: `npx jest --watchAll=false carteira/_utils/__tests__/debtPolicy`
Expected: PASS.

- [ ] **Step 3: Teste que falha (toast do sucesso)**

`withdrawalSubmit.test.ts`:

```ts
import { withdrawalSubmitToast } from '../withdrawalSubmit';

describe('withdrawalSubmitToast', () => {
    it.each([['PENDING'], ['PROCESSING'], [undefined]])('%s: pedido aceito agora', (status) => {
        expect(withdrawalSubmitToast({ status })).toEqual({ message: 'Saque solicitado. Acompanhe em Meus saques.', type: 'success' });
    });

    it('sem corpo (back antigo) conta como pedido aceito', () => {
        expect(withdrawalSubmitToast(undefined).type).toBe('success');
    });

    it('repetição de um saque já pago', () => {
        expect(withdrawalSubmitToast({ status: 'COMPLETED' })).toEqual({ message: 'Este saque já foi pago.', type: 'success' });
    });

    it('repetição de um saque que a empresa recusou', () => {
        expect(withdrawalSubmitToast({ status: 'CANCELLED' })).toEqual({
            message: 'Este saque foi recusado pela empresa. Veja o motivo em Meus saques.',
            type: 'error',
        });
    });

    it('repetição de um saque com falha no pagamento', () => {
        expect(withdrawalSubmitToast({ status: 'FAILED' })).toEqual({ message: 'Este saque teve falha no pagamento. Veja em Meus saques.', type: 'error' });
    });
});
```

Run: `npx jest --watchAll=false carteira/_utils/__tests__/withdrawalSubmit`
Expected: FAIL ("Cannot find module").

- [ ] **Step 4: Implementar `withdrawalSubmit.ts`**

```ts
import { WithdrawalStatus } from '@/domain/agility/wallet/dto/types';

export interface WithdrawalSubmitToast {
    message: string;
    type: 'success' | 'error';
}

/**
 * O back devolve o saque gravado. Com a `idempotencyKey` (F6), uma repetição devolve o pedido
 * original NO ESTADO ATUAL: se a empresa já o tratou, "Saque solicitado" mentiria (R2 da F5c).
 */
export function withdrawalSubmitToast(w: { status?: WithdrawalStatus | string } | null | undefined): WithdrawalSubmitToast {
    switch (w?.status) {
        case WithdrawalStatus.COMPLETED:
            return { message: 'Este saque já foi pago.', type: 'success' };
        case WithdrawalStatus.CANCELLED:
            return { message: 'Este saque foi recusado pela empresa. Veja o motivo em Meus saques.', type: 'error' };
        case WithdrawalStatus.FAILED:
            return { message: 'Este saque teve falha no pagamento. Veja em Meus saques.', type: 'error' };
        default:
            return { message: 'Saque solicitado. Acompanhe em Meus saques.', type: 'success' };
    }
}
```

Run: `npx jest --watchAll=false carteira/_utils/__tests__/withdrawalSubmit carteira/_utils/__tests__/debtPolicy`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
M="src/app/(auth)/(tabs)/menu"
git add "$M/carteira/_utils/debtPolicy.ts" "$M/carteira/_utils/__tests__/debtPolicy.test.ts" "$M/carteira/_utils/withdrawalSubmit.ts" "$M/carteira/_utils/__tests__/withdrawalSubmit.test.ts"
git commit -F - <<'EOF'
feat(carteira): textos do saque para chave repetida, carteira em revisao e repeticao de saque ja tratado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Saque com `idempotencyKey`

**Files:**
- Modify: `src/domain/agility/wallet/dto/request/wallet.request.ts:17-19`
- Modify: `src/app/(auth)/(tabs)/menu/carteira/saque.tsx:26-112`
- Modify: `src/app/(auth)/(tabs)/menu/carteira/__tests__/saque.test.tsx`
- Modify: `src/domain/agility/wallet/useCase/__tests__/useRequestWithdrawal.test.tsx:54,72`
- Create: `src/domain/agility/wallet/__tests__/walletAPI.test.ts`

**Interfaces:**
- Consumes: `withdrawalSubmitToast`, `isWithdrawalKeyReused`, `withdrawalErrorMessage` (Task 1).
- Produces: `CreateWithdrawalRequest = { amount: number; idempotencyKey: string }`. O `walletAPI.test.ts` criado aqui recebe testes nas Tasks 6 e 7.

- [ ] **Step 1: Tipo (obrigatório, para nenhum chamador esquecer)**

```ts
export interface CreateWithdrawalRequest {
    amount: number;
    /**
     * Trava de toque duplo (F6). UMA por montagem da tela de saque, reenviada em toda tentativa
     * daquela tela (R1 da F5c). Repetição devolve o saque já gravado; outro valor = 400
     * IDEMPOTENCY_KEY_REUSED. Só pode ir para o ar com o back da F6 no ambiente (forbidNonWhitelisted).
     */
    idempotencyKey: string;
}
```

Em `useRequestWithdrawal.test.tsx:54` e `:72`, `{ amount: 1000 }` vira `{ amount: 1000, idempotencyKey: '7d6c1f3e-0000-4000-8000-000000000001' }`.

- [ ] **Step 2: Teste do corpo no fio (falha até o Step 1 compilar; passa depois)**

`src/domain/agility/wallet/__tests__/walletAPI.test.ts`:

```ts
import { walletAPI } from '../walletAPI';

const mockPost = jest.fn();
const mockGet = jest.fn();
jest.mock('@/api/apiConfig', () => ({
    apiAgility: { post: (...a: unknown[]) => mockPost(...a), get: (...a: unknown[]) => mockGet(...a) },
}));

beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
});

describe('walletAPI.requestWithdrawal', () => {
    it('manda exatamente { amount, idempotencyKey } (forbidNonWhitelisted no back)', async () => {
        mockPost.mockResolvedValue({ data: { success: true, result: { id: 'w-1', status: 'PENDING' } } });

        const w = await walletAPI.requestWithdrawal({ amount: 5000, idempotencyKey: 'k-1' });

        expect(mockPost).toHaveBeenCalledWith('/wallet/withdrawal', { amount: 5000, idempotencyKey: 'k-1' });
        expect(w).toEqual({ id: 'w-1', status: 'PENDING' });
    });
});
```

Run: `npx jest --watchAll=false domain/agility/wallet/__tests__/walletAPI`
Expected: PASS (o `walletAPI` repassa o objeto). O teste fixa o corpo para as tarefas seguintes não acrescentarem campo.

- [ ] **Step 3: Testes da tela que falham**

Em `saque.test.tsx`:

1. Junto dos outros `jest.mock`, no topo:

```tsx
let mockUuidSeq = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++mockUuidSeq}` }));
```

2. O teste `'sucesso: pede o valor em centavos e vai para Meus saques'` passa a esperar a chave:

```tsx
        expect(mockRequestWithdrawal).toHaveBeenCalledWith({ amount: 5000, idempotencyKey: expect.stringMatching(/^uuid-\d+$/) });
```

3. Testes novos, num `describe('Saque — chave de idempotência (F6)')`:

```tsx
describe('Saque — chave de idempotência (F6)', () => {
    it('recusa e nova tentativa na mesma tela reenviam a MESMA chave, mesmo com outro valor', async () => {
        mockRequestWithdrawal
            .mockRejectedValueOnce({ success: false, error: { code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', maxAmountCents: 3000 } })
            .mockResolvedValueOnce({ id: 'wd-1', status: 'PENDING' });
        const tree = render();

        digitarEPedir(tree, 5000);
        await act(async () => {
            await mockModalProps!.onPress!();
        });
        digitarEPedir(tree, 3000);
        await act(async () => {
            await mockModalProps!.onPress!();
        });

        const [primeira, segunda] = mockRequestWithdrawal.mock.calls.map((c) => c[0]);
        expect(primeira.idempotencyKey).toBe(segunda.idempotencyKey);
        expect(segunda.amount).toBe(3000);
    });

    it('abrir a tela de novo (nova montagem) gera outra chave', async () => {
        mockRequestWithdrawal.mockResolvedValue({ id: 'wd-1', status: 'PENDING' });
        const t1 = render();
        digitarEPedir(t1, 5000);
        await act(async () => {
            await mockModalProps!.onPress!();
        });
        act(() => t1.unmount());

        const t2 = render();
        digitarEPedir(t2, 5000);
        await act(async () => {
            await mockModalProps!.onPress!();
        });

        const [a, b] = mockRequestWithdrawal.mock.calls.map((c) => c[0].idempotencyKey);
        expect(a).not.toBe(b);
    });

    it('repetição de um saque que a empresa já recusou: diz isso, sem "Saque solicitado", e vai para Meus saques', async () => {
        mockRequestWithdrawal.mockResolvedValue({ id: 'wd-1', status: 'CANCELLED' });
        const tree = render();
        digitarEPedir(tree, 5000);
        await act(async () => {
            await mockModalProps!.onPress!();
        });

        expect(mockShowToast).toHaveBeenCalledWith({
            message: 'Este saque foi recusado pela empresa. Veja o motivo em Meus saques.',
            type: 'error',
        });
        expect(mockShowToast).not.toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Saque solicitado') }));
        expect(mockRouter.replace).toHaveBeenCalledWith('/menu/carteira/saques');
    });

    it('IDEMPOTENCY_KEY_REUSED: toast com a ação "Meus saques", que leva à lista', async () => {
        mockRequestWithdrawal.mockRejectedValue({ success: false, error: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'x' } });
        const tree = render();
        digitarEPedir(tree, 5000);
        await act(async () => {
            await mockModalProps!.onPress!();
        });

        const toast = mockShowToast.mock.calls.at(-1)![0];
        expect(toast.message).toContain('Confira em Meus saques');
        expect(toast.action.title).toBe('Meus saques');
        act(() => toast.action.onPress());
        expect(mockRouter.replace).toHaveBeenCalledWith('/menu/carteira/saques');
    });
});
```

Se `beforeEach` do arquivo não zera `mockRequestWithdrawal` com `mockReset` (só `clearAllMocks`), os `mockResolvedValueOnce` encadeados acima funcionam do mesmo jeito. Confira que o `beforeEach` do topo volta `mockUseWithdrawalAllowance` ao padrão, porque o 1º teste depende do teto padrão (`allowance: null` → teto = disponível 10000).

Run: `npx jest --watchAll=false menu/carteira/__tests__/saque`
Expected: os 4 novos e o de sucesso falham (corpo sem chave; toast fixo "Saque solicitado").

- [ ] **Step 4: Implementar na tela**

Em `saque.tsx`:

1. Imports:

```tsx
import * as Crypto from 'expo-crypto';
```

e, ao lado do import de `debtPolicy`:

```tsx
import { isWithdrawalKeyReused, maxWithdrawalFromError, withdrawalErrorMessage } from './_utils/debtPolicy';
import { withdrawalSubmitToast } from './_utils/withdrawalSubmit';
```

(mantenha o que o import de `debtPolicy` já traz, acrescentando `isWithdrawalKeyReused`).

2. Depois de `const { run, isSubmitting, isLocked } = useSubmitLock();`:

```tsx
    // Uma chave por abertura da tela (R1 da F5c): toda tentativa daqui reenvia a mesma, inclusive
    // com outro valor. Abrir "Dados bancários" por cima não desmonta a tela; o sucesso a substitui.
    const [idempotencyKey] = useState(() => Crypto.randomUUID());
```

3. O corpo do `run` em `handleConfirmSaque` vira:

```tsx
        await run(async () => {
            try {
                const saque = await requestWithdrawal({ amount: value, idempotencyKey });
                showToast(withdrawalSubmitToast(saque));
                router.replace('/menu/carteira/saques');
            } catch (error) {
                const max = maxWithdrawalFromError(error);
                const action = isWithdrawalKeyReused(error)
                    ? { title: 'Meus saques', onPress: () => router.replace('/menu/carteira/saques') }
                    : max !== null
                      ? { title: 'Usar o máximo', onPress: () => setAmountCents(max) }
                      : null;
                showToast({
                    message: withdrawalErrorMessage(error, 'Não foi possível solicitar o saque. Tente novamente.'),
                    type: 'error',
                    ...(action ? { action } : {}),
                });
            }
        });
```

Run: `npx jest --watchAll=false menu/carteira/__tests__/saque domain/agility/wallet`
Expected: PASS, inclusive os testes antigos (toque duplo, reabrir com o pedido em voo, política de dívida).

- [ ] **Step 5: Tipos**

Run: `npx tsc --noEmit`
Expected: sem saída. Qualquer outro chamador de `requestWithdrawal` sem chave aparece aqui. Corrija mandando uma chave gerada **uma vez por abertura** daquela tela, nunca por chamada.

- [ ] **Step 6: Commit**

```bash
M="src/app/(auth)/(tabs)/menu"
git add src/domain/agility/wallet/dto/request/wallet.request.ts src/domain/agility/wallet/useCase/__tests__/useRequestWithdrawal.test.tsx src/domain/agility/wallet/__tests__/walletAPI.test.ts "$M/carteira/saque.tsx" "$M/carteira/__tests__/saque.test.tsx"
git commit -F - <<'EOF'
feat(carteira): saque manda idempotencyKey por abertura da tela

Toque duplo com rede lenta nao cria dois saques (F6). Repeticao de saque ja tratado
diz o estado real; chave repetida com outro valor oferece Meus saques. So vai para o
ar com o back da F6 no ambiente.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Resumo da carteira cru no cache e `useCashReturnDueDays`

**Files:**
- Modify: `src/domain/agility/wallet/dto/response/wallet.response.ts:158-166`
- Modify: `src/domain/agility/wallet/withdrawalAllowance.ts`
- Modify: `src/domain/agility/wallet/__tests__/withdrawalAllowance.test.ts`
- Modify: `src/domain/agility/wallet/useCase/useWithdrawalAllowance.ts`
- Modify: `src/domain/agility/wallet/useCase/__tests__/useWithdrawalAllowance.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `WalletSummaryResponse.cashReturnDueDays?: number`;
  - `cashReturnDueDaysOf(s: Pick<WalletSummaryResponse, 'cashReturnDueDays'> | null | undefined): number | null`;
  - `useCashReturnDueDays(options?: { enabled?: boolean }): number | null` (exportado de `useCase/useWithdrawalAllowance.ts`, e pelo barrel via `useCase/index.ts`, que já reexporta o arquivo).
- `useWithdrawalAllowance()` mantém a assinatura `{ allowance, isLoading, isError, refetch }`.

- [ ] **Step 1: Tipo**

Em `WalletSummaryResponse`, depois de `withdrawableBalance: number;`:

```ts
    /**
     * Prazo de devolução do dinheiro vivo, em dias (F6): inteiro em [0, 365], padrão 7 no back.
     * Ausente = back sem a F6. O vencimento é agora + N×24h (0 = vence na hora).
     */
    cashReturnDueDays?: number;
```

- [ ] **Step 2: Teste que falha (função pura)**

Em `withdrawalAllowance.test.ts`:

```ts
describe('cashReturnDueDaysOf', () => {
    it('inteiro entre 0 e 365 passa', () => {
        expect(cashReturnDueDaysOf({ cashReturnDueDays: 7 })).toBe(7);
        expect(cashReturnDueDaysOf({ cashReturnDueDays: 0 })).toBe(0);
        expect(cashReturnDueDaysOf({ cashReturnDueDays: 365 })).toBe(365);
    });

    it('ausente (back sem a F6), fora da faixa ou quebrado vira null: o texto não promete número', () => {
        expect(cashReturnDueDaysOf({})).toBeNull();
        expect(cashReturnDueDaysOf(null)).toBeNull();
        expect(cashReturnDueDaysOf({ cashReturnDueDays: -1 })).toBeNull();
        expect(cashReturnDueDaysOf({ cashReturnDueDays: 2.5 })).toBeNull();
        expect(cashReturnDueDaysOf({ cashReturnDueDays: 400 })).toBeNull();
    });
});
```

(acrescente `cashReturnDueDaysOf` ao import do arquivo.)

Run: `npx jest --watchAll=false domain/agility/wallet/__tests__/withdrawalAllowance`
Expected: FAIL.

- [ ] **Step 3: Implementar em `withdrawalAllowance.ts`**

No fim do arquivo:

```ts
/** O back limita a [0, 365] (`finance-settings.util.ts`). Fora disso, não confia no número. */
const CASH_RETURN_DUE_DAYS_MAX = 365;

/** Prazo de devolução do dinheiro vivo (F6). `null` = não sabe: o aviso não promete número (R5). */
export function cashReturnDueDaysOf(s: Pick<WalletSummaryResponse, 'cashReturnDueDays'> | null | undefined): number | null {
    const dias = s?.cashReturnDueDays;
    return typeof dias === 'number' && Number.isInteger(dias) && dias >= 0 && dias <= CASH_RETURN_DUE_DAYS_MAX ? dias : null;
}
```

(importe o tipo `WalletSummaryResponse` se o arquivo ainda não importa.)

Run: o mesmo comando. Expected: PASS.

- [ ] **Step 4: Teste que falha (hook: duas leituras, uma busca)**

Em `useWithdrawalAllowance.test.tsx`, acrescente `useCashReturnDueDays` ao import e, no fim:

```tsx
it('política e prazo leem o MESMO resumo cru: uma busca só, cada hook com a sua forma', async () => {
    mockGetSummary.mockResolvedValue({
        availableBalance: 10000, pendingAdvances: 0, withdrawalWithDebtPolicy: 'FREE', withdrawableBalance: 10000, cashReturnDueDays: 3,
    });
    let dias: number | null = null;
    function ProbeDias() {
        dias = useCashReturnDueDays();
        return null;
    }
    const queryClient = novoClient();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
                <ProbeDias />
            </QueryClientProvider>,
        );
    });
    await settle();

    expect(mockGetSummary).toHaveBeenCalledTimes(1);
    expect(resultado.allowance).toEqual({ policy: 'FREE', withdrawableCents: 10000, openDebtCents: 0, availableCents: 10000 });
    expect(dias).toBe(3);

    act(() => tree.unmount());
    queryClient.clear();
});

it('enabled: false não busca o resumo', async () => {
    let dias: number | null = 99;
    function ProbeDias() {
        dias = useCashReturnDueDays({ enabled: false });
        return null;
    }
    const queryClient = novoClient();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <ProbeDias />
            </QueryClientProvider>,
        );
    });
    await settle();

    expect(mockGetSummary).not.toHaveBeenCalled();
    expect(dias).toBeNull();

    act(() => tree.unmount());
    queryClient.clear();
});
```

Run: `npx jest --watchAll=false useCase/__tests__/useWithdrawalAllowance`
Expected: FAIL (`useCashReturnDueDays` não existe).

- [ ] **Step 5: Implementar o hook**

`useWithdrawalAllowance.ts` inteiro:

```ts
// src/domain/agility/wallet/useCase/useWithdrawalAllowance.ts

import { useQuery } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import type { WalletSummaryResponse } from '../dto';
import { walletAPI } from '../walletAPI';
import { cashReturnDueDaysOf, toWithdrawalAllowance } from '../withdrawalAllowance';

/**
 * `GET /wallet/summary`, guardado CRU sob `[KEY_WALLET, 'summary']`: cada leitura sai por `select`
 * (F5c). Duas formas de dado na mesma chave se sobrescreviam no cache. Sob `[KEY_WALLET]` de
 * propósito: o saque, a conclusão de parada e o push já invalidam esse prefixo.
 */
function useWalletSummary<T>(select: (s: WalletSummaryResponse) => T, enabled = true) {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    return useQuery({
        queryKey: [KEY_WALLET, 'summary'],
        queryFn: () => walletAPI.getSummary(),
        select,
        enabled: isAuthenticated && enabled,
        staleTime: 1000 * 60 * 2,
    });
}

/** Política de saque com dívida e o teto do saque (F3). */
export function useWithdrawalAllowance() {
    const { data, isLoading, isError, refetch } = useWalletSummary(toWithdrawalAllowance);
    return { allowance: data ?? null, isLoading, isError, refetch };
}

/** Prazo de devolução do dinheiro vivo em dias (F6). `null` = não sabe (carregando, erro, back antigo). */
export function useCashReturnDueDays(options: { enabled?: boolean } = {}): number | null {
    const { data } = useWalletSummary(cashReturnDueDaysOf, options.enabled ?? true);
    return data ?? null;
}
```

`toWithdrawalAllowance` e `cashReturnDueDaysOf` são funções do módulo, então a referência do `select` é estável (exigência do React Compiler). Confirme com `grep -rn "\[KEY_WALLET, 'summary'\]" src` que nenhum outro código lê ou grava essa chave à mão (`getQueryData`/`setQueryData`). Na escrita deste plano, só este arquivo a usava.

Run: `npx jest --watchAll=false useCase/__tests__/useWithdrawalAllowance domain/agility/wallet/__tests__/withdrawalAllowance menu/carteira`
Expected: PASS, inclusive os testes antigos do hook (normaliza; `moneyChangedKeys` alcança a chave) e as telas que usam `useWithdrawalAllowance` (saque, dívidas).

- [ ] **Step 6: Commit**

```bash
git add src/domain/agility/wallet/dto/response/wallet.response.ts src/domain/agility/wallet/withdrawalAllowance.ts src/domain/agility/wallet/__tests__/withdrawalAllowance.test.ts src/domain/agility/wallet/useCase/useWithdrawalAllowance.ts src/domain/agility/wallet/useCase/__tests__/useWithdrawalAllowance.test.tsx
git commit -F - <<'EOF'
feat(carteira): resumo cru no cache e prazo de devolucao do dinheiro vivo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: O aviso da conclusão diz o prazo

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/cashDebtWarning.ts:12-14`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/cashDebtWarning.test.ts`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/SharedEtapaFinalizacao.tsx:17,186,637`

**Interfaces:**
- Consumes: `useCashReturnDueDays` (Task 3).
- Produces: `cashDebtWarningText(days: number | null): string`. A constante `CASH_DEBT_WARNING_TEXT` deixa de existir.

- [ ] **Step 1: Teste que falha**

Em `cashDebtWarning.test.ts`, troque o import de `CASH_DEBT_WARNING_TEXT` (se houver) por `cashDebtWarningText` e acrescente:

```ts
describe('cashDebtWarningText', () => {
    const DESTINO = 'Vai aparecer em "A devolver à empresa" na sua carteira até você devolver.';

    it('sem o prazo (resumo não carregou, back antigo): o texto não promete número', () => {
        expect(cashDebtWarningText(null)).toBe(
            'Esse valor é da empresa. Vai aparecer em "A devolver à empresa" na sua carteira, com prazo de devolução, até você devolver.',
        );
    });

    it('N dias', () => {
        expect(cashDebtWarningText(7)).toBe(`Esse valor é da empresa. Devolva em até 7 dias. ${DESTINO}`);
    });

    it('1 dia, no singular', () => {
        expect(cashDebtWarningText(1)).toBe(`Esse valor é da empresa. Devolva em até 1 dia. ${DESTINO}`);
    });

    it('0: vence na hora', () => {
        expect(cashDebtWarningText(0)).toBe(`Esse valor é da empresa e deve ser devolvido hoje. ${DESTINO}`);
    });
});
```

Apague o teste que fixava a constante antiga, se existir (o caso `null` acima cobre o mesmo texto).

Run: `npx jest --watchAll=false parada/.*/_utils/__tests__/cashDebtWarning`. Se o regex com `.*` não casar por causa dos colchetes do caminho, use `npx jest --watchAll=false cashDebtWarning`.
Expected: FAIL.

- [ ] **Step 2: Implementar**

Em `cashDebtWarning.ts`, troque o comentário e a constante (linhas 12-14) por:

```ts
const DESTINO = 'Vai aparecer em "A devolver à empresa" na sua carteira até você devolver.';

/**
 * Aviso da conclusão com dinheiro vivo. `days` = `cashReturnDueDays` do resumo da carteira (F6):
 * o back vence a dívida em agora + N×24h. Sem o número, o texto não promete prazo (R5 da F5c).
 */
export function cashDebtWarningText(days: number | null): string {
    if (days === null) {
        return 'Esse valor é da empresa. Vai aparecer em "A devolver à empresa" na sua carteira, com prazo de devolução, até você devolver.';
    }
    if (days === 0) return `Esse valor é da empresa e deve ser devolvido hoje. ${DESTINO}`;
    return `Esse valor é da empresa. Devolva em até ${days} ${days === 1 ? 'dia' : 'dias'}. ${DESTINO}`;
}
```

Em `SharedEtapaFinalizacao.tsx`:

1. Linha 17: `import { CASH_DEBT_WARNING_TEXT, showsCashDebtWarning } from '../../_utils/cashDebtWarning';` vira `import { cashDebtWarningText, showsCashDebtWarning } from '../../_utils/cashDebtWarning';`.
2. Novo import, pelo caminho do arquivo (não pelo barrel):

```tsx
import { useCashReturnDueDays } from '@/domain/agility/wallet/useCase/useWithdrawalAllowance';
```

3. Logo depois da linha 186 (`const showCashDebtWarning = showsCashDebtWarning(paymentMethod);`):

```tsx
  // Só busca o resumo quando o aviso aparece (pagamento em dinheiro). Offline = texto sem número.
  const cashReturnDueDays = useCashReturnDueDays({ enabled: showCashDebtWarning });
```

Antes de colar, confira que não há `return` do componente antes da linha 186. Os `return;` das linhas 152 e 157 precisam estar dentro de funções internas (handlers): hook depois de um `return` antecipado do componente quebra a regra dos hooks.

4. Linha 637: `{CASH_DEBT_WARNING_TEXT}` vira `{cashDebtWarningText(cashReturnDueDays)}`.

5. `grep -rln "SharedEtapaFinalizacao\|CASH_DEBT_WARNING_TEXT" src --include=*.test.tsx`: se algum teste **renderiza** `SharedEtapaFinalizacao` (hoje só `useServiceCompletion.test.tsx` o cita), acrescente nele:

```tsx
jest.mock('@/domain/agility/wallet/useCase/useWithdrawalAllowance', () => ({ useCashReturnDueDays: () => null }));
```

Run: `npx jest --watchAll=false cashDebtWarning useServiceCompletion` e `npx tsc --noEmit`
Expected: PASS; `tsc` sem saída (nenhuma referência sobrou a `CASH_DEBT_WARNING_TEXT`).

- [ ] **Step 3: Commit**

```bash
P="src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]"
git add "$P/_utils/cashDebtWarning.ts" "$P/_utils/__tests__/cashDebtWarning.test.ts" "$P/_components/shared/SharedEtapaFinalizacao.tsx"
git commit -F - <<'EOF'
feat(conclusao): aviso de dinheiro vivo diz o prazo de devolucao em dias

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Se o `useServiceCompletion.test.tsx` precisou do mock, inclua-o no mesmo `git add`.

---

### Task 5: Cobranças com forma de pagamento, cancelado e dívida

**Files:**
- Modify: `src/domain/agility/finance/dto/response/payment.response.ts`
- Modify: `src/app/(auth)/(tabs)/menu/ganhos/_utils/paymentDisplay.ts:5-39`
- Modify: `src/app/(auth)/(tabs)/menu/ganhos/_utils/__tests__/paymentDisplay.test.ts`
- Modify: `src/app/(auth)/(tabs)/menu/ganhos/cobrancas.tsx:20-54`

**Interfaces:**
- Consumes: `advanceDueText`, `advanceOverdueText` (`menu/carteira/_utils/advanceDisplay.ts`); `PaymentMethodType` (`@/domain/agility/service/dto/types`).
- Produces:
  - `PaymentResponse.paymentMethod?`, `cancelledAt?`, `cancelReason?` e `debt?: PaymentDebtSnapshot | null`;
  - `PaymentDisplay` ganha `method: string | null`, `cancelText: string | null` e `debt: { text: string; overdue: boolean } | null`.

- [ ] **Step 1: Tipo**

Em `payment.response.ts`, importe `import type { PaymentMethodType } from '@/domain/agility/service/dto/types';`, declare antes de `PaymentResponse`:

```ts
/** Dívida do dinheiro vivo ligada à cobrança (F6). Valores em centavos. */
export interface PaymentDebtSnapshot {
    advanceId: string;
    status: 'PENDING' | 'PARTIAL' | 'RETURNED' | 'CANCELLED';
    amountCents: number;
    returnedAmountCents: number;
    /** Só PENDING/PARTIAL têm pendente; decidida = 0. */
    pendingAmountCents: number;
    dueDate: string | null;
    isOverdue: boolean;
}
```

e acrescente ao fim de `PaymentResponse`:

```ts
  /** Forma de pagamento (F6). `null` em cobrança pendente ou antiga. */
  paymentMethod?: PaymentMethodType | null;
  /** Cancelamento pela empresa (F6). Cancelado = REJECTED com `cancelledAt`; recusado não tem. */
  cancelledAt?: string | null;
  cancelReason?: string | null;
  /** Dívida do dinheiro vivo (F6). `null` = nenhuma ligada (PIX/cartão, ou o job ainda não criou). */
  debt?: PaymentDebtSnapshot | null;
```

- [ ] **Step 2: Testes que falham**

Em `paymentDisplay.test.ts`:

```ts
describe('describePayment — F6', () => {
    it('forma de pagamento por nome', () => {
        expect(describePayment(pagamento({ paymentMethod: 'CASH' as P['paymentMethod'] })).method).toBe('Dinheiro');
        expect(describePayment(pagamento({ paymentMethod: 'CARD_CREDIT' as P['paymentMethod'] })).method).toBe('Cartão de crédito');
        expect(describePayment(pagamento({ paymentMethod: null })).method).toBeNull();
    });

    it('REJECTED com cancelledAt é "Cancelado" com o motivo; sem, continua "Recusado"', () => {
        const cancelado = describePayment(pagamento({ status: 'REJECTED' as P['status'], cancelledAt: '2026-10-05T15:00:00.000Z', cancelReason: 'estorno' }));
        expect(cancelado.status.label).toBe('Cancelado');
        expect(cancelado.cancelText).toBe('Cancelado pela empresa: estorno');
        const recusado = describePayment(pagamento({ status: 'REJECTED' as P['status'] }));
        expect(recusado.status.label).toBe('Recusado');
        expect(recusado.cancelText).toBeNull();
    });

    it('cancelado sem motivo', () => {
        expect(describePayment(pagamento({ status: 'REJECTED' as P['status'], cancelledAt: '2026-10-05T15:00:00.000Z' })).cancelText).toBe(
            'Cancelado pela empresa.',
        );
    });

    const divida = (over: Record<string, unknown>) => ({
        advanceId: 'a-1', status: 'PENDING', amountCents: 15000, returnedAmountCents: 0, pendingAmountCents: 15000,
        dueDate: '2026-10-12T15:00:00.000Z', isOverdue: false, ...over,
    }) as P['debt'];

    it('dívida aberta: quanto falta e o vencimento', () => {
        expect(describePayment(pagamento({ debt: divida({}) })).debt).toEqual({ text: 'A devolver: R$ 150,00 · Vence em 12/10/2026', overdue: false });
    });

    it('dívida vencida e parcial', () => {
        const d = describePayment(pagamento({ debt: divida({ status: 'PARTIAL', pendingAmountCents: 5000, isOverdue: true }) })).debt;
        expect(d).toEqual({ text: 'A devolver: R$ 50,00 · Venceu em 12/10/2026', overdue: true });
    });

    it('devolvida e cancelada', () => {
        expect(describePayment(pagamento({ debt: divida({ status: 'RETURNED', pendingAmountCents: 0 }) })).debt).toEqual({ text: 'Devolvido à empresa', overdue: false });
        expect(describePayment(pagamento({ debt: divida({ status: 'CANCELLED', pendingAmountCents: 0, isOverdue: true }) })).debt).toEqual({
            text: 'Devolução cancelada pela empresa',
            overdue: false,
        });
    });

    it('sem dívida (null) ou back antigo (ausente): nenhuma linha, nenhuma forma inventada', () => {
        expect(describePayment(pagamento({ debt: null })).debt).toBeNull();
        const antigo = describePayment(pagamento());
        expect(antigo.debt).toBeNull();
        expect(antigo.method).toBeNull();
        expect(antigo.cancelText).toBeNull();
    });
});
```

`formatCurrency` usa `toLocaleString('pt-BR')`, que pode pôr espaço não separável depois de "R$". Se o `toEqual` falhar só por isso, troque o texto esperado por `` `A devolver: ${formatCurrency(15000)} · Vence em 12/10/2026` `` (importando `formatCurrency` de `@/utils/formatCurrency`), sem mudar o código. O 15:00Z de 12/10 é 12:00 em São Paulo, então o dia é 12/10.

Run: `npx jest --watchAll=false ganhos/_utils/__tests__/paymentDisplay`
Expected: FAIL.

- [ ] **Step 3: Implementar em `paymentDisplay.ts`**

1. Imports:

```ts
import { formatCurrency } from '@/utils/formatCurrency';

import { advanceDueText, advanceOverdueText } from '../../carteira/_utils/advanceDisplay';
```

2. Depois do `STATUS`:

```ts
const CANCELLED: StatusColorConfig = { label: 'Cancelado', textColor: 'gray400', bgColor: 'gray50' };

const METHOD_LABELS: Record<string, string> = {
    CASH: 'Dinheiro',
    PIX: 'PIX',
    CARD_DEBIT: 'Cartão de débito',
    CARD_CREDIT: 'Cartão de crédito',
};
```

3. O tipo `P` passa a incluir os campos novos:

```ts
type P = Pick<
    PaymentResponse,
    | 'customerName' | 'serviceTitle' | 'routingCode' | 'routingName' | 'expectedValue' | 'receivedValue' | 'status' | 'createdAt'
    | 'paymentMethod' | 'cancelledAt' | 'cancelReason' | 'debt'
>;
```

4. `PaymentDisplay` ganha:

```ts
    /** "Dinheiro", "PIX"... `null` sem a forma (pendente, cobrança antiga). */
    method: string | null;
    /** "Cancelado pela empresa: <motivo>" (UC15). */
    cancelText: string | null;
    /** Situação da dívida do dinheiro vivo (F6). `null` = o back não ligou dívida: não afirma nada (R4). */
    debt: { text: string; overdue: boolean } | null;
```

5. Função da dívida e o `describePayment`:

```ts
function debtLine(debt: P['debt']): PaymentDisplay['debt'] {
    if (!debt) return null;
    if (debt.status === 'RETURNED') return { text: 'Devolvido à empresa', overdue: false };
    if (debt.status === 'CANCELLED') return { text: 'Devolução cancelada pela empresa', overdue: false };
    const dueDate = debt.dueDate ?? undefined;
    const prazo = debt.isOverdue ? advanceOverdueText({ dueDate }) : advanceDueText({ dueDate });
    const valor = `A devolver: ${formatCurrency(debt.pendingAmountCents)}`;
    return { text: prazo ? `${valor} · ${prazo}` : valor, overdue: debt.isOverdue };
}

export function describePayment(p: P): PaymentDisplay {
    const cancelled = p.status === 'REJECTED' && !!p.cancelledAt;
    const motivo = p.cancelReason?.trim();
    return {
        title: p.customerName || 'Cliente',
        subtitle: p.serviceTitle ?? null,
        route: p.routingName || p.routingCode || null,
        status: cancelled ? CANCELLED : (STATUS[p.status] ?? STATUS.PENDING),
        amountCents: p.receivedValue ?? p.expectedValue,
        // SEMPRE `createdAt`, nunca `paymentDate`: (manter o comentário que já está aqui)
        date: p.createdAt,
        method: (p.paymentMethod && METHOD_LABELS[p.paymentMethod]) || null,
        cancelText: cancelled ? (motivo ? `Cancelado pela empresa: ${motivo}` : 'Cancelado pela empresa.') : null,
        debt: debtLine(p.debt),
    };
}
```

Mantenha o comentário longo sobre `createdAt` exatamente como está.

Run: `npx jest --watchAll=false ganhos/_utils/__tests__/paymentDisplay`
Expected: PASS, inclusive os testes antigos.

- [ ] **Step 4: Renderizar em `cobrancas.tsx`**

Em `PaymentItem`, depois do bloco `{d.route && (...)}` (linha 43):

```tsx
            {d.method && (
                <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                    {`Forma: ${d.method}`}
                </Text>
            )}
            {d.cancelText && (
                <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                    {d.cancelText}
                </Text>
            )}
            {d.debt && (
                <Text testID={`divida-${item.id}`} fontSize={measure.m12} color={d.debt.overdue ? 'colorTextError' : 'colorTextWarning'} mt="t2">
                    {d.debt.text}
                </Text>
            )}
```

Run: `npx tsc --noEmit && npx jest --watchAll=false menu/ganhos`
Expected: sem erro de tipo; PASS (`periodoRecomputa` continua passando).

- [ ] **Step 5: Commit**

```bash
M="src/app/(auth)/(tabs)/menu"
git add src/domain/agility/finance/dto/response/payment.response.ts "$M/ganhos/_utils/paymentDisplay.ts" "$M/ganhos/_utils/__tests__/paymentDisplay.test.ts" "$M/ganhos/cobrancas.tsx"
git commit -F - <<'EOF'
feat(ganhos): cobrancas com forma de pagamento, cancelado e o que falta devolver

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Dívidas abrem em "Em aberto" e mostram cliente e rota

**Files:**
- Modify: `src/domain/agility/wallet/dto/response/wallet.response.ts:134-156` (`AdvanceResponse`)
- Modify: `src/domain/agility/wallet/walletAPI.ts:61-67`
- Modify: `src/domain/agility/wallet/__tests__/walletAPI.test.ts`
- Modify: `src/domain/agility/wallet/useCase/useInfiniteWalletLists.ts:40-48`
- Modify: `src/app/(auth)/(tabs)/menu/carteira/_utils/advanceDisplay.ts`
- Modify: `src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/advanceDisplay.test.ts`
- Modify: `src/app/(auth)/(tabs)/menu/carteira/adiantamentos.tsx`
- Modify: `src/app/(auth)/(tabs)/menu/carteira/__tests__/adiantamentos.test.tsx`

**Interfaces:**
- Consumes: `AdvanceStatus` (`dto/types.ts`).
- Produces:
  - `walletAPI.getAdvances(page?: number, limit?: number, status?: AdvanceStatus[])`;
  - `type AdvancesFilter = 'open' | 'all'` e `useInfiniteAdvances(filter: AdvancesFilter = 'all')`, exportados de `useInfiniteWalletLists.ts`;
  - `advanceContext(a): { customer: string | null; route: string | null }`.

- [ ] **Step 1: Tipo**

Em `AdvanceResponse`, depois de `cancelReason?: string | null;`:

```ts
    /** Rótulos da lista (F6), por nome. `customerName` vem do pagamento ligado (adiantamento = null). */
    routingCode?: string | null;
    routingName?: string | null;
    customerName?: string | null;
```

- [ ] **Step 2: Testes que falham (API e leitura)**

Em `walletAPI.test.ts`:

```ts
describe('walletAPI.getAdvances', () => {
    it('sem status: só página e limite (o back lista todos)', async () => {
        mockGet.mockResolvedValue({ data: { success: true, result: { data: [], meta: { page: 1, totalPages: 1 } } } });
        await walletAPI.getAdvances(2, 20);
        expect(mockGet).toHaveBeenCalledWith('/wallet/advances', { params: { page: 2, limit: 20 } });
    });

    it('com status: vírgula, no formato que o back aceita', async () => {
        mockGet.mockResolvedValue({ data: { success: true, result: { data: [], meta: { page: 1, totalPages: 1 } } } });
        await walletAPI.getAdvances(1, 20, [AdvanceStatus.PENDING, AdvanceStatus.PARTIAL]);
        expect(mockGet).toHaveBeenCalledWith('/wallet/advances', { params: { page: 1, limit: 20, status: 'PENDING,PARTIAL' } });
    });
});
```

(importe `AdvanceStatus` de `../dto/types`.)

Em `advanceDisplay.test.ts`:

```ts
describe('advanceContext', () => {
    it('cliente e rota por nome (rota cai no código sem nome)', () => {
        expect(advanceContext({ customerName: 'Mercado Sol', routingName: 'Zona Sul', routingCode: 'LMR-1' })).toEqual({
            customer: 'Mercado Sol',
            route: 'Zona Sul',
        });
        expect(advanceContext({ customerName: null, routingName: null, routingCode: 'LMR-1' })).toEqual({ customer: null, route: 'LMR-1' });
    });

    it('sem rótulos (adiantamento, back antigo): nada', () => {
        expect(advanceContext({})).toEqual({ customer: null, route: null });
    });
});
```

Em `useCase/__tests__/useInfiniteWalletLists.test.tsx`, no molde dos testes de `useInfiniteAdvances` que o arquivo já tem (mesmo mock de `../../walletAPI`, mesmo `Probe`/`settle`):

```tsx
it('useInfiniteAdvances("open") pede só PENDING e PARTIAL; sem filtro, todos', async () => {
    // montar um Probe com useInfiniteAdvances('open') e outro com useInfiniteAdvances(), settle()
    expect(mockGetAdvances).toHaveBeenCalledWith(1, 20, ['PENDING', 'PARTIAL']);
    expect(mockGetAdvances).toHaveBeenCalledWith(1, 20, undefined);
});
```

Escreva a montagem por inteiro, copiando a do teste vizinho de `useInfiniteAdvances`. Use o nome do mock de `getAdvances` que o arquivo já tem.

Run: `npx jest --watchAll=false domain/agility/wallet/__tests__/walletAPI useCase/__tests__/useInfiniteWalletLists carteira/_utils/__tests__/advanceDisplay`
Expected: FAIL.

- [ ] **Step 3: Implementar API, hook e leitura**

`walletAPI.ts`, `getAdvances`:

```ts
    /** `status` (F6): um ou mais, enviados com vírgula (`PENDING,PARTIAL`). Sem ele, todos. */
    async getAdvances(page: number = 1, limit: number = 20, status?: AdvanceStatus[]): Promise<PagedResponse<AdvanceResponse>> {
        const response = await apiAgility.get(`${BASE_URL}/advances`, {
            params: { page, limit, ...(status?.length ? { status: status.join(',') } : {}) },
        });
        return unwrap<PagedResponse<AdvanceResponse>>(response.data);
    },
```

(importe `AdvanceStatus` de `./dto/types` no topo.)

`useInfiniteWalletLists.ts`:

```ts
/** Filtro da tela de dívidas (F5c R6): `open` = PENDING e PARTIAL. */
export type AdvancesFilter = 'open' | 'all';

const OPEN_STATUSES = [AdvanceStatus.PENDING, AdvanceStatus.PARTIAL];

/** Adiantamentos e dívidas de cobrança (`GET /wallet/advances`). */
export function useInfiniteAdvances(filter: AdvancesFilter = 'all') {
    const enabled = useIsAuthenticated();
    return useInfinitePagedList<AdvanceResponse>(
        [KEY_WALLET, 'advances', 'infinite', filter],
        (page) => walletAPI.getAdvances(page, ADVANCES_PAGE_SIZE, filter === 'open' ? OPEN_STATUSES : undefined),
        { enabled },
    );
}
```

(importe `AdvanceStatus` de `../dto/types`. A chave continua sob `[KEY_WALLET, 'advances']`, que as invalidações já alcançam.)

`advanceDisplay.ts`, no fim:

```ts
/** Cliente e rota da dívida por nome (F6). A rota cai no código quando não tem nome. */
export function advanceContext(
    a: Partial<Pick<AdvanceResponse, 'customerName' | 'routingName' | 'routingCode'>>,
): { customer: string | null; route: string | null } {
    return {
        customer: a.customerName?.trim() || null,
        route: a.routingName?.trim() || a.routingCode?.trim() || null,
    };
}
```

Run: o comando do Step 2. Expected: PASS.

- [ ] **Step 4: Testes da tela que falham**

Em `adiantamentos.test.tsx`:

1. O mock do barrel passa os argumentos adiante:

```tsx
    useInfiniteAdvances: (...args: unknown[]) => mockUseInfiniteAdvances(...args),
```

2. Testes novos (use `LISTA_OK` e o `render` do arquivo; `TouchableOpacityBox` vira um nó com `onPress`):

```tsx
describe('Dívidas — filtro e nomes (F6)', () => {
    it('abre em "Em aberto"; "Todas" troca o filtro', () => {
        mockUseInfiniteAdvances.mockReturnValue(LISTA_OK);
        const tree = render();
        expect(mockUseInfiniteAdvances).toHaveBeenLastCalledWith('open');

        act(() => {
            tree.root.findByProps({ testID: 'filtro-todas' }).props.onPress();
        });
        expect(mockUseInfiniteAdvances).toHaveBeenLastCalledWith('all');
    });

    it('vazio em "Em aberto" diz "Nenhuma dívida em aberto."', () => {
        mockUseInfiniteAdvances.mockReturnValue(LISTA_OK);
        const tree = render();
        expect(tree.root.findAllByProps({ children: 'Nenhuma dívida em aberto.' }).length).toBeGreaterThan(0);
    });

    it('dívida mostra cliente e rota por nome, nunca o id do pedido', () => {
        mockUseInfiniteAdvances.mockReturnValue({
            ...LISTA_OK,
            items: [{
                id: 'a-1', driverId: 'd-1', amount: 15000, returnedAmount: 0, pendingAmount: 15000, status: 'PENDING',
                description: 'Dinheiro recebido no service 2f6c1c8e-1111-2222-3333-a1b2c3d4e5f6 — devolução pendente',
                isOverdue: false, origin: 'CASH_COLLECTION', paymentId: 'p-1', createdAt: '2026-10-05T12:00:00.000Z',
                customerName: 'Mercado Sol', routingName: 'Zona Sul', routingCode: 'LMR-1',
            }],
        });
        const tree = render();

        expect(tree.root.findAllByProps({ children: 'Cliente: Mercado Sol' }).length).toBeGreaterThan(0);
        expect(tree.root.findAllByProps({ children: 'Rota: Zona Sul' }).length).toBeGreaterThan(0);
        expect(JSON.stringify(tree.toJSON())).not.toMatch(/2f6c1c8e|p-1"/);
    });
});
```

Se `render` ou `LISTA_OK` do arquivo tiverem outro nome, use os que existem. Os testes antigos que assumiam "Nenhum adiantamento." no vazio passam a precisar tocar em "Todas" antes. Ajuste-os, porque a tela agora abre filtrada.

Run: `npx jest --watchAll=false menu/carteira/__tests__/adiantamentos`
Expected: FAIL.

- [ ] **Step 5: Implementar na tela**

Em `adiantamentos.tsx`:

1. Imports: acrescente `useState` ao import do React, `advanceContext` ao import de `./_utils/advanceDisplay` e `type AdvancesFilter` ao import do barrel `@/domain/agility/wallet` (é tipo, some no build).

2. Em `AdvanceItem`, depois do `<Text>` da data (`formatDate(item.createdAt)`, linha 42), dentro do mesmo `<Box flex={1}>`:

```tsx
                    {contexto.customer && (
                        <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2" numberOfLines={1}>
                            {`Cliente: ${contexto.customer}`}
                        </Text>
                    )}
                    {contexto.route && (
                        <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2" numberOfLines={1}>
                            {`Rota: ${contexto.route}`}
                        </Text>
                    )}
```

com `const contexto = advanceContext(item);` junto das outras constantes do item (linha 32).

3. Em `AdiantamentosScreen`:

```tsx
    // F5c R6: abre nas dívidas em aberto; "Todas" mostra o histórico (devolvidas e canceladas).
    const [filtro, setFiltro] = useState<AdvancesFilter>('open');
    const { items, isLoading, isError, isFetchNextPageError, isFetchingNextPage, loadMore, refetch, isRefreshing } = useInfiniteAdvances(filtro);
```

4. Logo depois de `{resumo}`, os dois atalhos:

```tsx
            <Box flexDirection="row" gap="x8" px="x16" mt="t16">
                {([['open', 'Em aberto'], ['all', 'Todas']] as const).map(([valor, rotulo]) => (
                    <TouchableOpacityBox
                        key={valor}
                        testID={valor === 'open' ? 'filtro-em-aberto' : 'filtro-todas'}
                        onPress={() => setFiltro(valor)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: filtro === valor }}
                        px="x12"
                        py="y8"
                        borderRadius="s20"
                        borderWidth={1}
                        borderColor={filtro === valor ? 'primary100' : 'borderColor'}
                        backgroundColor={filtro === valor ? 'primary10' : undefined}
                    >
                        <Text fontSize={measure.m13} fontWeightPreset={filtro === valor ? 'semibold' : undefined}>
                            {rotulo}
                        </Text>
                    </TouchableOpacityBox>
                ))}
            </Box>
```

Os tokens de cor e espaço (`primary100`, `primary10`, `s20`, `x12`, `y8`) existem no tema (`primary10`/`s20` são usados no histórico). Se o `tsc` recusar algum, troque pelo token vizinho que o tema tem e não crie token novo.

5. No vazio (linha 168): `Nenhum adiantamento.` vira `{filtro === 'open' ? 'Nenhuma dívida em aberto.' : 'Nenhum adiantamento.'}`.

Run: `npx tsc --noEmit && npx jest --watchAll=false menu/carteira domain/agility/wallet`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
M="src/app/(auth)/(tabs)/menu"
git add src/domain/agility/wallet/dto/response/wallet.response.ts src/domain/agility/wallet/walletAPI.ts src/domain/agility/wallet/__tests__/walletAPI.test.ts src/domain/agility/wallet/useCase/useInfiniteWalletLists.ts "$M/carteira/_utils/advanceDisplay.ts" "$M/carteira/_utils/__tests__/advanceDisplay.test.ts" "$M/carteira/adiantamentos.tsx" "$M/carteira/__tests__/adiantamentos.test.tsx"
git commit -F - <<'EOF'
feat(carteira): dividas abrem em Em aberto e mostram cliente e rota por nome

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Parcelas do motorista: API, hook e leitura

**Files:**
- Modify: `src/domain/agility/wallet/dto/types.ts`
- Modify: `src/domain/agility/wallet/dto/request/wallet.request.ts`
- Modify: `src/domain/agility/wallet/dto/response/wallet.response.ts`
- Modify: `src/domain/agility/wallet/walletAPI.ts`
- Modify: `src/domain/agility/wallet/__tests__/walletAPI.test.ts`
- Create: `src/domain/agility/wallet/useCase/useDriverFreightShares.ts`
- Create: `src/domain/agility/wallet/useCase/__tests__/useDriverFreightShares.test.tsx`
- Modify: `src/domain/agility/wallet/useCase/index.ts`
- Create: `src/app/(auth)/(tabs)/menu/ganhos/_utils/freightShareDisplay.ts`
- Create: `src/app/(auth)/(tabs)/menu/ganhos/_utils/__tests__/freightShareDisplay.test.ts`

**Interfaces:**
- Consumes: `PagedResponse` (`@/domain/hooks/pagination`).
- Produces:
  - `enum FreightShareStatus { A_LIBERAR, LIBERADA, CANCELADA, SEM_VALOR }`;
  - `DriverFreightShareResponse` e `ListDriverFreightSharesRequest`;
  - `walletAPI.getFreightShares(params): Promise<PagedResponse<DriverFreightShareResponse>>`;
  - `FREIGHT_SHARES_LIMIT = 50`;
  - `useDriverFreightShares(params: { routingId?: string; status?: FreightShareStatus }, options?: { enabled?: boolean }): { page: PagedResponse<DriverFreightShareResponse> | null; isLoading: boolean; isError: boolean; refetch: () => void }`;
  - `describeFreightShare(s): FreightShareDisplay`.

- [ ] **Step 1: Tipos**

`dto/types.ts`, no fim:

```ts
/** Status da parcela de frete por rota × motorista (F2/F3; `GET /wallet/freight-shares`, F6). */
export enum FreightShareStatus {
    A_LIBERAR = 'A_LIBERAR',
    LIBERADA = 'LIBERADA',
    CANCELADA = 'CANCELADA',
    SEM_VALOR = 'SEM_VALOR',
}
```

`wallet.request.ts`, no fim (importe `FreightShareStatus` de `../types`):

```ts
/** `GET /wallet/freight-shares` (F6). `status` é UM valor; `limit` ≤ 100. */
export interface ListDriverFreightSharesRequest {
    routingId?: string;
    status?: FreightShareStatus;
    page?: number;
    limit?: number;
}
```

`wallet.response.ts`, no fim (importe `FreightShareStatus` de `../types`):

```ts
/**
 * A parte do motorista numa rota (F6, `GET /wallet/freight-shares`). Valores em centavos.
 * Ele NÃO vê o sugerido, o proporcional nem a política (R10 da F6).
 */
export interface DriverFreightShareResponse {
    id: string;
    routingId: string;
    routingCode: string | null;
    routingName: string | null;
    status: FreightShareStatus;
    stopsCompleted: number;
    stopsTotal: number;
    valueMode: string;
    fullAmountCents: number;
    /** Bloqueado esperando a empresa; 0 fora de A_LIBERAR. */
    amountToReleaseCents: number;
    releasedAmountCents: number | null;
    releasedAt: string | null;
    adjustReason: string | null;
    cancelledAt: string | null;
    cancelReason: string | null;
    createdAt: string | null;
}
```

- [ ] **Step 2: Testes que falham (API, hook, leitura)**

Em `walletAPI.test.ts`:

```ts
describe('walletAPI.getFreightShares', () => {
    it('manda só os filtros preenchidos', async () => {
        mockGet.mockResolvedValue({ data: { success: true, result: { data: [], meta: { page: 1, totalPages: 1, total: 0 } } } });
        await walletAPI.getFreightShares({ routingId: 'r-1', page: 1, limit: 50 });
        expect(mockGet).toHaveBeenCalledWith('/wallet/freight-shares', { params: { routingId: 'r-1', page: 1, limit: 50 } });
    });

    it('status único', async () => {
        mockGet.mockResolvedValue({ data: { success: true, result: { data: [], meta: { page: 1, totalPages: 1, total: 0 } } } });
        await walletAPI.getFreightShares({ status: FreightShareStatus.A_LIBERAR, page: 1, limit: 50 });
        expect(mockGet).toHaveBeenCalledWith('/wallet/freight-shares', { params: { status: 'A_LIBERAR', page: 1, limit: 50 } });
    });
});
```

`useCase/__tests__/useDriverFreightShares.test.tsx`, no molde de `useWithdrawalAllowance.test.tsx`: mock de `../../walletAPI` (`getFreightShares`) e de `@/services`, `Probe` com `useDriverFreightShares({ routingId: 'r-1' })`, `settle()`. Casos:

```tsx
it('busca a 1ª página com o limite fixo e devolve a página', async () => {
    mockGetFreightShares.mockResolvedValue({ data: [{ id: 's-1' }], meta: { page: 1, totalPages: 1, total: 1 } });
    // montar Probe…
    await settle();
    expect(mockGetFreightShares).toHaveBeenCalledWith({ routingId: 'r-1', page: 1, limit: 50 });
    expect(resultado.page?.data).toHaveLength(1);
});

it('erro não vira lista vazia: page null e isError', async () => {
    mockGetFreightShares.mockRejectedValue(new Error('rede'));
    // montar Probe…
    await settle();
    expect(resultado.page).toBeNull();
    expect(resultado.isError).toBe(true);
});

it('mora sob [KEY_WALLET]: moneyChangedKeys() refaz a busca', async () => {
    // mesmo molde do teste de useWithdrawalAllowance: invalidar moneyChangedKeys() e esperar 2 chamadas
});
```

Escreva o 3º caso por inteiro, copiando o corpo do teste `'moneyChangedKeys() alcança a query do hook montado'` de `useWithdrawalAllowance.test.tsx` e trocando o mock e o hook. Não deixe o comentário.

`freightShareDisplay.test.ts`:

```ts
import { FreightShareStatus } from '@/domain/agility/wallet/dto/types';
import type { DriverFreightShareResponse } from '@/domain/agility/wallet/dto/response/wallet.response';

import { describeFreightShare } from '../freightShareDisplay';

const parcela = (over: Partial<DriverFreightShareResponse> = {}): DriverFreightShareResponse => ({
    id: 's-1', routingId: 'r-0000-1111', routingCode: 'LMR-1', routingName: 'Zona Sul', status: FreightShareStatus.A_LIBERAR,
    stopsCompleted: 8, stopsTotal: 10, valueMode: 'TOTAL', fullAmountCents: 20000, amountToReleaseCents: 16000,
    releasedAmountCents: null, releasedAt: null, adjustReason: null, cancelledAt: null, cancelReason: null, createdAt: '2026-10-05T12:00:00.000Z',
    ...over,
});

describe('describeFreightShare', () => {
    it('a liberar: valor bloqueado, paradas e a espera', () => {
        expect(describeFreightShare(parcela())).toEqual({
            route: 'Zona Sul', status: { label: 'A liberar', textColor: 'yellow100', bgColor: 'yellow20' },
            amountCents: 16000, stops: '8 de 10 paradas', note: 'Esperando a empresa liberar', date: null,
        });
    });

    it('liberada com ajuste: valor liberado, data e o motivo da empresa', () => {
        const d = describeFreightShare(parcela({ status: FreightShareStatus.LIBERADA, amountToReleaseCents: 0, releasedAmountCents: 15000, releasedAt: '2026-10-06T12:00:00.000Z', adjustReason: 'atraso na coleta' }));
        expect(d.amountCents).toBe(15000);
        expect(d.note).toBe('Ajuste da empresa: atraso na coleta');
        expect(d.date).toBe('2026-10-06T12:00:00.000Z');
    });

    it('liberada sem ajuste: sem nota', () => {
        expect(describeFreightShare(parcela({ status: FreightShareStatus.LIBERADA, releasedAmountCents: 20000, releasedAt: '2026-10-06T12:00:00.000Z' })).note).toBeNull();
    });

    it('cancelada: sem valor, com o motivo', () => {
        const d = describeFreightShare(parcela({ status: FreightShareStatus.CANCELADA, amountToReleaseCents: 0, cancelReason: 'rota refeita' }));
        expect(d.amountCents).toBeNull();
        expect(d.note).toBe('Cancelado pela empresa: rota refeita');
    });

    it('sem valor: R$ 0 e a redistribuição', () => {
        const d = describeFreightShare(parcela({ status: FreightShareStatus.SEM_VALOR, amountToReleaseCents: 0 }));
        expect(d.amountCents).toBe(0);
        expect(d.note).toBe('Sem valor nesta rota: a empresa redistribuiu o frete');
    });

    it('rota sem nome cai no código; sem os dois, nunca o id', () => {
        expect(describeFreightShare(parcela({ routingName: null })).route).toBe('LMR-1');
        expect(describeFreightShare(parcela({ routingName: null, routingCode: null })).route).toBe('Rota sem nome');
    });

    it('rota sem paradas contadas: sem a linha de paradas', () => {
        expect(describeFreightShare(parcela({ stopsTotal: 0, stopsCompleted: 0 })).stops).toBeNull();
    });
});
```

Run: `npx jest --watchAll=false domain/agility/wallet ganhos/_utils/__tests__/freightShareDisplay`
Expected: FAIL nos novos.

- [ ] **Step 3: Implementar**

`walletAPI.ts` (importe `ListDriverFreightSharesRequest` e `DriverFreightShareResponse` do `./dto`):

```ts
    /** Parcelas do próprio motorista (F6). O back recorta pelo token: rota de outro = lista vazia. */
    async getFreightShares(params: ListDriverFreightSharesRequest): Promise<PagedResponse<DriverFreightShareResponse>> {
        const response = await apiAgility.get(`${BASE_URL}/freight-shares`, {
            params: {
                ...(params.routingId && { routingId: params.routingId }),
                ...(params.status && { status: params.status }),
                page: params.page ?? 1,
                limit: params.limit ?? 20,
            },
        });
        return unwrap<PagedResponse<DriverFreightShareResponse>>(response.data);
    },
```

`useCase/useDriverFreightShares.ts`:

```ts
// src/domain/agility/wallet/useCase/useDriverFreightShares.ts

import { useQuery } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import type { FreightShareStatus } from '../dto/types';
import { walletAPI } from '../walletAPI';

/** Uma página basta para as telas desta fase (R10 da F5c); passou disso, a tela diz "Mostrando N de M". */
export const FREIGHT_SHARES_LIMIT = 50;

/**
 * Parcelas do motorista (F6). Sob `[KEY_WALLET]`: conclusão, saque e push já invalidam. Erro
 * devolve `page: null`, nunca lista vazia (vazio é resposta legítima: rota sem frete para ele).
 */
export function useDriverFreightShares(
    params: { routingId?: string; status?: FreightShareStatus },
    options: { enabled?: boolean } = {},
) {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;
    const routingId = params.routingId ?? null;
    const status = params.status ?? null;

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY_WALLET, 'freight-shares', routingId, status],
        queryFn: () =>
            walletAPI.getFreightShares({
                ...(routingId ? { routingId } : {}),
                ...(status ? { status } : {}),
                page: 1,
                limit: FREIGHT_SHARES_LIMIT,
            }),
        enabled: isAuthenticated && (options.enabled ?? true),
        staleTime: 1000 * 60,
    });

    return { page: data ?? null, isLoading, isError, refetch };
}
```

O 1º teste do Step 2 espera `{ routingId: 'r-1', page: 1, limit: 50 }` exatamente. É o que o `queryFn` manda.

`useCase/index.ts`: acrescente `export * from './useDriverFreightShares';`.

`ganhos/_utils/freightShareDisplay.ts`:

```ts
import type { DriverFreightShareResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { FreightShareStatus } from '@/domain/agility/wallet/dto/types';
import type { StatusColorConfig } from '@/theme';

const STATUS: Record<FreightShareStatus, StatusColorConfig> = {
    [FreightShareStatus.A_LIBERAR]: { label: 'A liberar', textColor: 'yellow100', bgColor: 'yellow20' },
    [FreightShareStatus.LIBERADA]: { label: 'Liberado', textColor: 'tertiary100', bgColor: 'tertiary20' },
    [FreightShareStatus.CANCELADA]: { label: 'Cancelado', textColor: 'gray400', bgColor: 'gray50' },
    [FreightShareStatus.SEM_VALOR]: { label: 'Sem valor', textColor: 'gray400', bgColor: 'gray50' },
};

export interface FreightShareDisplay {
    /** Nome da rota, ou o código. Nunca o id. */
    route: string;
    status: StatusColorConfig;
    /** Centavos. `null` = não mostrar valor (cancelada). */
    amountCents: number | null;
    stops: string | null;
    note: string | null;
    /** Quando foi liberada. */
    date: string | null;
}

/** A parte do motorista numa rota (F6). Ele vê o motivo do ajuste/cancelamento, não o sugerido (R8 da F5c). */
export function describeFreightShare(s: DriverFreightShareResponse): FreightShareDisplay {
    const base = {
        route: s.routingName?.trim() || s.routingCode?.trim() || 'Rota sem nome',
        status: STATUS[s.status] ?? STATUS[FreightShareStatus.A_LIBERAR],
        stops: s.stopsTotal > 0 ? `${s.stopsCompleted} de ${s.stopsTotal} paradas` : null,
    };
    switch (s.status) {
        case FreightShareStatus.LIBERADA: {
            const motivo = s.adjustReason?.trim();
            return { ...base, amountCents: s.releasedAmountCents ?? 0, note: motivo ? `Ajuste da empresa: ${motivo}` : null, date: s.releasedAt };
        }
        case FreightShareStatus.CANCELADA: {
            const motivo = s.cancelReason?.trim();
            return { ...base, amountCents: null, note: motivo ? `Cancelado pela empresa: ${motivo}` : 'Cancelado pela empresa.', date: null };
        }
        case FreightShareStatus.SEM_VALOR:
            return { ...base, amountCents: 0, note: 'Sem valor nesta rota: a empresa redistribuiu o frete', date: null };
        default:
            return { ...base, amountCents: s.amountToReleaseCents, note: 'Esperando a empresa liberar', date: null };
    }
}
```

Run: `npx jest --watchAll=false domain/agility/wallet ganhos/_utils/__tests__/freightShareDisplay && npx tsc --noEmit`
Expected: PASS; sem erro de tipo.

- [ ] **Step 4: Commit**

```bash
M="src/app/(auth)/(tabs)/menu"
git add src/domain/agility/wallet/dto/types.ts src/domain/agility/wallet/dto/request/wallet.request.ts src/domain/agility/wallet/dto/response/wallet.response.ts src/domain/agility/wallet/walletAPI.ts src/domain/agility/wallet/__tests__/walletAPI.test.ts src/domain/agility/wallet/useCase/useDriverFreightShares.ts src/domain/agility/wallet/useCase/__tests__/useDriverFreightShares.test.tsx src/domain/agility/wallet/useCase/index.ts "$M/ganhos/_utils/freightShareDisplay.ts" "$M/ganhos/_utils/__tests__/freightShareDisplay.test.ts"
git commit -F - <<'EOF'
feat(carteira): parcelas de frete do motorista (GET /wallet/freight-shares)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: "Sua parte nesta rota" no histórico

**Files:**
- Create: `src/app/(auth)/(tabs)/menu/historico/_components/RouteFreightShareCard.tsx`
- Create: `src/app/(auth)/(tabs)/menu/historico/__tests__/RouteFreightShareCard.test.tsx`
- Modify: `src/app/(auth)/(tabs)/menu/historico/[routeId]/index.tsx:20,293-295`

**Interfaces:**
- Consumes: `useDriverFreightShares` (barrel `@/domain/agility/wallet`) e `describeFreightShare` (Task 7).
- Produces: `RouteFreightShareCard({ routingId }: { routingId: string })`.

- [ ] **Step 1: Teste que falha**

`historico/__tests__/RouteFreightShareCard.test.tsx`, com o mesmo cabeçalho de mocks de `carteira/__tests__/saque.test.tsx` (webview, async-storage, background-geolocation, `LocalIcon`, `@expo/vector-icons`) e `ThemeProvider`:

```tsx
const mockUseDriverFreightShares = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useDriverFreightShares: (...args: unknown[]) => mockUseDriverFreightShares(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RouteFreightShareCard } = require('../_components/RouteFreightShareCard');

function render(routingId = 'r-0000-1111') {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <RouteFreightShareCard routingId={routingId} />
            </ThemeProvider>,
        );
    });
    return tree;
}

const parcela = {
    id: 's-1', routingId: 'r-0000-1111', routingCode: 'LMR-1', routingName: 'Zona Sul', status: 'LIBERADA',
    stopsCompleted: 8, stopsTotal: 10, valueMode: 'TOTAL', fullAmountCents: 20000, amountToReleaseCents: 0,
    releasedAmountCents: 15000, releasedAt: '2026-10-06T12:00:00.000Z', adjustReason: 'atraso na coleta',
    cancelledAt: null, cancelReason: null, createdAt: '2026-10-05T12:00:00.000Z',
};

const textos = (tree: TestRenderer.ReactTestRenderer) => JSON.stringify(tree.toJSON());

beforeEach(() => jest.clearAllMocks());

describe('RouteFreightShareCard', () => {
    it('pede as parcelas DESTA rota', () => {
        mockUseDriverFreightShares.mockReturnValue({ page: null, isLoading: true, isError: false, refetch: jest.fn() });
        render('r-0000-1111');
        expect(mockUseDriverFreightShares).toHaveBeenCalledWith({ routingId: 'r-0000-1111' }, { enabled: true });
    });

    it('mostra o valor, as paradas, o status e o motivo do ajuste; nunca ids', () => {
        mockUseDriverFreightShares.mockReturnValue({ page: { data: [parcela], meta: { page: 1, totalPages: 1, total: 1 } }, isLoading: false, isError: false, refetch: jest.fn() });
        const tree = render();
        const t = textos(tree);
        expect(t).toContain('Sua parte nesta rota');
        expect(t).toContain('8 de 10 paradas');
        expect(t).toContain('Liberado');
        expect(t).toContain('Ajuste da empresa: atraso na coleta');
        expect(t).toContain(formatCurrency(15000));
        expect(t).not.toMatch(/s-1"|r-0000-1111/);
    });

    it('lista vazia (rota sem frete para ele): o cartão não aparece', () => {
        mockUseDriverFreightShares.mockReturnValue({ page: { data: [], meta: { page: 1, totalPages: 1, total: 0 } }, isLoading: false, isError: false, refetch: jest.fn() });
        const tree = render();
        expect(tree.toJSON()).toBeNull();
    });

    it('erro: avisa e tenta de novo no toque, não some', () => {
        const refetch = jest.fn();
        mockUseDriverFreightShares.mockReturnValue({ page: null, isLoading: false, isError: true, refetch });
        const tree = render();
        const erro = tree.root.findByProps({ testID: 'parte-da-rota-erro' });
        expect(textos(tree)).toContain('Não foi possível carregar sua parte nesta rota. Toque para tentar de novo.');
        act(() => erro.props.onPress());
        expect(refetch).toHaveBeenCalled();
    });
});
```

(importe `formatCurrency` de `@/utils/formatCurrency`, `theme` de `@/theme`, `ThemeProvider` de `@shopify/restyle`, `TestRenderer, { act }` de `react-test-renderer`.)

Run: `npx jest --watchAll=false historico/__tests__/RouteFreightShareCard`
Expected: FAIL ("Cannot find module").

- [ ] **Step 2: Implementar o cartão**

```tsx
// src/app/(auth)/(tabs)/menu/historico/_components/RouteFreightShareCard.tsx
import React from 'react';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { useDriverFreightShares } from '@/domain/agility/wallet';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

import { describeFreightShare } from '../../ganhos/_utils/freightShareDisplay';

/**
 * A parte do motorista nesta rota (F6, R9 da F5c). Vazio = a rota não tem frete para ele
 * (ex.: CLT fora de oferta): o cartão some. Erro não é vazio: avisa e tenta de novo.
 */
export function RouteFreightShareCard({ routingId }: { routingId: string }) {
    const { page, isError, refetch } = useDriverFreightShares({ routingId }, { enabled: !!routingId });

    if (isError) {
        return (
            <TouchableOpacityBox testID="parte-da-rota-erro" mb="b16" p="m12" borderRadius="s12" backgroundColor="gray50" onPress={() => void refetch()} accessibilityRole="button">
                <Text fontSize={measure.m13} color="colorTextError">
                    Não foi possível carregar sua parte nesta rota. Toque para tentar de novo.
                </Text>
            </TouchableOpacityBox>
        );
    }
    if (!page || page.data.length === 0) return null;

    return (
        <Box mb="b16" p="m12" borderRadius="s12" borderWidth={1} borderColor="borderColor">
            <Text fontSize={measure.m14} fontWeightPreset="bold" mb="b8">
                Sua parte nesta rota
            </Text>
            {page.data.map((s) => {
                const d = describeFreightShare(s);
                return (
                    <Box key={s.id} mt="t4">
                        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                            <Text fontSize={measure.m16} fontWeightPreset="bold">
                                {d.amountCents === null ? '—' : formatCurrency(d.amountCents)}
                            </Text>
                            <Box px="x8" py="y4" borderRadius="s4" bg={d.status.bgColor}>
                                <Text fontSize={measure.m12} fontWeightPreset="semibold" color={d.status.textColor}>
                                    {d.status.label}
                                </Text>
                            </Box>
                        </Box>
                        {d.stops && (
                            <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                                {d.stops}
                            </Text>
                        )}
                        {d.date && (
                            <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                                {`Liberado em ${formatDate(d.date)}`}
                            </Text>
                        )}
                        {d.note && (
                            <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                                {d.note}
                            </Text>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}
```

O teste espera a chamada `useDriverFreightShares({ routingId }, { enabled: true })`, que é exatamente o que o componente faz com `routingId` preenchido.

Run: `npx jest --watchAll=false historico/__tests__/RouteFreightShareCard`
Expected: PASS.

- [ ] **Step 3: Montar no histórico**

Em `historico/[routeId]/index.tsx`:

1. Import, junto do `routeValueLabel` (linha 20):

```tsx
import { RouteFreightShareCard } from '../_components/RouteFreightShareCard';
```

2. Entre o `</Box>` que fecha o bloco `{/* Resumo */}` (linha 293) e o comentário `{/* Contadores */}` (linha 295):

```tsx
        {/* Sua parte nesta rota (F6): valor, paradas e status da parcela do motorista */}
        <RouteFreightShareCard routingId={routeId || ''} />

```

A pílula "Valor da rota" (`routeValueLabel`, em reais) continua: é o valor cheio da rota, e o cartão diz quanto dele é do motorista.

Run: `npx tsc --noEmit && npx jest --watchAll=false menu/historico`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
H="src/app/(auth)/(tabs)/menu/historico"
git add "$H/_components/RouteFreightShareCard.tsx" "$H/__tests__/RouteFreightShareCard.test.tsx" "$H/[routeId]/index.tsx"
git commit -F - <<'EOF'
feat(historico): sua parte nesta rota (valor, paradas, status e motivo do ajuste)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 9: Ganhos lista os fretes a liberar por rota

**Files:**
- Create: `src/app/(auth)/(tabs)/menu/ganhos/_components/PendingFreightByRoute.tsx`
- Create: `src/app/(auth)/(tabs)/menu/ganhos/__tests__/PendingFreightByRoute.test.tsx`
- Modify: `src/app/(auth)/(tabs)/menu/ganhos/index.tsx:197-199`
- Modify: `src/app/(auth)/(tabs)/menu/ganhos/__tests__/periodoRecomputa.test.tsx:64-68`

**Interfaces:**
- Consumes: `useDriverFreightShares`, `FREIGHT_SHARES_LIMIT`, `describeFreightShare` (Task 7); `FreightShareStatus` **pelo caminho** `@/domain/agility/wallet/dto/types`.
- Produces: `PendingFreightByRoute()`.

- [ ] **Step 1: Teste que falha**

`ganhos/__tests__/PendingFreightByRoute.test.tsx`, no mesmo molde do teste da Task 8 (mock do barrel só com `useDriverFreightShares`). Casos:

```tsx
describe('PendingFreightByRoute', () => {
    it('pede só as parcelas A_LIBERAR', () => {
        mockUseDriverFreightShares.mockReturnValue({ page: null, isLoading: true, isError: false, refetch: jest.fn() });
        render();
        expect(mockUseDriverFreightShares).toHaveBeenCalledWith({ status: 'A_LIBERAR' });
    });

    it('lista rota, paradas e valor bloqueado; nunca ids', () => {
        mockUseDriverFreightShares.mockReturnValue({
            page: { data: [{ ...parcela, status: 'A_LIBERAR', amountToReleaseCents: 16000, releasedAmountCents: null, releasedAt: null, adjustReason: null }], meta: { page: 1, totalPages: 1, total: 1 } },
            isLoading: false, isError: false, refetch: jest.fn(),
        });
        const t = textos(render());
        expect(t).toContain('Fretes a liberar por rota');
        expect(t).toContain('Zona Sul');
        expect(t).toContain('8 de 10 paradas');
        expect(t).toContain(formatCurrency(16000));
        expect(t).not.toMatch(/s-1"|r-0000-1111/);
    });

    it('mais do que a página: "Mostrando 50 de 73"', () => {
        const data = Array.from({ length: 50 }, (_, i) => ({ ...parcela, id: `s-${i}`, status: 'A_LIBERAR' }));
        mockUseDriverFreightShares.mockReturnValue({ page: { data, meta: { page: 1, totalPages: 2, total: 73 } }, isLoading: false, isError: false, refetch: jest.fn() });
        expect(textos(render())).toContain('Mostrando 50 de 73.');
    });

    it('vazio diz que nada espera liberação', () => {
        mockUseDriverFreightShares.mockReturnValue({ page: { data: [], meta: { page: 1, totalPages: 1, total: 0 } }, isLoading: false, isError: false, refetch: jest.fn() });
        expect(textos(render())).toContain('Nenhum frete esperando liberação.');
    });

    it('erro: avisa e tenta de novo no toque, nunca "nenhum"', () => {
        const refetch = jest.fn();
        mockUseDriverFreightShares.mockReturnValue({ page: null, isLoading: false, isError: true, refetch });
        const tree = render();
        expect(textos(tree)).not.toContain('Nenhum frete');
        act(() => tree.root.findByProps({ testID: 'a-liberar-erro' }).props.onPress());
        expect(refetch).toHaveBeenCalled();
    });
});
```

Use o mesmo fixture `parcela` da Task 8 (copie-o para este arquivo).

Run: `npx jest --watchAll=false ganhos/__tests__/PendingFreightByRoute`
Expected: FAIL.

- [ ] **Step 2: Implementar a seção**

```tsx
// src/app/(auth)/(tabs)/menu/ganhos/_components/PendingFreightByRoute.tsx
import React from 'react';

import { ActivityIndicator, Box, Text, TouchableOpacityBox } from '@/components';
import { useDriverFreightShares } from '@/domain/agility/wallet';
import { FreightShareStatus } from '@/domain/agility/wallet/dto/types';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { describeFreightShare } from '../_utils/freightShareDisplay';

/** De quais rotas vem o "Frete a liberar" (F6, R10 da F5c). Não depende do período: é o bloqueado agora. */
export function PendingFreightByRoute() {
    const { page, isLoading, isError, refetch } = useDriverFreightShares({ status: FreightShareStatus.A_LIBERAR });
    const total = page?.meta.total ?? 0;

    return (
        <Box marginTop="y24">
            <Text preset="text16" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
                Fretes a liberar por rota
            </Text>
            {isError ? (
                <TouchableOpacityBox testID="a-liberar-erro" p="m12" borderRadius="s12" backgroundColor="gray50" onPress={() => void refetch()} accessibilityRole="button">
                    <Text fontSize={measure.m13} color="colorTextError">
                        Não foi possível carregar os fretes a liberar. Toque para tentar de novo.
                    </Text>
                </TouchableOpacityBox>
            ) : isLoading || !page ? (
                <ActivityIndicator />
            ) : page.data.length === 0 ? (
                <Text preset="text14" color="secondaryTextColor">
                    Nenhum frete esperando liberação.
                </Text>
            ) : (
                <>
                    {page.data.map((s) => {
                        const d = describeFreightShare(s);
                        return (
                            <Box key={s.id} flexDirection="row" justifyContent="space-between" alignItems="center" padding="m12" marginBottom="y10" borderRadius="s12" borderWidth={measure.m1} borderColor="borderColor">
                                <Box flex={1} marginRight="x8">
                                    <Text preset="text14" color="colorTextPrimary" numberOfLines={1}>
                                        {d.route}
                                    </Text>
                                    {d.stops && (
                                        <Text preset="text12" color="secondaryTextColor">
                                            {d.stops}
                                        </Text>
                                    )}
                                </Box>
                                <Text preset="text14" color="colorTextWarning" fontWeight="bold">
                                    {formatCurrency(d.amountCents ?? 0)}
                                </Text>
                            </Box>
                        );
                    })}
                    {total > page.data.length && (
                        <Text preset="text12" color="secondaryTextColor">
                            {`Mostrando ${page.data.length} de ${total}.`}
                        </Text>
                    )}
                </>
            )}
        </Box>
    );
}
```

O "Mostrando N de M" vem de `meta.total`. O limite da página mora no hook (`FREIGHT_SHARES_LIMIT`), e a seção não precisa dele.

Run: `npx jest --watchAll=false ganhos/__tests__/PendingFreightByRoute`
Expected: PASS.

- [ ] **Step 3: Montar em Ganhos e corrigir o mock do barrel**

Em `ganhos/index.tsx`:

1. Import: `import { PendingFreightByRoute } from './_components/PendingFreightByRoute';`.
2. Entre o `) : null}` que fecha o bloco de ganhos (linha 197) e o `<TouchableOpacityBox` do link de Cobranças (linha 199):

```tsx
                <PendingFreightByRoute />
```

Em `ganhos/__tests__/periodoRecomputa.test.tsx`, o mock do barrel (linhas 64-68) ganha:

```tsx
    useDriverFreightShares: () => ({ page: null, isLoading: false, isError: false, refetch: jest.fn() }),
```

Sem isso, a tela quebra no teste com "useDriverFreightShares is not a function".

Run: `npx tsc --noEmit && npx jest --watchAll=false menu/ganhos`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
M="src/app/(auth)/(tabs)/menu"
git add "$M/ganhos/_components/PendingFreightByRoute.tsx" "$M/ganhos/__tests__/PendingFreightByRoute.test.tsx" "$M/ganhos/index.tsx" "$M/ganhos/__tests__/periodoRecomputa.test.tsx"
git commit -F - <<'EOF'
feat(ganhos): fretes a liberar por rota

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 10: Aviso da troca de chave com o `linkUrl` do back (teste de contrato)

**Files:**
- Modify: `src/domain/agility/notification/__tests__/notificationTarget.test.ts:112-140`

**Interfaces:** nenhuma.

- [ ] **Step 1: Fixar o comportamento**

Dentro do `describe('aviso de troca da chave PIX (F3)')`:

```ts
    it('F6: o back manda linkUrl "carteira" e o destino é a rota nomeada que o mapa compartilhado resolve', () => {
        expect(
            resolverDestinoDaNotificacao(notificacao({ type: NotificationType.SYSTEM_ALERT, linkUrl: 'carteira', metadata })),
        ).toEqual({ tipo: 'nomeada', rota: 'carteira', params: metadata });
    });
```

Run: `npx jest --watchAll=false notification/__tests__/notificationTarget services/notification`
Expected: PASS de primeira (R11: o código já trata). Se **falhar**, não mude o teste: investigue `resolverDestinoDaNotificacao` (`notificationTarget.ts:60-78`) e o mapa `carteira` (`notificationRoutes.ts:85-86`) antes de seguir. O teste `'"carteira" abre a carteira'` de `notificationRoutes.test.ts` cobre o push (`data.route: 'carteira'`).

- [ ] **Step 2: Commit**

```bash
git add src/domain/agility/notification/__tests__/notificationTarget.test.ts
git commit -F - <<'EOF'
test(notificacoes): fixa o linkUrl carteira da troca de chave PIX (F6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 11: Verificação final e PR

**Files:** nenhum de código.

- [ ] **Step 1: Suíte, tipos e lint**

```bash
npx jest --watchAll=false 2>&1 | grep -E "Tests:|Suites:"
npx tsc --noEmit; echo "tsc=$?"
npx eslint src/api src/domain/agility/wallet src/domain/agility/finance src/domain/agility/notification "src/app/(auth)/(tabs)/menu/carteira" "src/app/(auth)/(tabs)/menu/ganhos" "src/app/(auth)/(tabs)/menu/historico" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared" 2>&1 | tail -3
```

Expected: 0 falhas, a contagem de testes **maior** que a linha de base da Task 1, `tsc=0` e `0 errors` no lint.

- [ ] **Step 2: Mutações (a guarda morde?)**

Para cada linha: aplique, rode o teste indicado, confirme que **falha** e reverta com `git checkout -- <arquivo>`:

| Mutação | Arquivo | Teste que deve falhar |
|---|---|---|
| `useState(() => Crypto.randomUUID())` → `Crypto.randomUUID()` direto no corpo (chave nova a cada render) | `carteira/saque.tsx` | `menu/carteira/__tests__/saque` ("mesma chave") |
| `case WithdrawalStatus.CANCELLED` → apagar | `carteira/_utils/withdrawalSubmit.ts` | `carteira/__tests__/saque` (repetição recusada) |
| `select` do `useWithdrawalAllowance` → `queryFn: async () => toWithdrawalAllowance(await walletAPI.getSummary())` sem `select` | `useCase/useWithdrawalAllowance.ts` | `useCase/__tests__/useWithdrawalAllowance` (prazo `3`) |
| `if (!debt) return null;` → `if (!debt) return { text: 'Sem dívida', overdue: false };` | `ganhos/_utils/paymentDisplay.ts` | `ganhos/_utils/__tests__/paymentDisplay` |
| `filter === 'open' ? OPEN_STATUSES : undefined` → `undefined` | `useCase/useInfiniteWalletLists.ts` | `useCase/__tests__/useInfiniteWalletLists` (filtro `open`) |
| `if (isError) {...}` → apagar | `historico/_components/RouteFreightShareCard.tsx` | `historico/__tests__/RouteFreightShareCard` |

Anote "mutação → testes mortos" para a PR. Mutação sem morte = teste fraco: corrija o teste antes de seguir.

- [ ] **Step 3: Push e PR**

Antes do push, confira com `pull_request_read` (method `get`) que a PR do plano ainda está **aberta**. Se foi mergeada, abra branch nova a partir de `origin/main` e use cherry-pick.

```bash
export GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never
timeout 120 git push -q https://DanielASantos-dev@github.com/consultoriaroteirizador-lab/agility-app.git HEAD:refs/heads/feat/financeiro-f5c
git ls-remote https://DanielASantos-dev@github.com/consultoriaroteirizador-lab/agility-app.git refs/heads/feat/financeiro-f5c
```

Atualize a descrição da PR com:
- uma seção por tarefa;
- os números (suíte, `tsc`, lint) e a tabela de mutações;
- **GATE de deploy** em destaque: nenhum build para um ambiente sem a #838 do agility-services no ar. Produção: conferir o bump no agility-infra;
- o **roteiro no aparelho** (dev, login de motorista):
  1. Saque: pedir, derrubar a rede na resposta (modo avião logo depois de confirmar), voltar e confirmar de novo → **um** saque em Meus saques.
  2. Concluir uma parada com pagamento em dinheiro → aviso "Devolva em até N dias" (N = configuração da empresa).
  3. Cobranças → forma de pagamento, "A devolver: … · Vence em …".
  4. Adiantamentos → abre em "Em aberto", com "Cliente:" e "Rota:"; "Todas" mostra as devolvidas.
  5. Histórico de uma rota de oferta concluída → "Sua parte nesta rota".
  6. Ganhos → "Fretes a liberar por rota".
  7. Trocar a chave PIX → a notificação abre a carteira.
- a pendência anotada: título "Rota <id>" no histórico da rota sem nome nem código (`historico/[routeId]/index.tsx:164`);
- a **decisão de produto a confirmar**: Dívidas abrindo em "Em aberto" (R6).

Tire a PR de rascunho só depois disso.

---

## Cobertura do contrato (auto-revisão)

| Linha do contrato (PR #838) | Task |
|---|---|
| `POST /wallet/withdrawal`: `idempotencyKey` por abertura, reenviada em toda tentativa; repetição devolve o original; outro valor = `IDEMPOTENCY_KEY_REUSED` | 1, 2 |
| `GET /finance/payments`: `paymentMethod`, `cancelledAt`, `cancelReason`, `debt` (Cobranças com vencimento) | 5 |
| `GET /wallet/summary`: `cashReturnDueDays` (aviso "devolva em N dias") | 3, 4 |
| `GET /wallet/advances`: `status=PENDING,PARTIAL`; `routingCode`, `routingName`, `customerName` | 6 |
| `GET /wallet/freight-shares` (Ganhos/histórico por rota) | 7, 8, 9 |
| notificação `wallet.pix_key_changed` com `linkUrl: 'carteira'` | 10 |
| `WALLET_INVARIANT_VIOLATION` (409, PR #842) no mapa de erros | 1 |
| `PATCH`/`DELETE /finance/payments/:id`, `admin/wallet/*` | painel (F4c), não app |
