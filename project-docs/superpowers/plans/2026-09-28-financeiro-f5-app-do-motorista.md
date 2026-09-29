# Financeiro F5: app do motorista. Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer as telas de dinheiro do app do motorista lerem o livro-razão da F2:
- extrato com sinal pela direção, selo de status e rolagem que acumula;
- carteira com disponível, frete a liberar, saque pendente e total;
- "Ganhos" com o frete liberado, vindo da carteira, e "Cobranças" separado;
- "Meus saques";
- saque e dados bancários sem falso sucesso nem envio duplo.

**Architecture:** A regra sai das telas para funções puras em `_utils/` (rota) e no domínio `src/domain/agility/wallet`, testadas com jest. As telas só chamam essas funções. Toda lista paginada passa por um hook genérico de `useInfiniteQuery` que acumula as páginas e descarta id repetido. Todo gesto de dinheiro passa por `mutateAsync` + `useSubmitLock` + `mensagemDaApi`. Nada muda no back: a F5 usa só o que a F1+F2 já expõem (`origin/development` do agility-services em 28/09/2026).

**Tech Stack:** React Native + Expo Router (typed routes), TanStack Query 5.90, Restyle, jest-expo 29 com `react-test-renderer` (o repo não tem `@testing-library`).

**Spec:** `agility-services/project-docs/superpowers/specs/2026-09-25-financeiro-motorista-casos-de-uso-design.md`: seção 5 (App), UC6, UC11, UC16 e as regras-mãe 1–6. Auditoria de origem: `lab-app/project-docs/auditorias/2026-09-24-financeiro-anexos/audit-app.md`, com os vereditos em `verify-front.md` (linhas "App").

## Global Constraints

- **Repo e branch:** agility-app (= lab-app). Use o worktree `C:/tmp/agility-wt/fin-f5`, na branch `feat/financeiro-f5` criada a partir de `origin/main`, e abra a PR contra `main` (este repo **não tem** `development`). O worktree usa `node_modules` por junction: **não rode `npm install`/`npm ci`**.
- **Deploy:** o build do app sai **depois** do deploy da F2 do back em cada ambiente. `direction`, `affectsBalance`, `sourceType`, `freightPendingBalance`, `withdrawalPendingBalance` e os 7 tipos novos só existem a partir da F2. Com o back antigo, o extrato perde o sinal.
- **Fora da F5 (é F3):** política de saque com dívida, `cashReturnDueDays`, divisão da parcela por motorista e qualquer tela de operador.
- **Dinheiro é inteiro em centavos**, do back até a tela. Formate com `formatCurrency(v)` (`src/utils/formatCurrency.ts`, que divide por 100) e nunca divida por 100 à mão. **A única exceção** é `chartDataFor` (Task 7): o `EarningsChart` recebe reais.
- **Mostre nome, nunca id:** nenhuma tela exibe `routingId`, `serviceId`, `sourceId`, `withdrawalId` nem o id do saque, nem mesmo o fim deles (`…a1b2c3d4`). A `description` do lançamento pode aparecer, porque o back já escreve o código da rota nela. A exceção é a dívida de cobrança, cuja descrição traz o id do serviço (Task 9).
- **Gesto de dinheiro** (saque e dados bancários):
  - `mutateAsync`, nunca `mutate`;
  - erro mostrado com `mensagemDaApi(error, fallback)` de `src/api/apiErrorMessage.ts`, importado pelo caminho do arquivo e não pelo barrel `@/api`;
  - `useSubmitLock` (Task 4) trava o envio e o botão fica `disabled` enquanto houver envio em voo;
  - fechar e reabrir o modal, ou tocar de novo, não dispara um segundo POST.
- **Erro não é vazio:** toda lista mostra estado de erro com "Tentar novamente" quando nada foi carregado, e rodapé "Toque para tentar de novo" quando só a próxima página falhou. Um erro nunca cai no texto de lista vazia.
- **Sem dependência nova.**
- **Comandos (verificados neste worktree em 28/09/2026):**
  - Teste: `npx jest --watchAll=false <padrão-do-caminho>`. O `npm test` é `jest --watchAll` e trava. O padrão é regex sobre o caminho, então use trechos sem parênteses, como `menu/carteira/__tests__/saque`. A 1ª execução de um teste de tela leva ~50 s (transformação).
  - Tipos: `npx tsc --noEmit`, que roda em ~15 s. **Sem saída = ok.**
  - Lint: `npx eslint <caminhos>`. Esperado: `0 errors`. Os 6 warnings pré-existentes em `extrato.tsx`, `saque.tsx` e `useGetPayments.ts` somem com as tasks.
- **Arquivos existentes são CRLF.** Edite com a ferramenta Edit ou reescreva o arquivo inteiro com Write. Nunca use `sed -i`/`perl -pi`, que trocam o CRLF ou apagam `@`. Em busca multilinha num arquivo CRLF, zero ocorrências **não** prova ausência.
- **Commits sem acentuação**, no padrão do histórico (`fix(carteira): ...`, `feat(ganhos): ...`), terminando com a linha `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Depois de cada commit, rode `graphify update .` (AST-only, sem custo). Se ele não existir no PATH, siga sem ele.

### Contrato do motorista (lido do código do back, `origin/development` com F1+F2)

Toda resposta vem envelopada em `{ success, message, result }`. O `walletAPI` desembrulha com `unwrap`, enquanto o `financeAPI` devolve o envelope e o chamador lê `.result`. Um erro chega como objeto `{ success: false, error: { message, code }, response: { status } }` (`src/api/apiConfig.ts:104-131`), e não como `Error`.

| Endpoint (`@Roles('DRIVER','COLLABORATOR','PROVIDER')`, `driverId` do token) | Contrato | Tela |
|---|---|---|
| `GET /wallet` (`wallet.controller.ts:37`) | `balance`, `freightPendingBalance`, `withdrawalPendingBalance`, `blockedBalance` (= frete + saque), `availableBalance` (= `balance − blocked`) e `hasBankInfo` (= `pixKey \|\| (bankName && bankAgency && bankAccount)`, `driver-wallet.entity.ts:158`). `bankName/bankAgency/bankAccount/pixKey/pixKeyType` vêm `null` quando vazios. | Carteira, Saque, Dados bancários, Ganhos |
| `GET /wallet/transactions` (`:46`) | Query: `page`, `limit` (`@Max(100)`), `type`, `status`, `startDate` e `endDate` (`ListTransactionsDto`). `type` e `status` são **igualdade exata de UM valor**; as datas passam por `new Date(str)` e comparam com `createdAt` (gte/lte). Ordem: `createdAt desc`, **sem desempate** (`prisma-wallet.repository.ts:180`). Resposta: `{ data, meta: { page, limit, total, totalPages } }`. | Extrato, Ganhos |
| Linha do extrato (`wallet-transaction.entity.ts:188`) | `type` é texto com 15 valores (`entities/types.ts:21-37`). `direction` é `IN`/`OUT` e NOT NULL desde a migration da F2 (o ADJUSTMENT legado ganhou direção pelo sinal). `affectsBalance` é `false` só em `FREIGHT_RELEASE`, `WITHDRAWAL_HOLD` e `WITHDRAWAL_HOLD_RELEASE`, que movem entre baldes. `status` é `PENDING\|COMPLETED\|CANCELLED\|FAILED`, e `amount` é > 0 em centavos. Vêm ainda `sourceType`, `sourceId` (o id da parcela em toda linha de frete), `description` e `proofUrls`, já assinadas. `isCredit`/`isDebit` derivam de `direction`. | Extrato, Ganhos |
| `PATCH /wallet/bank-info` (`:71`) | Aceita `{ bankName?, bankAgency?, bankAccount?, pixKey?, pixKeyType? }`, todos `@IsOptional`. `undefined` não mexe no campo. **`null` apaga**: o `@IsOptional` pula a validação e a entidade grava tudo o que for `!== undefined` (`driver-wallet.entity.ts:186-190`). Campo fora da lista dá 400 (`forbidNonWhitelisted`). | Dados bancários |
| `POST /wallet/withdrawal` (`:80`) | Corpo `{ amount }`, inteiro ≥ 100. Os 400 trazem `message`: "Saldo disponível insuficiente", "A carteira precisa ter informações bancárias cadastradas", "Carteira não está ativa" e "O valor mínimo para saque é R$ 1,00". Não há chave de idempotência: a trava é do cliente. | Saque |
| `GET /wallet/withdrawals?page&limit` (`:93`) | Resposta: `{ data, meta }`, em `createdAt desc`. O `status` é `PENDING\|PROCESSING\|COMPLETED\|CANCELLED\|FAILED`; o recusado vira `CANCELLED` com `rejectionReason` (`withdrawal.service.ts:312`). Vêm também `lastError`/`lastErrorAt` (a falha técnica da UC12 devolve o saque a PENDING), `method` `PIX\|TED\|MANUAL`, o snapshot do destino e `proofUrls` assinadas. | Meus saques |
| `GET /wallet/advances?page&limit` (`:105`) | Resposta: `{ data, meta }` com **todos** os status. A dívida de cobrança em dinheiro é um `DriverAdvance` com a descrição `Dinheiro recebido no service <uuid> — devolução pendente` (`payment.listener.ts:99`). | Adiantamentos |
| `GET /wallet/advances/summary` (`:117`) | `{ totalPending, count, overdueCount }`, só de PENDING/PARTIAL. | Carteira, Adiantamentos, Cobranças |
| `GET /finance/payments` (`finance.controller.ts:51`, `@Roles('COLLABORATOR')`) | O `driverId` é forçado pelo token (`resolveDriverScope`). `startDate`/`endDate` vão como `YYYY-MM-DD`, dia de São Paulo, e filtram `createdAt`. Paginação: `page`, `limit` ≤ 100, padrão 20. Resposta: `{ data, meta: { page, limit, totalItems, totalPages, hasNextPage, hasPreviousPage } }`. **Não devolve `paymentMethod`** (`payment.mapper.ts:10-29`). | Cobranças |
| `GET /wallet/summary` | Totais de todo o histórico, sem recorte por período. **Não usado.** | — |

Não existe evento de WebSocket nem push de carteira: nenhum listener consome `withdrawal.requested/completed/rejected` (grep em `agility-services/src`).

### Chaves do react-query (telas de dinheiro)

| Chave | Hook |
|---|---|
| `['wallet','balance']` | `useGetWallet` (já existe) |
| `['wallet','advances','summary']` | `useGetAdvancesSummary` (já existe) |
| `['wallet','transactions','infinite', filtros]` | `useInfiniteTransactions` (Task 1) |
| `['wallet','withdrawals','infinite']` | `useInfiniteWithdrawals` (Task 1) |
| `['wallet','advances','infinite']` | `useInfiniteAdvances` (Task 1) |
| `['wallet','earnings', startDateISO]` | `useFreightEarnings` (Task 7) |
| `['finance','payments','infinite', { startDate }]` | `useInfinitePayments` (Task 8) |

Quem invalida:
- **Saque e dados bancários** invalidam `[KEY_WALLET]`, o que pega todas as chaves acima que começam por `'wallet'`.
- **Mudança de status de parada e conclusão de rota** invalidam `[KEY_WALLET]` e `[KEY_FINANCE]` (Task 10).

## Review Focus

1. **O back recusa o saque depois do "Confirmar"**, por exemplo com "Saldo disponível insuficiente" numa corrida com outro saque. O motorista precisa ver a frase do back e nenhum toast verde. O valor digitado continua no campo e o botão destrava. Teste na Task 4.
2. **Segundo toque enquanto o primeiro saque está em voo**, seja confirmando duas vezes ou fechando o modal e tocando "Solicitar Saque" de novo: continua um POST só. Teste na Task 4.
3. **O motorista apaga a conta bancária (ou a chave PIX) e salva:** o campo precisa sumir no back. O payload manda `null`, nunca `undefined`. Teste na Task 5.
4. **Parcela de frete cancelada no período**, que gera `FREIGHT_RELEASE` e o estorno total no mesmo gesto: "Ganhos" não soma nem lista a parcela. Teste na Task 7.
5. **Rede falha ao abrir "Adiantamentos" ou "Cobranças":** a tela não pode dizer "nada a devolver". Mostra erro e deixa tentar de novo. Teste nas Tasks 8 e 9.

## Rulings (decisões que a spec não fechou)

| # | Decisão | Custo se errado |
|---|---|---|
| R1 | **Sinal e cor do extrato.** O sinal vem de `direction`. Linha com `affectsBalance: false` sai **sem sinal**, em cinza, com o texto do movimento entre baldes ("Frete a liberar → Disponível"), e assim frete e saque não aparecem em dobro. A cor segue o status: PENDING amarelo, CANCELLED/FAILED cinza, COMPLETED verde (IN) ou vermelho (OUT). | Se o dono quiser o bloqueio com sinal, é trocar uma linha em `describeTransaction`. O risco de ler dinheiro em dobro é maior. |
| R2 | **Filtros do extrato rodam no cliente**, sobre as páginas acumuladas. O back aceita um único `type` exato, e cada categoria junta 2 a 4 tipos. Filtro sem resultado entre as linhas carregadas oferece "Carregar mais antigas" em vez de dizer "nenhum". | Um tipo raro exige tocar "Carregar mais" algumas vezes. Resolver de vez pede `type` como lista no back (F3). |
| R3 | **"Ganhos" soma o frete liberado no período** (`FREIGHT_RELEASE` da parcela − estorno da mesma parcela, espelho de `ledger-summary.ts`). "Frete a liberar" é o **saldo atual** (`freightPendingBalance`), não o do período: separar o bloqueio por período exigiria ler todas as liberações, de qualquer data. Os créditos legados (anteriores à F2) ficam fora do Ganhos e continuam visíveis no Extrato. | O motorista com histórico anterior à F2 vê Ganhos zerado nesses meses. Mudar exige incluir `CREDIT` legado com `sourceType` `LEGACY_ROUTING`. |
| R4 | **"Ganhos" pagina tudo no cliente**, com `limit` 100 e teto de 20 páginas por tipo (2000 lançamentos). Ao bater o teto, a tela avisa "valores parciais". Não há resumo por período para o motorista, porque `/wallet/summary` cobre todo o histórico. | Com mais de 2000 liberações num ano, o total do ano aparece marcado como parcial. É tolerável até existir um agregado no back. |
| R5 | **"Cobranças" lista os `Payment` do motorista** no período, recortados pelo back, mais um cartão "Dinheiro a devolver" (o resumo dos adiantamentos) que leva à tela de Adiantamentos, onde está o vencimento. O back não devolve `paymentMethod`, então a lista não separa dinheiro de PIX linha a linha. | O motorista não vê qual cobrança virou dívida. O vínculo fica no Adiantamentos. Resolver pede `paymentMethod` no `PaymentResponseDto`. |
| R6 | **Sai o "Saldo disponível real" (disponível − dívida) da carteira.** A regra-mãe 3 diz que frete e dívida nunca se compensam, e a política de saque com dívida é F3. A dívida aparece em cartão próprio, que não subtrai nada. | Se a F3 escolher `EXCESS_ONLY`, o saque passa a recusar; o app mostra a mensagem do back (Task 4) e a carteira ganha a linha na F3. |
| R7 | **Dados bancários:** vale só PIX, só conta ou os dois. A conta é o trio completo (banco + agência + conta). É preciso ao menos um meio, que é o mesmo `hasBankInfo` do back. Campo apagado vai como `null`. Chave vazia leva `pixKey` e `pixKeyType` juntos a `null`. | Com o trio obrigatório, uma conta sem agência fica impossível. É o mesmo corte que o `hasBankInfo` já faz: sem o trio, o saque é recusado. |
| R8 | **A chave PIX é normalizada antes de salvar:** CPF/CNPJ só com dígitos, telefone como `+55DDDNÚMERO`, e-mail e chave aleatória em minúsculas. **Não há conferência de dígito verificador.** | Um CPF com dígito errado passa, e o PIX do operador falha. O motorista vê "Falhou" em Meus saques. |
| R9 | **Meus saques** mostra `rejectionReason` inteiro, porque o operador escreve para o motorista. `lastError` **não** aparece cru, porque é texto técnico. No lugar dele vai uma frase fixa, "o pagamento falhou uma vez e voltou para a fila da empresa". A chave e a conta do destino aparecem inteiras: são dados do próprio motorista. | O motorista fica sem o detalhe técnico, que ele não conseguiria resolver sozinho. |
| R10 | **Depois do saque aceito**, `router.replace('/menu/carteira/saques')`: a tela de saque sai da pilha, e voltar não reabre o formulário preenchido. **Depois de salvar dados bancários**, `router.back()`. | Quem quiser pedir dois saques seguidos precisa reabrir "Sacar", o que é intencional. |
| R11 | **Invalidação:** `[KEY_WALLET]` e `[KEY_FINANCE]` entram em `routeStopChangedKeys` e na conclusão da rota (`useCompleteRouting`). O push não ganha chave nova, porque o back não emite evento de carteira. | O `routing_updated` do `/monitoring` (ETA) também passa a invalidar a carteira. Isso só refaz a busca se a tela de carteira estiver montada, o que é barato. |
| R12 | **Adiantamentos lista todos os status**, com selo. Antes o cliente escondia devolvidos e cancelados, e com a acumulação uma página só de devolvidos daria "nenhum pendente" falso. A dívida de cobrança troca "service <uuid>" por "Dinheiro recebido de cliente". O vencimento sai com `formatDateOnly`, o dia-calendário que o painel grava. | A dívida de cobrança criada às 21h+ em SP pode mostrar vencimento um dia depois. Não há efeito em dinheiro: `isOverdue` vem do back. |
| R13 | **Páginas acumuladas descartam id repetido** (`mergeById`). O back ordena só por `createdAt`, e as linhas de um mesmo gesto têm o mesmo `createdAt`. | Uma linha **pulada** na fronteira de página continua possível. A correção é `orderBy: [{createdAt:'desc'},{id:'desc'}]` no back, fora da F5, e fica anotada na PR. |

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/domain/hooks/pagination.ts` | criar | `nextPageParam`, `mergeById`, `fetchAllPages`, tipos `PageMeta`/`PagedResponse` |
| `src/domain/hooks/useInfinitePagedList.ts` | criar | `useInfiniteQuery` genérico que acumula e expõe erro da próxima página |
| `src/domain/agility/wallet/useCase/useInfiniteWalletLists.ts` | criar | `useInfiniteTransactions`, `useInfiniteWithdrawals`, `useInfiniteAdvances` |
| `src/domain/agility/wallet/dto/types.ts` | modificar | 7 tipos da F2, `LedgerDirection`, `LedgerSourceType`; sai `UBERIZATION` |
| `src/domain/agility/wallet/dto/response/wallet.response.ts` | modificar | campos da F2 na carteira, na linha e no saque |
| `src/domain/agility/wallet/dto/request/wallet.request.ts` | modificar | `UpdateBankInfoRequest` aceita `null` |
| `src/domain/agility/wallet/walletAPI.ts` | modificar | tipos paginados; sai `getSummary` |
| `src/app/(auth)/(tabs)/menu/carteira/_utils/transactionDisplay.ts` | criar | rótulo, sinal, cor, selo, movimento e categoria de cada linha |
| `src/app/(auth)/(tabs)/menu/carteira/extrato.tsx` | reescrever | extrato acumulado |
| `src/app/(auth)/(tabs)/menu/carteira/index.tsx` | reescrever | carteira com os quatro saldos |
| `src/hooks/useSubmitLock.ts` | criar | trava síncrona de envio |
| `src/domain/agility/wallet/useCase/useRequestWithdrawal.ts` | modificar | `mutateAsync` |
| `src/app/(auth)/(tabs)/menu/carteira/saque.tsx` | reescrever | saque com mensagem do back e trava |
| `src/utils/validatePix.ts` | modificar | telefone aceita `+55` |
| `src/app/(auth)/(tabs)/menu/carteira/_utils/bankInfoForm.ts` | criar | regras e payload dos dados bancários |
| `src/domain/agility/wallet/useCase/useUpdateBankInfo.ts` | modificar | `mutateAsync` |
| `src/app/(auth)/(tabs)/menu/carteira/config/dados-bancarios.tsx` | reescrever | formulário com limpar campo e trava |
| `src/app/(auth)/(tabs)/menu/carteira/_utils/withdrawalDisplay.ts` | criar | status, destino e nota do saque |
| `src/app/(auth)/(tabs)/menu/carteira/saques.tsx` | criar | Meus saques |
| `src/domain/agility/wallet/freightEarnings.ts` | criar | frete liberado por parcela (espelho do `ledger-summary` do back) |
| `src/domain/agility/wallet/useCase/useFreightEarnings.ts` | criar | busca do período |
| `src/app/(auth)/(tabs)/menu/ganhos/_utils/period.ts` | criar | início do período e dados do gráfico |
| `src/app/(auth)/(tabs)/menu/ganhos/index.tsx` | reescrever | Ganhos pelo livro-razão |
| `src/domain/agility/finance/paymentsPage.ts` | criar | normaliza a resposta de `/finance/payments` |
| `src/domain/agility/finance/useCase/useInfinitePayments.ts` | criar | cobranças paginadas |
| `src/app/(auth)/(tabs)/menu/ganhos/_utils/paymentDisplay.ts` | criar | linha da cobrança e cartão da dívida |
| `src/app/(auth)/(tabs)/menu/ganhos/cobrancas.tsx` | criar | Cobranças |
| `src/app/(auth)/(tabs)/menu/carteira/_utils/advanceDisplay.ts` | criar | título e vencimento do adiantamento |
| `src/app/(auth)/(tabs)/menu/carteira/adiantamentos.tsx` | reescrever | acumula, erro ≠ vazio, vencimento |
| `src/domain/queryKeys.ts` | modificar | `moneyChangedKeys` dentro de `routeStopChangedKeys` |
| `src/domain/agility/routing/useCase/useCompleteRouting.ts` | modificar | invalida dinheiro ao concluir rota |
| hooks e DTOs de operador em `finance/` e `wallet/` | apagar | código morto (Task 11) |

---

### Task 1: Paginação que acumula (base de todas as listas)

Hoje, `extrato.tsx` e `adiantamentos.tsx` trocam a página em vez de acumular: a lista some durante o carregamento, e o pull-to-refresh recarrega a página 2 (auditoria, Bug 7). Esta task entrega o mecanismo, e as telas o adotam nas Tasks 2, 6 e 9.

**Files:**
- Create: `src/domain/hooks/pagination.ts`
- Create: `src/domain/hooks/useInfinitePagedList.ts`
- Create: `src/domain/agility/wallet/useCase/useInfiniteWalletLists.ts`
- Modify: `src/domain/agility/wallet/walletAPI.ts` (tipos de `getWithdrawals`/`getAdvances`)
- Modify: `src/domain/agility/wallet/useCase/index.ts`
- Test: `src/domain/hooks/__tests__/pagination.test.ts`
- Test: `src/domain/hooks/__tests__/useInfinitePagedList.test.tsx`
- Test: `src/domain/agility/wallet/useCase/__tests__/useInfiniteWalletLists.test.tsx`

**Interfaces:**
- Produces:
  - `interface PageMeta { page: number; totalPages: number; limit?: number; total?: number }`
  - `interface PagedResponse<T> { data: T[]; meta: PageMeta }`
  - `nextPageParam(meta: PageMeta | undefined | null): number | undefined`
  - `mergeById<T extends { id: string }>(pages: readonly { data: readonly T[] }[] | undefined): T[]`
  - `fetchAllPages<T extends { id: string }>(fetchPage: (page: number) => Promise<PagedResponse<T>>, maxPages: number): Promise<{ items: T[]; truncated: boolean }>`
  - `interface InfinitePagedList<T> { items: T[]; isLoading: boolean; isError: boolean; isFetchNextPageError: boolean; hasNextPage: boolean; isFetchingNextPage: boolean; loadMore: () => void; refetch: () => void; isRefreshing: boolean }`
  - `useInfinitePagedList<T extends { id: string }>(queryKey: readonly unknown[], fetchPage: (page: number) => Promise<PagedResponse<T>>, options: { enabled: boolean; staleTime?: number }): InfinitePagedList<T>`
  - `useInfiniteTransactions(filters?: TransactionFilters): InfinitePagedList<TransactionResponse>`, com `TransactionFilters = Omit<ListTransactionsRequest, 'page' | 'limit'>`
  - `useInfiniteWithdrawals(): InfinitePagedList<WithdrawalResponse>`
  - `useInfiniteAdvances(): InfinitePagedList<AdvanceResponse>`
  - `TRANSACTIONS_PAGE_SIZE = 20`

- [ ] **Step 1: Write the failing tests**

```ts
// src/domain/hooks/__tests__/pagination.test.ts
import { fetchAllPages, mergeById, nextPageParam } from '../pagination';

const item = (id: string) => ({ id });

describe('nextPageParam', () => {
    it('avança enquanto page < totalPages', () => {
        expect(nextPageParam({ page: 1, totalPages: 3 })).toBe(2);
    });

    it('para na última página', () => {
        expect(nextPageParam({ page: 3, totalPages: 3 })).toBeUndefined();
    });

    it('lista vazia (totalPages 0) não pede página 2', () => {
        expect(nextPageParam({ page: 1, totalPages: 0 })).toBeUndefined();
    });

    it('sem meta, não há próxima', () => {
        expect(nextPageParam(undefined)).toBeUndefined();
    });
});

describe('mergeById', () => {
    it('acumula na ordem das páginas', () => {
        const ids = mergeById([{ data: [item('a'), item('b')] }, { data: [item('c')] }]).map((i) => i.id);
        expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('linha repetida na fronteira de página (mesmo createdAt no back) entra uma vez só', () => {
        const ids = mergeById([{ data: [item('a'), item('b')] }, { data: [item('b'), item('c')] }]).map((i) => i.id);
        expect(ids).toEqual(['a', 'b', 'c']);
    });
});

describe('fetchAllPages', () => {
    it('busca até a última página e descarta repetidos', async () => {
        const fetchPage = jest.fn(async (page: number) =>
            page === 1
                ? { data: [item('a'), item('b')], meta: { page: 1, totalPages: 2 } }
                : { data: [item('b'), item('c')], meta: { page: 2, totalPages: 2 } },
        );

        const result = await fetchAllPages(fetchPage, 10);

        expect(result).toEqual({ items: [item('a'), item('b'), item('c')], truncated: false });
        expect(fetchPage).toHaveBeenCalledTimes(2);
    });

    it('para no teto e avisa que truncou', async () => {
        const fetchPage = jest.fn(async (page: number) => ({ data: [item(`i${page}`)], meta: { page, totalPages: 50 } }));

        const result = await fetchAllPages(fetchPage, 3);

        expect(result.truncated).toBe(true);
        expect(result.items.map((i) => i.id)).toEqual(['i1', 'i2', 'i3']);
        expect(fetchPage).toHaveBeenCalledTimes(3);
    });
});
```

```tsx
// src/domain/hooks/__tests__/useInfinitePagedList.test.tsx
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import type { PagedResponse } from '../pagination';
import { InfinitePagedList, useInfinitePagedList } from '../useInfinitePagedList';

type Item = { id: string };
const mockFetchPage = jest.fn<Promise<PagedResponse<Item>>, [number]>();

let lista!: InfinitePagedList<Item>;
function Probe() {
    lista = useInfinitePagedList<Item>(['teste', 'lista'], (page) => mockFetchPage(page), { enabled: true });
    return null;
}

let queryClient: QueryClient;
let tree: TestRenderer.ReactTestRenderer | null = null;

// O notifyManager do react-query agenda por setTimeout(0): esvaziar só a fila de microtasks não basta.
async function settle() {
    for (let i = 0; i < 10; i++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
}

const pagina = (page: number, totalPages: number, ids: string[]): PagedResponse<Item> => ({
    data: ids.map((id) => ({ id })),
    meta: { page, totalPages },
});

beforeEach(() => {
    mockFetchPage.mockReset();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});

afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = null;
    queryClient.clear();
});

async function montar() {
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    await settle();
}

describe('useInfinitePagedList', () => {
    it('carregar mais ACUMULA a página seguinte em vez de trocar', async () => {
        mockFetchPage.mockImplementation(async (page) => (page === 1 ? pagina(1, 2, ['a', 'b']) : pagina(2, 2, ['b', 'c'])));
        await montar();

        expect(lista.items.map((i) => i.id)).toEqual(['a', 'b']);
        expect(lista.hasNextPage).toBe(true);

        act(() => lista.loadMore());
        await settle();

        expect(lista.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
        expect(lista.hasNextPage).toBe(false);
        expect(mockFetchPage).toHaveBeenNthCalledWith(1, 1);
        expect(mockFetchPage).toHaveBeenNthCalledWith(2, 2);
    });

    it('falha na PRÓXIMA página mantém o que já carregou e sinaliza o erro da página', async () => {
        mockFetchPage.mockImplementation(async (page) => {
            if (page === 1) return pagina(1, 2, ['a']);
            throw { success: false, error: { message: 'Sem conexão', code: 'AU-000' } };
        });
        await montar();

        act(() => lista.loadMore());
        await settle();

        expect(lista.items.map((i) => i.id)).toEqual(['a']);
        expect(lista.isFetchNextPageError).toBe(true);
    });

    it('falha na primeira página é erro, não lista vazia', async () => {
        mockFetchPage.mockRejectedValue({ success: false, error: { message: 'Sem conexão', code: 'AU-000' } });
        await montar();

        expect(lista.isError).toBe(true);
        expect(lista.items).toEqual([]);
        expect(lista.isLoading).toBe(false);
    });
});
```

```tsx
// src/domain/agility/wallet/useCase/__tests__/useInfiniteWalletLists.test.tsx
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { useInfiniteTransactions } from '../useInfiniteWalletLists';

const mockGetTransactions = jest.fn();
jest.mock('../../walletAPI', () => ({
    walletAPI: { getTransactions: (...args: unknown[]) => mockGetTransactions(...args) },
}));
jest.mock('@/services', () => ({
    useAuthCredentialsService: () => ({ authCredentials: { accessToken: 't', tenantId: 'c-1' } }),
}));

let resultado!: ReturnType<typeof useInfiniteTransactions>;
function Probe() {
    resultado = useInfiniteTransactions({ type: 'FREIGHT' });
    return null;
}

async function settle() {
    for (let i = 0; i < 10; i++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
}

it('pede a página 1 com o tamanho fixo e repassa os filtros', async () => {
    mockGetTransactions.mockResolvedValue({ data: [{ id: 'tx-1' }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    await settle();

    expect(mockGetTransactions).toHaveBeenCalledWith({ type: 'FREIGHT', page: 1, limit: 20 });
    expect(resultado.items).toEqual([{ id: 'tx-1' }]);

    act(() => tree.unmount());
    queryClient.clear();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --watchAll=false domain/hooks/__tests__ wallet/useCase/__tests__/useInfiniteWalletLists`
Expected: FAIL com "Cannot find module '../pagination'", "Cannot find module '../useInfinitePagedList'" e "Cannot find module '../useInfiniteWalletLists'".

- [ ] **Step 3: Write the implementation**

```ts
// src/domain/hooks/pagination.ts

/**
 * Paginação por página (page/totalPages), no formato que o agility-services devolve em
 * `/wallet/transactions`, `/wallet/withdrawals`, `/wallet/advances` e `/finance/payments`.
 */
export interface PageMeta {
    page: number;
    totalPages: number;
    limit?: number;
    total?: number;
}

export interface PagedResponse<T> {
    data: T[];
    meta: PageMeta;
}

/** Próxima página, ou `undefined` na última. Sem `meta`, não há mais. */
export function nextPageParam(meta: PageMeta | undefined | null): number | undefined {
    if (!meta) return undefined;
    const page = Number(meta.page);
    const totalPages = Number(meta.totalPages);
    if (!Number.isFinite(page) || !Number.isFinite(totalPages)) return undefined;
    return page < totalPages ? page + 1 : undefined;
}

/**
 * Junta as páginas na ordem e descarta id repetido.
 *
 * O back ordena só por `createdAt`, sem desempate, e os lançamentos de um mesmo gesto
 * (liberar parcela + estorno, bloquear saque) saem da mesma transação com o mesmo
 * `createdAt`. Na fronteira de página a mesma linha pode vir duas vezes. Sem o descarte,
 * o extrato mostra o lançamento em dobro e o Ganhos soma em dobro.
 */
export function mergeById<T extends { id: string }>(pages: readonly { data: readonly T[] }[] | undefined): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const page of pages ?? []) {
        for (const item of page.data ?? []) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            out.push(item);
        }
    }
    return out;
}

/**
 * Busca todas as páginas até a última ou até `maxPages`. `truncated` avisa que parou no
 * teto: a tela diz "valores parciais" em vez de mostrar um total menor como se fosse o todo.
 */
export async function fetchAllPages<T extends { id: string }>(
    fetchPage: (page: number) => Promise<PagedResponse<T>>,
    maxPages: number,
): Promise<{ items: T[]; truncated: boolean }> {
    const pages: PagedResponse<T>[] = [];
    let page = 1;
    for (;;) {
        const response = await fetchPage(page);
        pages.push(response);
        const next = nextPageParam(response.meta);
        if (next === undefined) return { items: mergeById(pages), truncated: false };
        if (pages.length >= maxPages) return { items: mergeById(pages), truncated: true };
        page = next;
    }
}
```

```ts
// src/domain/hooks/useInfinitePagedList.ts
import { useCallback, useMemo } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import { mergeById, nextPageParam, PagedResponse } from './pagination';

export interface InfinitePagedList<T> {
    items: T[];
    isLoading: boolean;
    /** Também é `true` quando só a PRÓXIMA página falhou; ver `isFetchNextPageError`. */
    isError: boolean;
    isFetchNextPageError: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    loadMore: () => void;
    refetch: () => void;
    /** Pull-to-refresh, sem contar o spinner de "carregar mais". */
    isRefreshing: boolean;
}

/**
 * Lista paginada que ACUMULA: cada página nova entra no fim, e o pull-to-refresh refaz
 * todas as páginas já carregadas (comportamento do `useInfiniteQuery`).
 */
export function useInfinitePagedList<T extends { id: string }>(
    queryKey: readonly unknown[],
    fetchPage: (page: number) => Promise<PagedResponse<T>>,
    options: { enabled: boolean; staleTime?: number },
): InfinitePagedList<T> {
    const query = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam }) => fetchPage(pageParam),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => nextPageParam(lastPage?.meta),
        enabled: options.enabled,
        staleTime: options.staleTime ?? 60_000,
    });

    const { data, hasNextPage, isFetchingNextPage, fetchNextPage, refetch: refetchQuery } = query;

    const items = useMemo(() => mergeById(data?.pages), [data]);

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const refetch = useCallback(() => {
        void refetchQuery();
    }, [refetchQuery]);

    return {
        items,
        isLoading: query.isLoading,
        isError: query.isError,
        isFetchNextPageError: query.isFetchNextPageError,
        hasNextPage: !!hasNextPage,
        isFetchingNextPage,
        loadMore,
        refetch,
        isRefreshing: query.isRefetching && !isFetchingNextPage,
    };
}
```

```ts
// src/domain/agility/wallet/useCase/useInfiniteWalletLists.ts
import { useInfinitePagedList } from '@/domain/hooks/useInfinitePagedList';
import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import type { AdvanceResponse, ListTransactionsRequest, TransactionResponse, WithdrawalResponse } from '../dto';
import { walletAPI } from '../walletAPI';

export const TRANSACTIONS_PAGE_SIZE = 20;
const WITHDRAWALS_PAGE_SIZE = 20;
const ADVANCES_PAGE_SIZE = 20;

export type TransactionFilters = Omit<ListTransactionsRequest, 'page' | 'limit'>;

function useIsAuthenticated() {
    const { authCredentials } = useAuthCredentialsService();
    return !!authCredentials?.accessToken && !!authCredentials?.tenantId;
}

/** Extrato da carteira, acumulando páginas (`GET /wallet/transactions`). */
export function useInfiniteTransactions(filters: TransactionFilters = {}) {
    const enabled = useIsAuthenticated();
    return useInfinitePagedList<TransactionResponse>(
        [KEY_WALLET, 'transactions', 'infinite', filters],
        (page) => walletAPI.getTransactions({ ...filters, page, limit: TRANSACTIONS_PAGE_SIZE }),
        { enabled },
    );
}

/** Saques do motorista, mais novo primeiro (`GET /wallet/withdrawals`). */
export function useInfiniteWithdrawals() {
    const enabled = useIsAuthenticated();
    return useInfinitePagedList<WithdrawalResponse>(
        [KEY_WALLET, 'withdrawals', 'infinite'],
        (page) => walletAPI.getWithdrawals(page, WITHDRAWALS_PAGE_SIZE),
        { enabled },
    );
}

/** Adiantamentos e dívidas de cobrança, todos os status (`GET /wallet/advances`). */
export function useInfiniteAdvances() {
    const enabled = useIsAuthenticated();
    return useInfinitePagedList<AdvanceResponse>(
        [KEY_WALLET, 'advances', 'infinite'],
        (page) => walletAPI.getAdvances(page, ADVANCES_PAGE_SIZE),
        { enabled },
    );
}
```

Em `src/domain/agility/wallet/walletAPI.ts`:

1. Acrescente o import `import type { PagedResponse } from '@/domain/hooks/pagination';`.
2. Troque as duas assinaturas:

```ts
    async getWithdrawals(page: number = 1, limit: number = 20): Promise<PagedResponse<WithdrawalResponse>> {
        const response = await apiAgility.get(`${BASE_URL}/withdrawals`, {
            params: { page, limit },
        });
        return unwrap<PagedResponse<WithdrawalResponse>>(response.data);
    },

    // Advances
    async getAdvances(page: number = 1, limit: number = 20): Promise<PagedResponse<AdvanceResponse>> {
        const response = await apiAgility.get(`${BASE_URL}/advances`, {
            params: { page, limit },
        });
        return unwrap<PagedResponse<AdvanceResponse>>(response.data);
    },
```

Em `src/domain/agility/wallet/useCase/index.ts`, acrescente a linha:

```ts
export * from './useInfiniteWalletLists';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --watchAll=false domain/hooks/__tests__ wallet/useCase/__tests__/useInfiniteWalletLists`
Expected: PASS nos 3 arquivos (12 testes).

Run: `npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add src/domain/hooks/pagination.ts src/domain/hooks/useInfinitePagedList.ts src/domain/hooks/__tests__/pagination.test.ts src/domain/hooks/__tests__/useInfinitePagedList.test.tsx src/domain/agility/wallet/useCase/useInfiniteWalletLists.ts src/domain/agility/wallet/useCase/__tests__/useInfiniteWalletLists.test.tsx src/domain/agility/wallet/walletAPI.ts src/domain/agility/wallet/useCase/index.ts
git commit -m "feat(carteira): listas paginadas que acumulam e descartam id repetido

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Contrato da F2 e extrato pela direção

O extrato atual:
- decide o sinal por `isCredit` (Bug 4: crédito manual aparecia como "−");
- ignora o status (Bug 8);
- mostra erro como vazio (Bug 9);
- filtra só a página carregada (Bug 14).

Os 7 tipos da F2 caem no rótulo "Crédito". Com a F2, frete e saque geram duas linhas cada (bloqueio e movimento), e sem R1 o motorista lê o dinheiro em dobro.

**Files:**
- Modify: `src/domain/agility/wallet/dto/types.ts`
- Modify: `src/domain/agility/wallet/dto/response/wallet.response.ts`
- Create: `src/app/(auth)/(tabs)/menu/carteira/_utils/transactionDisplay.ts`
- Rewrite: `src/app/(auth)/(tabs)/menu/carteira/extrato.tsx`
- Delete: `src/domain/agility/wallet/useCase/useGetTransactions.ts` (e a linha dele em `useCase/index.ts`)
- Test: `src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/transactionDisplay.test.ts`
- Test (reescrever): `src/app/(auth)/(tabs)/menu/carteira/__tests__/extrato.test.tsx`

**Interfaces:**
- Consumes: `useInfiniteTransactions()` e `InfinitePagedList<T>` (Task 1).
- Produces:
  - `enum TransactionType` com os 15 valores do back, sem `UBERIZATION`
  - `type LedgerDirection = 'IN' | 'OUT'`
  - `const LedgerSourceType`, com os 12 valores de `back/src/wallet/entities/types.ts:49-74`
  - `TransactionResponse`, com `direction`, `affectsBalance`, `sourceType: string` e `sourceId: string`
  - `WalletResponse`, com `freightPendingBalance: number` e `withdrawalPendingBalance: number`
  - `WithdrawalResponse`, com `driverId`, `driverName`, `proofUrls`, `lastError` e `lastErrorAt`
  - `describeTransaction(tx): TransactionDisplay`
  - `categoryOf(tx): TransactionCategory`
  - `filterTransactions<T>(list: T[], filter: ExtratoFilter): T[]`
  - `EXTRATO_FILTERS: { value: ExtratoFilter; label: string }[]`

- [ ] **Step 1: Atualizar o contrato (sem teste próprio; o `tsc` e os testes do Step 2 cobrem)**

Em `src/domain/agility/wallet/dto/types.ts`, troque o `enum TransactionType` inteiro por:

```ts
/**
 * Tipo do lançamento. No back é TEXTO desde a F2 (`back/src/wallet/entities/types.ts`).
 * O SINAL nunca vem do tipo: vem de `TransactionResponse.direction`.
 */
export enum TransactionType {
    // Gravados desde a F2 (livro-razão).
    FREIGHT = 'FREIGHT',
    FREIGHT_RELEASE = 'FREIGHT_RELEASE',
    WITHDRAWAL_HOLD = 'WITHDRAWAL_HOLD',
    WITHDRAWAL_HOLD_RELEASE = 'WITHDRAWAL_HOLD_RELEASE',
    WITHDRAWAL = 'WITHDRAWAL',
    MANUAL_CREDIT = 'MANUAL_CREDIT',
    MANUAL_DEBIT = 'MANUAL_DEBIT',

    // Legados: continuam legíveis no extrato, nenhum caminho novo grava.
    CREDIT = 'CREDIT',
    DEBIT = 'DEBIT',
    REFUND = 'REFUND',
    ADJUSTMENT = 'ADJUSTMENT',
    ADVANCE = 'ADVANCE',
    ADVANCE_RETURN = 'ADVANCE_RETURN',
    COMMISSION = 'COMMISSION',
    BONUS = 'BONUS',
}

/** Sentido do dinheiro. `amount` é sempre positivo. */
export type LedgerDirection = 'IN' | 'OUT';

/** Origem do lançamento (`back/src/wallet/entities/types.ts:49-74`). */
export const LedgerSourceType = {
    FREIGHT_SHARE: 'FREIGHT_SHARE',
    FREIGHT_SHARE_COMPLEMENT: 'FREIGHT_SHARE_COMPLEMENT',
    FREIGHT_SHARE_RELEASE: 'FREIGHT_SHARE_RELEASE',
    FREIGHT_SHARE_REVERSAL: 'FREIGHT_SHARE_REVERSAL',
    WITHDRAWAL_HOLD: 'WITHDRAWAL_HOLD',
    WITHDRAWAL_HOLD_RELEASE: 'WITHDRAWAL_HOLD_RELEASE',
    WITHDRAWAL: 'WITHDRAWAL',
    MANUAL: 'MANUAL',
    LEGACY_RECEIVABLE_RELEASE: 'LEGACY_RECEIVABLE_RELEASE',
    LEGACY_ROUTING: 'LEGACY_ROUTING',
    LEGACY_PAYMENT: 'LEGACY_PAYMENT',
    LEGACY: 'LEGACY',
} as const;
export type LedgerSourceType = (typeof LedgerSourceType)[keyof typeof LedgerSourceType];
```

Em `src/domain/agility/wallet/dto/response/wallet.response.ts`:

1. Troque o import da primeira linha por:

```ts
import { AdvanceStatus, LedgerDirection, PixKeyType, TransactionStatus, TransactionType, WithdrawalMethod, WithdrawalStatus } from '../types';
```

2. Troque `WalletResponse`, `TransactionResponse` e `WithdrawalResponse` por:

```ts
export interface WalletResponse {
    id: string;
    driverId: string;
    /** Total, em centavos: disponível + frete a liberar + saque pendente. */
    balance: number;
    /** Frete bloqueado, esperando o operador liberar (F2). */
    freightPendingBalance: number;
    /** Valor de saques pedidos e ainda não pagos (F2). */
    withdrawalPendingBalance: number;
    /** = freightPendingBalance + withdrawalPendingBalance. */
    blockedBalance: number;
    /** = balance − blockedBalance. Teto do saque. */
    availableBalance: number;
    /** pixKey || (bankName && bankAgency && bankAccount), calculado no back. */
    hasBankInfo: boolean;
    bankName?: string | null;
    bankAgency?: string | null;
    bankAccount?: string | null;
    pixKey?: string | null;
    pixKeyType?: PixKeyType | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TransactionResponse {
    id: string;
    walletId: string;
    /** Tipo desconhecido (o back é texto) cai em "Movimentação" no extrato. */
    type: TransactionType;
    /** Sinal do lançamento. Única fonte de "+"/"−". */
    direction: LedgerDirection;
    /** `false` = move entre baldes (frete liberado, saque bloqueado/devolvido); o total não muda. */
    affectsBalance: boolean;
    status: TransactionStatus;
    /** Centavos, sempre > 0. */
    amount: number;
    balanceAfter: number;
    description: string;
    /** Origem (`LedgerSourceType`). O back devolve texto. */
    sourceType: string;
    /** Na linha de frete, o id da parcela. Nunca exibir. */
    sourceId: string;
    /** Derivados de `direction` no back. Não use para sinal. */
    isCredit: boolean;
    isDebit: boolean;
    routingId?: string | null;
    serviceId?: string | null;
    paymentId?: string | null;
    withdrawalId?: string | null;
    /**
     * Comprovante do gesto do escritorio, ja com URL ASSINADA pelo backend (a
     * chave crua do storage nao abre). Na transacao de saque, o backend resolve
     * a partir do saque ligado por `withdrawalId`. Vazio = sem comprovante.
     */
    proofUrls?: string[];
    advanceId?: string | null;
    createdAt: string;
    updatedAt?: string;
}

export interface WithdrawalResponse {
    id: string;
    walletId: string;
    driverId?: string | null;
    driverName?: string | null;
    amount: number;
    fee: number;
    netAmount: number;
    method: WithdrawalMethod;
    /** CANCELLED = recusado pelo operador (com `rejectionReason`). */
    status: WithdrawalStatus;
    bankName?: string | null;
    bankAgency?: string | null;
    bankAccount?: string | null;
    pixKey?: string | null;
    pixKeyType?: PixKeyType | null;
    processedAt?: string;
    processedBy?: string | null;
    transactionId?: string | null;
    externalRef?: string | null;
    notes?: string | null;
    rejectionReason?: string | null;
    /** Falha técnica do pagamento; o saque volta a PENDING (UC12). Texto do operador, não exibir cru. */
    lastError?: string | null;
    lastErrorAt?: string;
    /** URLs já assinadas. */
    proofUrls?: string[];
    createdAt: string;
    updatedAt?: string;
}
```

Apague `src/domain/agility/wallet/useCase/useGetTransactions.ts` e a linha `export * from './useGetTransactions';` de `src/domain/agility/wallet/useCase/index.ts`.

- [ ] **Step 2: Write the failing tests**

```ts
// src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/transactionDisplay.test.ts
import { formatCurrency } from '@/utils/formatCurrency';

import { categoryOf, describeTransaction, filterTransactions } from '../transactionDisplay';

type Tx = Parameters<typeof describeTransaction>[0];

function tx(over: Partial<Tx> = {}): Tx {
    return {
        type: 'WITHDRAWAL',
        direction: 'OUT',
        affectsBalance: true,
        status: 'COMPLETED',
        amount: 5000,
        sourceType: 'WITHDRAWAL',
        ...over,
    } as Tx;
}

describe('describeTransaction — sinal pela direção', () => {
    it('IN que mexe no saldo sai com "+" em verde', () => {
        const d = describeTransaction(tx({ type: 'FREIGHT' as Tx['type'], direction: 'IN', sourceType: 'FREIGHT_SHARE' }));
        expect(d.amountText).toBe(`+${formatCurrency(5000)}`);
        expect(d.amountColor).toBe('colorTextSuccess');
    });

    it('OUT que mexe no saldo sai com "-" em vermelho', () => {
        const d = describeTransaction(tx());
        expect(d.amountText).toBe(`-${formatCurrency(5000)}`);
        expect(d.amountColor).toBe('colorTextError');
    });

    it('crédito manual do operador sai com "+" (Bug 4: era "-" pelo tipo)', () => {
        const d = describeTransaction(tx({ type: 'MANUAL_CREDIT' as Tx['type'], direction: 'IN', sourceType: 'MANUAL' }));
        expect(d.amountText).toBe(`+${formatCurrency(5000)}`);
        expect(d.label).toBe('Crédito da empresa');
    });

    it('ADJUSTMENT legado segue a direção gravada pela migration', () => {
        expect(describeTransaction(tx({ type: 'ADJUSTMENT' as Tx['type'], direction: 'IN', sourceType: 'LEGACY' })).amountText).toBe(
            `+${formatCurrency(5000)}`,
        );
        expect(describeTransaction(tx({ type: 'ADJUSTMENT' as Tx['type'], direction: 'OUT', sourceType: 'LEGACY' })).amountText).toBe(
            `-${formatCurrency(5000)}`,
        );
    });
});

describe('describeTransaction — movimento entre baldes (affectsBalance false)', () => {
    it('frete liberado não tem sinal e diz de onde para onde foi', () => {
        const d = describeTransaction(
            tx({ type: 'FREIGHT_RELEASE' as Tx['type'], direction: 'IN', affectsBalance: false, sourceType: 'FREIGHT_SHARE_RELEASE' }),
        );
        expect(d.amountText).toBe(formatCurrency(5000));
        expect(d.amountColor).toBe('colorTextSecondary');
        expect(d.movement).toBe('Frete a liberar → Disponível');
    });

    it('bloqueio do saque não tem sinal: só o WITHDRAWAL pago tira do total', () => {
        const bloqueio = describeTransaction(
            tx({ type: 'WITHDRAWAL_HOLD' as Tx['type'], direction: 'OUT', affectsBalance: false, sourceType: 'WITHDRAWAL_HOLD' }),
        );
        const pago = describeTransaction(tx());
        expect(bloqueio.amountText).toBe(formatCurrency(5000));
        expect(bloqueio.movement).toBe('Disponível → Saque pendente');
        expect(pago.amountText).toBe(`-${formatCurrency(5000)}`);
    });

    it('saque devolvido (recusa) também é só movimento', () => {
        const d = describeTransaction(
            tx({ type: 'WITHDRAWAL_HOLD_RELEASE' as Tx['type'], direction: 'IN', affectsBalance: false, sourceType: 'WITHDRAWAL_HOLD_RELEASE' }),
        );
        expect(d.amountText).toBe(formatCurrency(5000));
        expect(d.movement).toBe('Saque pendente → Disponível');
    });
});

describe('describeTransaction — status', () => {
    it('PENDING ganha selo e cor de aviso', () => {
        const d = describeTransaction(tx({ type: 'CREDIT' as Tx['type'], direction: 'IN', status: 'PENDING' as Tx['status'], sourceType: 'LEGACY' }));
        expect(d.badge?.label).toBe('Pendente');
        expect(d.amountColor).toBe('colorTextWarning');
    });

    it('CANCELLED e FAILED ficam cinza com selo', () => {
        expect(describeTransaction(tx({ status: 'CANCELLED' as Tx['status'] })).badge?.label).toBe('Cancelado');
        expect(describeTransaction(tx({ status: 'CANCELLED' as Tx['status'] })).amountColor).toBe('colorTextSecondary');
        expect(describeTransaction(tx({ status: 'FAILED' as Tx['status'] })).badge?.label).toBe('Falhou');
    });

    it('COMPLETED não tem selo', () => {
        expect(describeTransaction(tx()).badge).toBeNull();
    });
});

describe('describeTransaction — rótulo', () => {
    it('estorno de frete (MANUAL_DEBIT de origem FREIGHT_SHARE_REVERSAL) é frete, não débito da empresa', () => {
        const d = describeTransaction(tx({ type: 'MANUAL_DEBIT' as Tx['type'], sourceType: 'FREIGHT_SHARE_REVERSAL' }));
        expect(d.label).toBe('Estorno de frete');
        expect(d.category).toBe('freight');
    });

    it('tipo desconhecido não quebra: vira "Movimentação"', () => {
        expect(describeTransaction(tx({ type: 'XYZ' as Tx['type'] })).label).toBe('Movimentação');
    });
});

describe('filterTransactions', () => {
    const lista = [
        { id: '1', ...tx({ type: 'FREIGHT' as Tx['type'], direction: 'IN', sourceType: 'FREIGHT_SHARE' }) },
        { id: '2', ...tx({ type: 'FREIGHT_RELEASE' as Tx['type'], direction: 'IN', affectsBalance: false, sourceType: 'FREIGHT_SHARE_RELEASE' }) },
        { id: '3', ...tx({ type: 'MANUAL_DEBIT' as Tx['type'], sourceType: 'FREIGHT_SHARE_REVERSAL' }) },
        { id: '4', ...tx() },
        { id: '5', ...tx({ type: 'MANUAL_CREDIT' as Tx['type'], direction: 'IN', sourceType: 'MANUAL' }) },
    ];

    it('"Fretes" junta frete, liberação e estorno de frete', () => {
        expect(filterTransactions(lista, 'freight').map((t) => t.id)).toEqual(['1', '2', '3']);
    });

    it('"Todos" devolve a lista inteira', () => {
        expect(filterTransactions(lista, 'all')).toHaveLength(5);
    });

    it('categoria de saque e de ajuste', () => {
        expect(categoryOf(tx())).toBe('withdrawals');
        expect(categoryOf(tx({ type: 'MANUAL_CREDIT' as Tx['type'], direction: 'IN', sourceType: 'MANUAL' }))).toBe('adjustments');
    });
});
```

Substitua **todo** o conteúdo de `src/app/(auth)/(tabs)/menu/carteira/__tests__/extrato.test.tsx`. Os 7 testes de comprovante continuam e ganham 6 testes de extrato:

```tsx
/**
 * Extrato da carteira.
 *
 * Contratos guardados:
 * 1. comprovante: o link so aparece quando ha comprovante e abre a URL; CHAVE crua do
 *    storage nao vira link (decisao do dono, 21/09/2026);
 * 2. sinal pela direcao (F2), selo de status, movimento entre baldes sem sinal;
 * 3. erro nao e vazio; filtro sem resultado entre as carregadas oferece carregar mais.
 */
import React from 'react';
import { Linking } from 'react-native';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

// --- Mocks de leaf ----------------------------------------------------------
// O barrel de @/components arrasta WebView, AsyncStorage e o SDK de geolocation
// (modulos nativos) so pelo import.
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-background-geolocation', () => ({
    __esModule: true,
    default: { ready: jest.fn(), onLocation: jest.fn(), removeListeners: jest.fn() },
}));
// Os icones locais sao .svg, transformados pelo metro e NAO pelo jest.
jest.mock('@/components/Icon/LocalIcon', () => ({ LocalIcon: () => null }));
// `@expo/vector-icons` carrega a fonte de forma assincrona (aviso de act()).
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
// `ButtonBack` usa o objeto `router` (nao o hook), entao os dois precisam existir.
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    router: { push: jest.fn(), back: jest.fn() },
}));

const mockShowToast = jest.fn();
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: mockShowToast }) }));

const mockUseInfiniteTransactions = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useInfiniteTransactions: (...args: unknown[]) => mockUseInfiniteTransactions(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExtratoScreen = require('../extrato').default;

const URL_ASSINADA = 'https://s3.exemplo.com/comprovante.pdf?X-Amz-Signature=abc';
const mockLoadMore = jest.fn();

function transacao(over: Record<string, unknown> = {}) {
    return {
        id: 'tx-1',
        walletId: 'w-1',
        type: 'WITHDRAWAL',
        direction: 'OUT',
        affectsBalance: true,
        status: 'COMPLETED',
        amount: 5000,
        balanceAfter: 1000,
        description: 'Saque pago',
        sourceType: 'WITHDRAWAL',
        sourceId: 'wd-1',
        isCredit: false,
        isDebit: true,
        withdrawalId: 'wd-1',
        createdAt: '2026-09-21T12:00:00.000Z',
        ...over,
    };
}

function renderExtrato(transactions: Record<string, unknown>[], estado: Record<string, unknown> = {}) {
    mockUseInfiniteTransactions.mockReturnValue({
        items: transactions,
        isLoading: false,
        isError: false,
        isFetchNextPageError: false,
        hasNextPage: false,
        isFetchingNextPage: false,
        loadMore: mockLoadMore,
        refetch: jest.fn(),
        isRefreshing: false,
        ...estado,
    });

    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ExtratoScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

const links = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findAllByProps({ accessibilityLabel: 'Abrir comprovante' });
const porTestId = (tree: TestRenderer.ReactTestRenderer, testID: string) => tree.root.findAllByProps({ testID });
const texto = (tree: TestRenderer.ReactTestRenderer, testID: string) => porTestId(tree, testID)[0]?.props.children;

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});

describe('Extrato — comprovante do saque', () => {
    it('sem comprovante, nao mostra link', () => {
        const tree = renderExtrato([transacao()]);
        expect(links(tree)).toHaveLength(0);
    });

    it('lista vazia de comprovantes tambem nao mostra link', () => {
        const tree = renderExtrato([transacao({ proofUrls: [] })]);
        expect(links(tree)).toHaveLength(0);
    });

    it('com comprovante, mostra o link', () => {
        const tree = renderExtrato([transacao({ proofUrls: [URL_ASSINADA] })]);
        expect(links(tree).length).toBeGreaterThan(0);
        expect(porTestId(tree, 'comprovante-tx-1-0').length).toBeGreaterThan(0);
    });

    it('tocar no link abre a URL assinada', () => {
        const tree = renderExtrato([transacao({ proofUrls: [URL_ASSINADA] })]);
        act(() => {
            links(tree)[0].props.onPress();
        });
        expect(Linking.openURL).toHaveBeenCalledWith(URL_ASSINADA);
    });

    it('CHAVE crua do storage NAO vira link', () => {
        const tree = renderExtrato([transacao({ proofUrls: ['services/empresa-1/finance/a.pdf'] })]);
        expect(links(tree)).toHaveLength(0);
    });

    it('mais de um comprovante vira mais de um link', () => {
        const tree = renderExtrato([
            transacao({ proofUrls: [URL_ASSINADA, 'https://s3.exemplo.com/b.png?X-Amz-Signature=def'] }),
        ]);
        expect(porTestId(tree, 'comprovante-tx-1-0').length).toBeGreaterThan(0);
        expect(porTestId(tree, 'comprovante-tx-1-1').length).toBeGreaterThan(0);
    });

    it('falha ao abrir avisa o motorista em vez de nao fazer nada', async () => {
        (Linking.openURL as jest.Mock).mockRejectedValue(new Error('sem app'));
        const tree = renderExtrato([transacao({ proofUrls: [URL_ASSINADA] })]);
        await act(async () => {
            links(tree)[0].props.onPress();
        });
        expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
});

describe('Extrato — sinal, status e estados', () => {
    it('credito manual aparece com "+" (sinal pela direcao, nao por isCredit/tipo)', () => {
        const tree = renderExtrato([
            transacao({ id: 'tx-2', type: 'MANUAL_CREDIT', direction: 'IN', isCredit: false, sourceType: 'MANUAL' }),
        ]);
        expect(texto(tree, 'valor-tx-2')).toBe(`+${formatCurrency(5000)}`);
    });

    it('frete liberado aparece sem sinal e com o movimento entre baldes', () => {
        const tree = renderExtrato([
            transacao({ id: 'tx-3', type: 'FREIGHT_RELEASE', direction: 'IN', affectsBalance: false, sourceType: 'FREIGHT_SHARE_RELEASE' }),
        ]);
        expect(texto(tree, 'valor-tx-3')).toBe(formatCurrency(5000));
        expect(texto(tree, 'movimento-tx-3')).toBe('Frete a liberar → Disponível');
    });

    it('lancamento pendente ganha selo', () => {
        const tree = renderExtrato([transacao({ id: 'tx-4', status: 'PENDING' })]);
        expect(texto(tree, 'status-tx-4')).toBe('Pendente');
    });

    it('erro sem nada carregado mostra erro, nao "nenhuma movimentacao"', () => {
        const tree = renderExtrato([], { isError: true });
        expect(porTestId(tree, 'extrato-erro').length).toBeGreaterThan(0);
        expect(porTestId(tree, 'extrato-vazio')).toHaveLength(0);
    });

    it('falha so na proxima pagina mantem a lista e oferece tentar de novo', () => {
        const tree = renderExtrato([transacao()], { isError: true, isFetchNextPageError: true, hasNextPage: true });
        expect(porTestId(tree, 'valor-tx-1').length).toBeGreaterThan(0);
        act(() => {
            porTestId(tree, 'extrato-erro-mais')[0].props.onPress();
        });
        expect(mockLoadMore).toHaveBeenCalled();
    });

    it('filtro sem resultado entre as carregadas oferece carregar mais, em vez de dizer que nao existe', () => {
        const tree = renderExtrato([transacao()], { hasNextPage: true });
        act(() => {
            porTestId(tree, 'filtro-freight')[0].props.onPress();
        });
        expect(texto(tree, 'extrato-vazio')).toBe('Nenhuma movimentação de fretes entre as carregadas.');
        act(() => {
            porTestId(tree, 'extrato-carregar-mais')[0].props.onPress();
        });
        expect(mockLoadMore).toHaveBeenCalled();
    });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest --watchAll=false menu/carteira/_utils/__tests__/transactionDisplay menu/carteira/__tests__/extrato`
Expected:
- `transactionDisplay.test.ts` falha com "Cannot find module '../transactionDisplay'".
- `extrato.test.tsx` falha nos 6 testes novos: `valor-tx-2` indefinido, `extrato-erro` ausente e `filtro-freight` ausente. A tela antiga chama `useGetTransactions`, que o mock não fornece, então a renderização pode quebrar já no primeiro teste. Isso também conta como falha esperada.

- [ ] **Step 4: Write the implementation**

```ts
// src/app/(auth)/(tabs)/menu/carteira/_utils/transactionDisplay.ts
import type { Ionicons } from '@expo/vector-icons';

import type { TransactionResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { LedgerSourceType, TransactionStatus, TransactionType } from '@/domain/agility/wallet/dto/types';
import type { StatusColorConfig } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

export type TransactionCategory = 'freight' | 'withdrawals' | 'adjustments' | 'advances' | 'other';
export type ExtratoFilter = 'all' | Exclude<TransactionCategory, 'other'>;
export type AmountColor = 'colorTextSuccess' | 'colorTextError' | 'colorTextSecondary' | 'colorTextWarning';

type IconName = keyof typeof Ionicons.glyphMap;

interface TypeConfig {
    label: string;
    icon: IconName;
    iconColor: string;
    bgColor: string;
    category: TransactionCategory;
    /** De onde para onde o dinheiro foi, para quem não muda o total. */
    movement?: string;
}

const TYPE_CONFIG: Record<TransactionType, TypeConfig> = {
    [TransactionType.FREIGHT]: {
        label: 'Frete', icon: 'car', iconColor: '#9C27B0', bgColor: '#F3E5F5', category: 'freight',
        movement: 'Fica em "Frete a liberar" até a empresa liberar',
    },
    [TransactionType.FREIGHT_RELEASE]: {
        label: 'Frete liberado', icon: 'lock-open', iconColor: '#4CAF50', bgColor: '#E8F5E9', category: 'freight',
        movement: 'Frete a liberar → Disponível',
    },
    [TransactionType.WITHDRAWAL_HOLD]: {
        label: 'Saque solicitado', icon: 'time', iconColor: '#FF9800', bgColor: '#FFF3E0', category: 'withdrawals',
        movement: 'Disponível → Saque pendente',
    },
    [TransactionType.WITHDRAWAL_HOLD_RELEASE]: {
        label: 'Saque devolvido', icon: 'arrow-undo', iconColor: '#2196F3', bgColor: '#E3F2FD', category: 'withdrawals',
        movement: 'Saque pendente → Disponível',
    },
    [TransactionType.WITHDRAWAL]: { label: 'Saque pago', icon: 'cash-outline', iconColor: '#F44336', bgColor: '#FFEBEE', category: 'withdrawals' },
    [TransactionType.MANUAL_CREDIT]: { label: 'Crédito da empresa', icon: 'add-circle', iconColor: '#4CAF50', bgColor: '#E8F5E9', category: 'adjustments' },
    [TransactionType.MANUAL_DEBIT]: { label: 'Débito da empresa', icon: 'remove-circle', iconColor: '#F44336', bgColor: '#FFEBEE', category: 'adjustments' },
    // Legados (antes da F2).
    [TransactionType.CREDIT]: { label: 'Crédito', icon: 'add-circle', iconColor: '#4CAF50', bgColor: '#E8F5E9', category: 'freight' },
    [TransactionType.DEBIT]: { label: 'Débito', icon: 'remove-circle', iconColor: '#F44336', bgColor: '#FFEBEE', category: 'withdrawals' },
    [TransactionType.REFUND]: { label: 'Estorno', icon: 'refresh', iconColor: '#2196F3', bgColor: '#E3F2FD', category: 'adjustments' },
    [TransactionType.ADJUSTMENT]: { label: 'Ajuste', icon: 'create', iconColor: '#607D8B', bgColor: '#ECEFF1', category: 'adjustments' },
    [TransactionType.ADVANCE]: { label: 'Adiantamento', icon: 'arrow-forward', iconColor: '#FF9800', bgColor: '#FFF3E0', category: 'advances' },
    [TransactionType.ADVANCE_RETURN]: { label: 'Devolução de adiantamento', icon: 'arrow-back', iconColor: '#FF5722', bgColor: '#FBE9E7', category: 'advances' },
    [TransactionType.COMMISSION]: { label: 'Comissão', icon: 'pricetag', iconColor: '#F44336', bgColor: '#FFEBEE', category: 'adjustments' },
    [TransactionType.BONUS]: { label: 'Bônus', icon: 'gift', iconColor: '#E91E63', bgColor: '#FCE4EC', category: 'adjustments' },
};

/** MANUAL_DEBIT de origem FREIGHT_SHARE_REVERSAL: a empresa liberou menos que o bloqueado, ou cancelou. */
const FREIGHT_REVERSAL: TypeConfig = { label: 'Estorno de frete', icon: 'return-down-back', iconColor: '#F44336', bgColor: '#FFEBEE', category: 'freight' };
const UNKNOWN: TypeConfig = { label: 'Movimentação', icon: 'swap-horizontal', iconColor: '#607D8B', bgColor: '#ECEFF1', category: 'other' };

const STATUS_BADGE: Partial<Record<TransactionStatus, StatusColorConfig>> = {
    [TransactionStatus.PENDING]: { label: 'Pendente', textColor: 'yellow100', bgColor: 'yellow20' },
    [TransactionStatus.CANCELLED]: { label: 'Cancelado', textColor: 'gray400', bgColor: 'gray50' },
    [TransactionStatus.FAILED]: { label: 'Falhou', textColor: 'colorTextError', bgColor: 'gray50' },
};

export const EXTRATO_FILTERS: { value: ExtratoFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'freight', label: 'Fretes' },
    { value: 'withdrawals', label: 'Saques' },
    { value: 'adjustments', label: 'Ajustes' },
    { value: 'advances', label: 'Adiantamentos' },
];

type TxShape = Pick<TransactionResponse, 'type' | 'direction' | 'affectsBalance' | 'status' | 'amount' | 'sourceType'>;

export interface TransactionDisplay {
    label: string;
    icon: IconName;
    iconColor: string;
    bgColor: string;
    category: TransactionCategory;
    /** "+R$ 50,00", "-R$ 50,00" ou "R$ 50,00" (movimento entre baldes). */
    amountText: string;
    amountColor: AmountColor;
    movement: string | null;
    badge: StatusColorConfig | null;
}

function configOf(tx: Pick<TransactionResponse, 'type' | 'sourceType'>): TypeConfig {
    if (tx.sourceType === LedgerSourceType.FREIGHT_SHARE_REVERSAL) return FREIGHT_REVERSAL;
    return TYPE_CONFIG[tx.type] ?? UNKNOWN;
}

/**
 * Como uma linha do livro-razão aparece no extrato.
 *
 * - Sinal: SEMPRE `direction` (F2). `isCredit` e o tipo não entram.
 * - `affectsBalance: false` (frete liberado, saque bloqueado/devolvido): sem sinal, em cinza,
 *   com o movimento. O total não muda nessas linhas; com sinal, frete e saque apareceriam
 *   duas vezes.
 * - Status: PENDING em aviso; CANCELLED/FAILED em cinza, porque não moveram dinheiro.
 */
export function describeTransaction(tx: TxShape): TransactionDisplay {
    const config = configOf(tx);
    const neutral = tx.affectsBalance === false;
    const sign = neutral ? '' : tx.direction === 'IN' ? '+' : '-';

    let amountColor: AmountColor;
    if (neutral || tx.status === TransactionStatus.CANCELLED || tx.status === TransactionStatus.FAILED) {
        amountColor = 'colorTextSecondary';
    } else if (tx.status === TransactionStatus.PENDING) {
        amountColor = 'colorTextWarning';
    } else {
        amountColor = tx.direction === 'IN' ? 'colorTextSuccess' : 'colorTextError';
    }

    return {
        label: config.label,
        icon: config.icon,
        iconColor: config.iconColor,
        bgColor: config.bgColor,
        category: config.category,
        amountText: `${sign}${formatCurrency(tx.amount)}`,
        amountColor,
        movement: config.movement ?? null,
        badge: STATUS_BADGE[tx.status] ?? null,
    };
}

export function categoryOf(tx: Pick<TransactionResponse, 'type' | 'sourceType'>): TransactionCategory {
    return configOf(tx).category;
}

/** Filtro no cliente, sobre as páginas acumuladas: o back só aceita UM `type` exato (R2). */
export function filterTransactions<T extends Pick<TransactionResponse, 'type' | 'sourceType'>>(list: T[], filter: ExtratoFilter): T[] {
    if (filter === 'all') return list;
    return list.filter((tx) => categoryOf(tx) === filter);
}
```

Substitua **todo** o conteúdo de `src/app/(auth)/(tabs)/menu/carteira/extrato.tsx` por:

```tsx
// src/app/(auth)/(tabs)/menu/carteira/extrato.tsx

import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, RefreshControl, ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ActivityIndicator, Box, ButtonBack, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { isRemoteUrl } from '@/domain/agility/chat/utils/messageUtils';
import { useInfiniteTransactions } from '@/domain/agility/wallet';
import type { TransactionResponse } from '@/domain/agility/wallet/dto';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { formatDate } from '@/utils/formatDate';

import { describeTransaction, EXTRATO_FILTERS, ExtratoFilter, filterTransactions } from './_utils/transactionDisplay';

function TransactionItem({ item }: { item: TransactionResponse }) {
    const display = describeTransaction(item);
    const { showToast } = useToastService();

    // So URL http(s) abre. O backend assina a URL na listagem; se vier a CHAVE
    // crua (storage fora, falha ao assinar), o link nao aparece — melhor nao ter
    // botao do que ter um botao que da erro na cara do motorista.
    const comprovantes = (item.proofUrls ?? []).filter(isRemoteUrl);

    const abrirComprovante = useCallback(
        (url: string) => {
            Linking.openURL(url).catch(() => {
                showToast({ message: 'Nao foi possivel abrir o comprovante', type: 'error' });
            });
        },
        [showToast],
    );

    return (
        <Box py="y12" borderRadius="s12" mb="b8">
            <Box flexDirection="row" alignItems="center">
                <Box
                    width={measure.x40}
                    height={measure.y40}
                    borderRadius="s20"
                    alignItems="center"
                    justifyContent="center"
                    style={{ backgroundColor: display.bgColor }}
                >
                    <Ionicons name={display.icon} size={measure.m20} color={display.iconColor} />
                </Box>

                <Box flex={1} ml="l12">
                    <Text fontSize={measure.m14} fontWeightPreset="semibold" numberOfLines={1}>
                        {item.description}
                    </Text>
                    <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                        {`${display.label} • ${formatDate(item.createdAt)}`}
                    </Text>
                    {display.movement && (
                        <Text testID={`movimento-${item.id}`} fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                            {display.movement}
                        </Text>
                    )}
                </Box>

                <Box alignItems="flex-end">
                    <Text testID={`valor-${item.id}`} fontSize={measure.m16} fontWeightPreset="bold" color={display.amountColor}>
                        {display.amountText}
                    </Text>
                    {display.badge && (
                        <Box mt="t4" px="x8" py="y4" borderRadius="s4" bg={display.badge.bgColor}>
                            <Text testID={`status-${item.id}`} fontSize={measure.m12} fontWeightPreset="semibold" color={display.badge.textColor}>
                                {display.badge.label}
                            </Text>
                        </Box>
                    )}
                </Box>
            </Box>

            {comprovantes.length > 0 && (
                <Box flexDirection="row" flexWrap="wrap" gap="x8" mt="t8" ml="l12">
                    {comprovantes.map((url, indice) => (
                        <TouchableOpacityBox
                            key={url}
                            testID={`comprovante-${item.id}-${indice}`}
                            flexDirection="row"
                            alignItems="center"
                            px="m12"
                            py="y8"
                            borderRadius="s12"
                            backgroundColor="gray50"
                            accessibilityRole="link"
                            accessibilityLabel="Abrir comprovante"
                            onPress={() => abrirComprovante(url)}
                        >
                            <Ionicons name="receipt-outline" size={measure.m16} color="#666" />
                            <Text fontSize={measure.m12} color="colorTextSecondary" ml="l8">
                                {comprovantes.length === 1 ? 'Ver comprovante' : `Comprovante ${indice + 1}`}
                            </Text>
                        </TouchableOpacityBox>
                    ))}
                </Box>
            )}
        </Box>
    );
}

export default function ExtratoScreen() {
    const [filter, setFilter] = useState<ExtratoFilter>('all');
    const {
        items: transactions,
        isLoading,
        isError,
        isFetchNextPageError,
        hasNextPage,
        isFetchingNextPage,
        loadMore,
        refetch,
        isRefreshing,
    } = useInfiniteTransactions();

    const visible = useMemo(() => filterTransactions(transactions, filter), [transactions, filter]);
    const title = <Text preset="textTitleScreen">Extrato</Text>;

    if (isLoading) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    // Erro sem nada carregado NÃO é "nenhuma movimentação" (auditoria, Bug 9).
    if (isError && transactions.length === 0) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box testID="extrato-erro" flex={1} justifyContent="center" alignItems="center" px="x24">
                    <Ionicons name="cloud-offline-outline" size={48} color="#999" />
                    <Text mt="t12" color="colorTextSecondary" textAlign="center">
                        Não foi possível carregar o extrato.
                    </Text>
                    <TouchableOpacityBox mt="t16" onPress={refetch} accessibilityRole="button">
                        <Text color="colorTextPrimary">Tentar novamente</Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    const filterLabel = EXTRATO_FILTERS.find((f) => f.value === filter)?.label.toLowerCase();

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={title}>
            <Box py="y12" borderBottomWidth={1} borderBottomColor="borderColor">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Box flexDirection="row" gap="x8">
                        {EXTRATO_FILTERS.map((option) => (
                            <TouchableOpacityBox
                                key={option.value}
                                testID={`filtro-${option.value}`}
                                px="m12"
                                py="y8"
                                borderRadius="s20"
                                backgroundColor={filter === option.value ? 'primary100' : 'gray50'}
                                onPress={() => setFilter(option.value)}
                            >
                                <Text
                                    fontSize={measure.m13}
                                    fontWeightPreset={filter === option.value ? 'semibold' : 'regular'}
                                    color={filter === option.value ? 'white' : 'colorTextSecondary'}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacityBox>
                        ))}
                    </Box>
                </ScrollView>
            </Box>

            <FlatList
                data={visible}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <TransactionItem item={item} />}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} />}
                // Com a próxima página em erro, rolar não dispara de novo: o rodapé oferece o retry.
                onEndReached={isFetchNextPageError ? undefined : loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    <Box py="y32" alignItems="center" px="x16">
                        <Ionicons name="document-text-outline" size={48} color="#999" />
                        <Text testID="extrato-vazio" mt="t12" color="colorTextSecondary" textAlign="center">
                            {filter === 'all'
                                ? 'Nenhuma movimentação ainda.'
                                : `Nenhuma movimentação de ${filterLabel} entre as carregadas.`}
                        </Text>
                        {filter !== 'all' && hasNextPage && (
                            <TouchableOpacityBox
                                testID="extrato-carregar-mais"
                                mt="t16"
                                px="x16"
                                py="y8"
                                borderRadius="s8"
                                backgroundColor="primary100"
                                onPress={loadMore}
                            >
                                <Text fontSize={measure.m14} fontWeightPreset="semibold" color="white">
                                    Carregar mais antigas
                                </Text>
                            </TouchableOpacityBox>
                        )}
                    </Box>
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <Box py="y16" alignItems="center">
                            <ActivityIndicator />
                        </Box>
                    ) : isFetchNextPageError ? (
                        <TouchableOpacityBox testID="extrato-erro-mais" py="y16" alignItems="center" onPress={loadMore}>
                            <Text fontSize={measure.m13} color="colorTextError">
                                Falha ao carregar mais. Toque para tentar de novo.
                            </Text>
                        </TouchableOpacityBox>
                    ) : null
                }
            />
        </ScreenBase>
    );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest --watchAll=false menu/carteira/_utils/__tests__/transactionDisplay menu/carteira/__tests__/extrato`
Expected: PASS: `transactionDisplay` (15 testes) e `extrato` (13 testes).

Run: `npx tsc --noEmit`
Expected: sem saída. Se aparecer `Property 'UBERIZATION' does not exist`, sobrou um uso fora do extrato: o grep `UBERIZATION src` deve dar zero.

- [ ] **Step 6: Commit**

```bash
git add src/domain/agility/wallet/dto/types.ts src/domain/agility/wallet/dto/response/wallet.response.ts src/domain/agility/wallet/useCase/index.ts src/domain/agility/wallet/useCase/useGetTransactions.ts "src/app/(auth)/(tabs)/menu/carteira/_utils/transactionDisplay.ts" "src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/transactionDisplay.test.ts" "src/app/(auth)/(tabs)/menu/carteira/extrato.tsx" "src/app/(auth)/(tabs)/menu/carteira/__tests__/extrato.test.tsx"
git commit -m "feat(extrato): sinal pela direcao, selo de status e rolagem que acumula

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Carteira com os quatro saldos da F2

A carteira atual tem três problemas:
- mostra "Bloqueado" sem dizer o que é;
- tem um card de "recebíveis" que soma no cliente até 50 `CREDIT PENDING`, um mecanismo que a F2 aposentou (Bug 11);
- calcula um "Saldo disponível real" que compensa dívida com saldo, contra a regra-mãe 3 (R6).

Além disso, quando só `/advances/summary` falha, a carteira inteira some (Bug 9) e o `ButtonBack` sai duplicado na tela de erro.

**Files:**
- Rewrite: `src/app/(auth)/(tabs)/menu/carteira/index.tsx`
- Delete: `src/domain/agility/wallet/useCase/useGetPendingReceivables.ts`
- Delete: `src/domain/agility/wallet/useCase/useWalletBreakdown.ts`
- Modify: `src/domain/agility/wallet/useCase/index.ts` (tira as duas linhas)
- Test: `src/app/(auth)/(tabs)/menu/carteira/__tests__/carteira.test.tsx`

**Interfaces:**
- Consumes: `useGetWallet()` → `{ wallet?: WalletResponse; isLoading; isError; refetch; isRefetching }` e `useGetAdvancesSummary()` → `{ summary?: { totalPending; count; overdueCount }; isError; refetch }`, ambos já existentes. Consome também `WalletResponse.freightPendingBalance` e `withdrawalPendingBalance` (Task 2).
- Produces: as rotas `/menu/carteira/saques` (criada na Task 6) e `/menu/ganhos/cobrancas` (criada na Task 8) passam a ser linkadas daqui. Enquanto a task delas não entra, o `tsc` não reclama, porque o `.expo/types` não existe neste worktree.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/(auth)/(tabs)/menu/carteira/__tests__/carteira.test.tsx
/**
 * Carteira: os quatro saldos vêm do GET /wallet, sem soma no cliente (F2). A dívida
 * aparece em cartão próprio e NÃO é descontada do disponível (regra-mãe 3). Um erro
 * só nos adiantamentos não derruba a carteira (auditoria, Bug 9).
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-background-geolocation', () => ({
    __esModule: true,
    default: { ready: jest.fn(), onLocation: jest.fn(), removeListeners: jest.fn() },
}));
jest.mock('@/components/Icon/LocalIcon', () => ({ LocalIcon: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const mockUseGetWallet = jest.fn();
const mockUseGetAdvancesSummary = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useGetWallet: () => mockUseGetWallet(),
    useGetAdvancesSummary: () => mockUseGetAdvancesSummary(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CarteiraScreen = require('../index').default;

const CARTEIRA = {
    id: 'w-1',
    driverId: 'd-1',
    balance: 20000,
    freightPendingBalance: 5000,
    withdrawalPendingBalance: 3000,
    blockedBalance: 8000,
    availableBalance: 12000,
    hasBankInfo: false,
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
};

function render(adiantamentos: Record<string, unknown> = { summary: { totalPending: 0, count: 0, overdueCount: 0 }, isError: false }) {
    mockUseGetWallet.mockReturnValue({ wallet: CARTEIRA, isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false });
    mockUseGetAdvancesSummary.mockReturnValue({ refetch: jest.fn(), ...adiantamentos });
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <CarteiraScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

const texto = (tree: TestRenderer.ReactTestRenderer, testID: string) => tree.root.findAllByProps({ testID })[0]?.props.children;
const todosOsTextos = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findAll((n) => typeof n.props?.children === 'string').map((n) => n.props.children as string);

describe('Carteira', () => {
    it('mostra disponível, frete a liberar, saque pendente e total do GET /wallet', () => {
        const tree = render();
        expect(texto(tree, 'saldo-disponivel')).toBe(formatCurrency(12000));
        expect(texto(tree, 'frete-a-liberar')).toBe(formatCurrency(5000));
        expect(texto(tree, 'saque-pendente')).toBe(formatCurrency(3000));
        expect(texto(tree, 'saldo-total')).toBe(formatCurrency(20000));
    });

    it('o card antigo de recebíveis e o "saldo disponível real" não existem mais', () => {
        const tree = render({ summary: { totalPending: 3000, count: 1, overdueCount: 0 }, isError: false });
        const textos = todosOsTextos(tree);
        expect(textos).not.toContain('Recebíveis aguardando confirmação');
        expect(textos).not.toContain('Saldo disponível real');
    });

    it('dívida aparece à parte e não é descontada do disponível', () => {
        const tree = render({ summary: { totalPending: 3000, count: 1, overdueCount: 0 }, isError: false });
        expect(texto(tree, 'adiantamentos-a-devolver')).toBe(formatCurrency(3000));
        expect(texto(tree, 'saldo-disponivel')).toBe(formatCurrency(12000));
    });

    it('erro só nos adiantamentos mantém a carteira e avisa o erro, sem dizer que não deve nada', () => {
        const tree = render({ summary: undefined, isError: true });
        expect(texto(tree, 'saldo-disponivel')).toBe(formatCurrency(12000));
        expect(tree.root.findAllByProps({ testID: 'adiantamentos-erro' }).length).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --watchAll=false menu/carteira/__tests__/carteira`
Expected: FAIL. A tela atual chama `useWalletBreakdown`/`useGetPendingReceivables`, que o mock não fornece, e dá "useWalletBreakdown is not a function".

- [ ] **Step 3: Write the implementation**

Substitua **todo** o conteúdo de `src/app/(auth)/(tabs)/menu/carteira/index.tsx` por:

```tsx
// src/app/(auth)/(tabs)/menu/carteira/index.tsx

import React, { useCallback } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { useGetAdvancesSummary, useGetWallet } from '@/domain/agility/wallet';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function QuickAction({ icon, color, label, onPress }: { icon: IconName; color: string; label: string; onPress: () => void }) {
    return (
        <TouchableOpacityBox
            flex={1}
            p="m16"
            borderRadius="s12"
            alignItems="center"
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            <Ionicons name={icon} size={measure.m24} color={color} />
            <Text mt="t8" fontSize={measure.m14} fontWeightPreset="semibold" textAlign="center">
                {label}
            </Text>
        </TouchableOpacityBox>
    );
}

function Bucket({ label, value, testID, warning }: { label: string; value: number; testID: string; warning?: boolean }) {
    return (
        <Box flex={1}>
            <Text fontSize={measure.m12} color="colorTextSecondary">
                {label}
            </Text>
            <Text testID={testID} fontSize={measure.m16} fontWeightPreset="bold" mt="t4" color={warning ? 'colorTextWarning' : 'colorTextPrimary'}>
                {formatCurrency(value)}
            </Text>
        </Box>
    );
}

export default function CarteiraScreen() {
    const router = useRouter();
    const { wallet, isLoading, isError, refetch, isRefetching } = useGetWallet();
    const { summary: advances, isError: isAdvancesError, refetch: refetchAdvances } = useGetAdvancesSummary();
    const title = <Text preset="textTitleScreen">Carteira</Text>;

    const refresh = useCallback(() => {
        void refetch();
        void refetchAdvances();
    }, [refetch, refetchAdvances]);

    if (isLoading) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    if (isError || !wallet) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box flex={1} justifyContent="center" alignItems="center" px="x24">
                    <Ionicons name="wallet-outline" size={64} color="#999" />
                    <Text mt="t16" textAlign="center" color="colorTextSecondary">
                        Não foi possível carregar sua carteira.
                    </Text>
                    <TouchableOpacityBox mt="t16" onPress={refresh}>
                        <Text color="colorTextPrimary">Tentar novamente</Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    const hasOverdue = (advances?.overdueCount ?? 0) > 0;

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={title}>
            <ScrollView refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}>
                <Box>
                    {/* Os quatro números vêm prontos do GET /wallet (F2); nenhum é somado aqui. */}
                    <Box p="m20" borderRadius="s16">
                        <Text fontSize={measure.m14} color="colorTextSecondary">
                            Disponível para saque
                        </Text>
                        <Text testID="saldo-disponivel" fontSize={32} fontWeight="bold" mt="t8" color="colorTextPrimary">
                            {formatCurrency(wallet.availableBalance)}
                        </Text>

                        <Box flexDirection="row" mt="t16" gap="x24">
                            <Bucket label="Frete a liberar" value={wallet.freightPendingBalance ?? 0} testID="frete-a-liberar" warning />
                            <Bucket label="Saque pendente" value={wallet.withdrawalPendingBalance ?? 0} testID="saque-pendente" warning />
                        </Box>

                        <Box mt="t16">
                            <Bucket label="Total na carteira" value={wallet.balance} testID="saldo-total" />
                            <Text fontSize={measure.m11} color="colorTextSecondary" mt="t4">
                                Disponível + frete a liberar + saque pendente.
                            </Text>
                        </Box>
                    </Box>

                    {/* Dívida: acerto separado (regra-mãe 3). Não sai do disponível. */}
                    {isAdvancesError && !advances ? (
                        <TouchableOpacityBox
                            testID="adiantamentos-erro"
                            mt="t16"
                            p="m16"
                            borderRadius="s12"
                            backgroundColor="gray50"
                            onPress={() => void refetchAdvances()}
                        >
                            <Text fontSize={measure.m13} color="colorTextError">
                                Não foi possível carregar o que você deve devolver. Toque para tentar de novo.
                            </Text>
                        </TouchableOpacityBox>
                    ) : advances && advances.totalPending > 0 ? (
                        <TouchableOpacityBox
                            mt="t16"
                            p="m16"
                            borderRadius="s12"
                            backgroundColor="gray50"
                            onPress={() => router.push('/menu/carteira/adiantamentos')}
                        >
                            <Box flexDirection="row" alignItems="center" justifyContent="space-between">
                                <Box flexDirection="row" alignItems="center">
                                    <Ionicons name={hasOverdue ? 'warning' : 'arrow-forward'} size={16} color={hasOverdue ? '#F44336' : '#FF9800'} />
                                    <Text ml="l8" fontSize={measure.m13} color="colorTextSecondary">
                                        A devolver à empresa
                                    </Text>
                                </Box>
                                <Text
                                    testID="adiantamentos-a-devolver"
                                    fontSize={measure.m14}
                                    fontWeightPreset="semibold"
                                    color={hasOverdue ? 'colorTextError' : 'colorTextWarning'}
                                >
                                    {formatCurrency(advances.totalPending)}
                                </Text>
                            </Box>
                            <Text fontSize={measure.m11} color="colorTextSecondary" mt="t4">
                                Adiantamentos e dinheiro recebido de clientes. A devolução é registrada pela empresa e não sai do seu saldo.
                            </Text>
                            {hasOverdue && (
                                <Text mt="t8" fontSize={measure.m11} color="colorTextError">
                                    {`${advances.overdueCount} vencido(s). Regularize com a empresa.`}
                                </Text>
                            )}
                        </TouchableOpacityBox>
                    ) : null}

                    {/* Ações rápidas */}
                    <Box mt="t24">
                        <Text fontSize={measure.m16} fontWeightPreset="bold" mb="b12">
                            Ações rápidas
                        </Text>
                        <Box flexDirection="row" gap="x12" mb="b12">
                            <QuickAction icon="cash-outline" color="#4CAF50" label="Sacar" onPress={() => router.push('/menu/carteira/saque')} />
                            <QuickAction icon="list-outline" color="#2196F3" label="Extrato" onPress={() => router.push('/menu/carteira/extrato')} />
                        </Box>
                        <Box flexDirection="row" gap="x12" mb="b12">
                            <QuickAction icon="receipt-outline" color="#607D8B" label="Meus saques" onPress={() => router.push('/menu/carteira/saques')} />
                            <QuickAction
                                icon="arrow-forward-outline"
                                color="#FF9800"
                                label="Adiantamentos"
                                onPress={() => router.push('/menu/carteira/adiantamentos')}
                            />
                        </Box>
                        <Box flexDirection="row" gap="x12">
                            <QuickAction icon="trending-up-outline" color="#9C27B0" label="Ganhos" onPress={() => router.push('/menu/ganhos')} />
                            <QuickAction icon="wallet-outline" color="#795548" label="Cobranças" onPress={() => router.push('/menu/ganhos/cobrancas')} />
                        </Box>
                    </Box>

                    {/* Dados bancários */}
                    <Box mt="t24">
                        <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="b12">
                            <Text fontSize={measure.m16} fontWeightPreset="bold">
                                Dados bancários
                            </Text>
                            {wallet.hasBankInfo && (
                                <TouchableOpacityBox onPress={() => router.push('/menu/carteira/config/dados-bancarios')}>
                                    <Text fontSize={measure.m14} color="colorTextPrimary">
                                        Editar
                                    </Text>
                                </TouchableOpacityBox>
                            )}
                        </Box>

                        <Box p="m16" borderRadius="s12">
                            {wallet.hasBankInfo ? (
                                <>
                                    {!!wallet.pixKey && (
                                        <Box>
                                            <Text fontSize={measure.m12} color="colorTextSecondary">
                                                Chave PIX
                                            </Text>
                                            <Text fontSize={measure.m14} fontWeightPreset="semibold" mt="t4">
                                                {wallet.pixKey}
                                            </Text>
                                        </Box>
                                    )}
                                    {!!wallet.bankName && (
                                        <Box mt={wallet.pixKey ? 't12' : 't0'}>
                                            <Text fontSize={measure.m12} color="colorTextSecondary">
                                                Banco
                                            </Text>
                                            <Text fontSize={measure.m14} fontWeightPreset="semibold" mt="t4">
                                                {wallet.bankName}
                                            </Text>
                                            {!!wallet.bankAgency && !!wallet.bankAccount && (
                                                <Text fontSize={measure.m14} color="colorTextSecondary" mt="t4">
                                                    {`Ag: ${wallet.bankAgency} | Conta: ${wallet.bankAccount}`}
                                                </Text>
                                            )}
                                        </Box>
                                    )}
                                </>
                            ) : (
                                <Box alignItems="center" py="y8">
                                    <Ionicons name="alert-circle-outline" size={measure.m24} color="#FF9800" />
                                    <Text mt="t8" color="colorTextSecondary" textAlign="center">
                                        Configure seus dados bancários para realizar saques
                                    </Text>
                                    <TouchableOpacityBox
                                        mt="t12"
                                        px="x16"
                                        py="y8"
                                        borderRadius="s8"
                                        onPress={() => router.push('/menu/carteira/config/dados-bancarios')}
                                    >
                                        <Text fontSize={measure.m14} fontWeightPreset="semibold">
                                            Configurar
                                        </Text>
                                    </TouchableOpacityBox>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            </ScrollView>
        </ScreenBase>
    );
}
```

Apague `src/domain/agility/wallet/useCase/useGetPendingReceivables.ts` e `src/domain/agility/wallet/useCase/useWalletBreakdown.ts`. Depois tire de `src/domain/agility/wallet/useCase/index.ts` as linhas `export * from './useWalletBreakdown';` e `export * from './useGetPendingReceivables';`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --watchAll=false menu/carteira/__tests__/carteira`
Expected: PASS (4 testes).

Run: `npx tsc --noEmit`
Expected: sem saída. Se reclamar de `useWalletBreakdown`/`useGetPendingReceivables`, algum import sobrou: o grep desses nomes em `src` deve dar zero.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/menu/carteira/index.tsx" "src/app/(auth)/(tabs)/menu/carteira/__tests__/carteira.test.tsx" src/domain/agility/wallet/useCase/useGetPendingReceivables.ts src/domain/agility/wallet/useCase/useWalletBreakdown.ts src/domain/agility/wallet/useCase/index.ts
git commit -m "feat(carteira): disponivel, frete a liberar, saque pendente e total da F2; divida a parte

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Trava de envio e saque sem falso sucesso

`useRequestWithdrawal` devolve `mutate`, que retorna `void` e nunca rejeita. Por isso `saque.tsx:63-64` mostra o toast verde mesmo quando o back recusa, e o `isSubmittingRef` destrava no mesmo tick (auditoria, Bug 2, CONFIRMADO Alto). A lição da F4 vale aqui: `mutateAsync`, a mensagem do back, a trava durante o envio, e nada de segundo POST ao fechar e reabrir o modal.

**Files:**
- Create: `src/hooks/useSubmitLock.ts`
- Modify: `src/domain/agility/wallet/useCase/useRequestWithdrawal.ts`
- Rewrite: `src/app/(auth)/(tabs)/menu/carteira/saque.tsx`
- Test: `src/hooks/__tests__/useSubmitLock.test.tsx`
- Test: `src/domain/agility/wallet/useCase/__tests__/walletMutations.test.tsx`
- Test: `src/app/(auth)/(tabs)/menu/carteira/__tests__/saque.test.tsx`

**Interfaces:**
- Produces:
  - `useSubmitLock(): { run: <T>(fn: () => Promise<T>) => Promise<T | undefined>; isSubmitting: boolean; isLocked: () => boolean }`: com um envio em voo, `run` devolve `undefined` sem chamar `fn`. A trava abre no `finally`, e o erro de `fn` é relançado.
  - `useRequestWithdrawal(): { requestWithdrawal: (data: CreateWithdrawalRequest) => Promise<WithdrawalResponse>; isPending: boolean }`: a promise **rejeita** no erro do back.
  - A rota `/menu/carteira/saques`, criada na Task 6, é o destino do `router.replace` depois do saque aceito (R10).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/hooks/__tests__/useSubmitLock.test.tsx
import React from 'react';

import TestRenderer, { act } from 'react-test-renderer';

import { useSubmitLock } from '../useSubmitLock';

let trava!: ReturnType<typeof useSubmitLock>;
function Probe() {
    trava = useSubmitLock();
    return null;
}

beforeEach(() => {
    act(() => {
        TestRenderer.create(<Probe />);
    });
});

describe('useSubmitLock', () => {
    it('segundo envio com o primeiro em voo não chama a função', async () => {
        let terminar!: () => void;
        const fn = jest.fn(() => new Promise<void>((resolve) => (terminar = resolve)));

        let primeiro!: Promise<unknown>;
        let segundo!: Promise<unknown>;
        act(() => {
            primeiro = trava.run(fn);
            segundo = trava.run(fn);
        });

        expect(fn).toHaveBeenCalledTimes(1);
        expect(trava.isLocked()).toBe(true);
        expect(trava.isSubmitting).toBe(true);
        await expect(segundo).resolves.toBeUndefined();

        await act(async () => {
            terminar();
            await primeiro;
        });
        expect(trava.isLocked()).toBe(false);
        expect(trava.isSubmitting).toBe(false);
    });

    it('erro relança e destrava', async () => {
        const erro = { success: false, error: { message: 'Saldo disponível insuficiente' } };

        await act(async () => {
            await expect(trava.run(() => Promise.reject(erro))).rejects.toBe(erro);
        });

        expect(trava.isLocked()).toBe(false);
        const fn = jest.fn(() => Promise.resolve('ok'));
        await act(async () => {
            await expect(trava.run(fn)).resolves.toBe('ok');
        });
        expect(fn).toHaveBeenCalledTimes(1);
    });
});
```

```tsx
// src/domain/agility/wallet/useCase/__tests__/walletMutations.test.tsx
/**
 * Os hooks de gesto de dinheiro devolvem `mutateAsync`: a promise REJEITA no erro do
 * back. Com `mutate` (antes), o `await` na tela resolvia na hora e o toast de sucesso
 * aparecia com o saque recusado (auditoria, Bug 2).
 */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_WALLET } from '@/domain/queryKeys';

import { useRequestWithdrawal } from '../useRequestWithdrawal';

const mockRequestWithdrawal = jest.fn();
jest.mock('../../walletAPI', () => ({
    walletAPI: {
        requestWithdrawal: (...args: unknown[]) => mockRequestWithdrawal(...args),
    },
}));

let saque!: ReturnType<typeof useRequestWithdrawal>;
function Probe() {
    saque = useRequestWithdrawal();
    return null;
}

let queryClient: QueryClient;
let tree: TestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
    mockRequestWithdrawal.mockReset();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
    queryClient.setQueryData([KEY_WALLET, 'balance'], { availableBalance: 10000 });
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
});

afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = null;
    queryClient.clear();
});

describe('useRequestWithdrawal', () => {
    it('rejeita quando o back recusa (nada de sucesso silencioso)', async () => {
        const erro = { success: false, error: { message: 'Saldo disponível insuficiente' } };
        mockRequestWithdrawal.mockRejectedValue(erro);

        await act(async () => {
            await expect(saque.requestWithdrawal({ amount: 5000 })).rejects.toBe(erro);
        });
    });

    it('resolve com o saque e invalida a carteira', async () => {
        mockRequestWithdrawal.mockResolvedValue({ id: 'wd-1', amount: 5000 });

        await act(async () => {
            await expect(saque.requestWithdrawal({ amount: 5000 })).resolves.toEqual({ id: 'wd-1', amount: 5000 });
        });

        expect(mockRequestWithdrawal).toHaveBeenCalledWith({ amount: 5000 });
        expect(queryClient.getQueryState([KEY_WALLET, 'balance'])?.isInvalidated).toBe(true);
    });
});
```

```tsx
// src/app/(auth)/(tabs)/menu/carteira/__tests__/saque.test.tsx
/**
 * Saque: a frase do back no erro, nenhum sucesso falso e um POST só, mesmo com
 * duplo toque no "Confirmar" ou fechando/reabrindo o modal com o pedido em voo.
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';

jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-background-geolocation', () => ({
    __esModule: true,
    default: { ready: jest.fn(), onLocation: jest.fn(), removeListeners: jest.fn() },
}));
jest.mock('@/components/Icon/LocalIcon', () => ({ LocalIcon: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
// O teste só lê as props do campo; o Input real arrasta máscara e teclado.
jest.mock('@/components/Input/Input', () => ({ Input: () => null }));

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));

const mockShowToast = jest.fn();
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: mockShowToast }) }));

// O modal real depende de ModalComponent; aqui ele só guarda as props para o teste tocar.
let mockModalProps: { isVisible: boolean; onPress?: () => Promise<void> | void; onClose: () => void } | null = null;
jest.mock('@/components/Modal/Modal', () => ({
    __esModule: true,
    default: (props: { isVisible: boolean; onPress?: () => Promise<void> | void; onClose: () => void }) => {
        mockModalProps = props;
        return null;
    },
}));

const mockRequestWithdrawal = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useGetWallet: () => ({ wallet: { availableBalance: 10000, hasBankInfo: true, balance: 10000 }, isLoading: false }),
    useRequestWithdrawal: () => ({ requestWithdrawal: mockRequestWithdrawal, isPending: false }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SaqueScreen = require('../saque').default;

function render() {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <SaqueScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

const botao = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAllByProps({ title: 'Solicitar Saque' })[0];

function digitarEPedir(tree: TestRenderer.ReactTestRenderer, cents: number) {
    act(() => {
        tree.root.findAll((n) => typeof n.props.onChangeCents === 'function')[0].props.onChangeCents(cents);
    });
    act(() => {
        botao(tree).props.onPress();
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    mockModalProps = null;
});

describe('Saque', () => {
    it('back recusa: toast com a frase do back, sem sucesso, sem sair da tela e com o botão destravado', async () => {
        mockRequestWithdrawal.mockRejectedValue({ success: false, error: { message: 'Saldo disponível insuficiente' } });
        const tree = render();
        digitarEPedir(tree, 5000);
        expect(mockModalProps?.isVisible).toBe(true);

        await act(async () => {
            await mockModalProps!.onPress!();
        });

        expect(mockShowToast).toHaveBeenCalledWith({ message: 'Saldo disponível insuficiente', type: 'error' });
        expect(mockShowToast).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
        expect(mockRouter.replace).not.toHaveBeenCalled();
        expect(botao(tree).props.disabled).toBe(false);
    });

    it('sucesso: pede o valor em centavos e vai para Meus saques', async () => {
        mockRequestWithdrawal.mockResolvedValue({ id: 'wd-1' });
        const tree = render();
        digitarEPedir(tree, 5000);

        await act(async () => {
            await mockModalProps!.onPress!();
        });

        expect(mockRequestWithdrawal).toHaveBeenCalledWith({ amount: 5000 });
        expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
        expect(mockRouter.replace).toHaveBeenCalledWith('/menu/carteira/saques');
    });

    it('dois toques no "Confirmar" fazem um POST só', async () => {
        let responder!: (v: unknown) => void;
        mockRequestWithdrawal.mockReturnValue(new Promise((resolve) => (responder = resolve)));
        const tree = render();
        digitarEPedir(tree, 5000);
        const confirmar = mockModalProps!.onPress!;

        await act(async () => {
            void confirmar();
            void confirmar();
        });
        expect(mockRequestWithdrawal).toHaveBeenCalledTimes(1);

        await act(async () => {
            responder({ id: 'wd-1' });
        });
    });

    it('reabrir o pedido com o primeiro em voo não abre o modal nem manda outro POST', async () => {
        let responder!: (v: unknown) => void;
        mockRequestWithdrawal.mockReturnValue(new Promise((resolve) => (responder = resolve)));
        const tree = render();
        digitarEPedir(tree, 5000);

        await act(async () => {
            void mockModalProps!.onPress!();
        });
        expect(botao(tree).props.disabled).toBe(true);

        act(() => {
            botao(tree).props.onPress();
        });
        expect(mockModalProps?.isVisible).toBe(false);
        expect(mockRequestWithdrawal).toHaveBeenCalledTimes(1);

        await act(async () => {
            responder({ id: 'wd-1' });
        });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --watchAll=false hooks/__tests__/useSubmitLock wallet/useCase/__tests__/walletMutations menu/carteira/__tests__/saque`
Expected:
- `useSubmitLock` falha com "Cannot find module '../useSubmitLock'".
- `walletMutations` falha em "rejeita quando o back recusa", porque `requestWithdrawal` é `mutate`, retorna `undefined` e não é promise: "expect(received).rejects ... received value must be a promise".
- `saque` falha em "back recusa": o toast de sucesso aparece.

- [ ] **Step 3: Write the implementation**

```ts
// src/hooks/useSubmitLock.ts
import { useCallback, useRef, useState } from 'react';

/**
 * Trava de envio para gesto de dinheiro. O ref trava no MESMO tick (o `isPending` da
 * mutation só vira true depois de a request sair). O estado existe para desabilitar o
 * botão e esconder o modal enquanto houver envio em voo.
 *
 * Com a trava fechada, `run` devolve `undefined` sem chamar `fn`. O erro de `fn` é
 * relançado, e a trava abre no `finally`, com sucesso ou erro.
 */
export function useSubmitLock() {
    const lockRef = useRef(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
        if (lockRef.current) return undefined;
        lockRef.current = true;
        setIsSubmitting(true);
        try {
            return await fn();
        } finally {
            lockRef.current = false;
            setIsSubmitting(false);
        }
    }, []);

    const isLocked = useCallback(() => lockRef.current, []);

    return { run, isSubmitting, isLocked };
}
```

Substitua **todo** o conteúdo de `src/domain/agility/wallet/useCase/useRequestWithdrawal.ts` por:

```ts
// src/domain/agility/wallet/useCase/useRequestWithdrawal.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';

import { CreateWithdrawalRequest } from '../dto';
import { walletAPI } from '../walletAPI';

/**
 * `requestWithdrawal` é `mutateAsync`: REJEITA no erro do back. Quem chama mostra a
 * mensagem com `mensagemDaApi` (antes era `mutate`, e o toast de sucesso aparecia com o
 * saque recusado).
 */
export function useRequestWithdrawal() {
    const queryClient = useQueryClient();

    const { mutateAsync, isPending } = useMutation({
        mutationFn: (data: CreateWithdrawalRequest) => walletAPI.requestWithdrawal(data),
        onSuccess: () => {
            // Saldo, extrato (WITHDRAWAL_HOLD) e Meus saques: tudo mora sob KEY_WALLET.
            void queryClient.invalidateQueries({ queryKey: [KEY_WALLET] });
        },
    });

    return { requestWithdrawal: mutateAsync, isPending };
}
```

Substitua **todo** o conteúdo de `src/app/(auth)/(tabs)/menu/carteira/saque.tsx` por:

```tsx
// src/app/(auth)/(tabs)/menu/carteira/saque.tsx

import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { mensagemDaApi } from '@/api/apiErrorMessage';
import { ActivityIndicator, Box, BRLInput, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import Modal from '@/components/Modal/Modal';
import { useGetWallet, useRequestWithdrawal } from '@/domain/agility/wallet';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

const MIN_WITHDRAWAL_CENTS = 100; // R$ 1,00, o mesmo @Min(100) do CreateWithdrawalDto

export default function SaqueScreen() {
    const router = useRouter();
    const { showToast } = useToastService();
    const [amountCents, setAmountCents] = useState<number | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const { wallet, isLoading: isLoadingWallet } = useGetWallet();
    const { requestWithdrawal } = useRequestWithdrawal();
    const { run, isSubmitting, isLocked } = useSubmitLock();

    const availableBalance = wallet?.availableBalance ?? 0;
    const value = amountCents ?? 0;

    function goToBankInfo() {
        router.push('/menu/carteira/config/dados-bancarios');
    }

    function handleRequestSaque() {
        // Com um pedido em voo, reabrir o modal permitiria um segundo POST.
        if (isLocked()) return;
        if (value < MIN_WITHDRAWAL_CENTS) {
            showToast({ message: 'O valor mínimo para saque é R$ 1,00', type: 'error' });
            return;
        }
        if (value > availableBalance) {
            showToast({ message: 'Saldo insuficiente para este saque', type: 'error' });
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
                // `replace`: voltar não reabre o formulário preenchido (R10).
                router.replace('/menu/carteira/saques');
            } catch (error) {
                // O valor digitado fica: o motorista corrige ou tenta de novo.
                showToast({ message: mensagemDaApi(error, 'Não foi possível solicitar o saque. Tente novamente.'), type: 'error' });
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

    const invalid = value < MIN_WITHDRAWAL_CENTS || value > availableBalance || !wallet?.hasBankInfo;
    const disabledReason = !wallet?.hasBankInfo
        ? 'Configure seus dados bancários para sacar'
        : value < MIN_WITHDRAWAL_CENTS
            ? `Valor mínimo: ${formatCurrency(MIN_WITHDRAWAL_CENTS)}`
            : value > availableBalance
                ? 'Valor maior que o saldo disponível'
                : null;

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

                    <Box mt="t24">
                        <Text fontSize={measure.m14} fontWeightPreset="semibold" mb="b8">
                            Valor do saque
                        </Text>
                        <BRLInput valueCents={amountCents} onChangeCents={setAmountCents} maxCents={availableBalance} placeholder="R$ 0,00" />

                        <TouchableOpacityBox
                            mt="t8"
                            onPress={() => setAmountCents(availableBalance)}
                            disabled={availableBalance < MIN_WITHDRAWAL_CENTS || isSubmitting}
                        >
                            <Text fontSize={measure.m12} color="colorTextPrimary">
                                {`Sacar tudo (${formatCurrency(availableBalance)})`}
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
                text={`Deseja solicitar o saque de ${formatCurrency(value)}?\n\nO valor sai do disponível e fica em "Saque pendente" até o pagamento.`}
                buttonActionTitle="Confirmar"
                buttonCloseTitle="Cancelar"
                onPress={handleConfirmSaque}
                onClose={() => setShowConfirmModal(false)}
            />
        </ScreenBase>
    );
}
```

A linha "Taxa R$ 0,00" saiu do resumo: o app nunca manda `fee`, e a taxa está fora do escopo da spec. O rótulo "Você recebe" continua igual ao valor.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --watchAll=false hooks/__tests__/useSubmitLock wallet/useCase/__tests__/walletMutations menu/carteira/__tests__/saque`
Expected: PASS: `useSubmitLock` (2), `walletMutations` (2) e `saque` (4).

Run: `npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSubmitLock.ts src/hooks/__tests__/useSubmitLock.test.tsx src/domain/agility/wallet/useCase/useRequestWithdrawal.ts src/domain/agility/wallet/useCase/__tests__/walletMutations.test.tsx "src/app/(auth)/(tabs)/menu/carteira/saque.tsx" "src/app/(auth)/(tabs)/menu/carteira/__tests__/saque.test.tsx"
git commit -m "fix(saque): mensagem do back no erro, sem sucesso falso e um envio so

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Dados bancários com as regras do DTO

Estado atual:
- a tela tem o mesmo falso sucesso do saque (Bug 3);
- exige PIX, embora a conta seja "opcional" e o back aceite só a conta (Bug 13.1);
- não consegue apagar campo, porque vazio vira `undefined` e o back ignora `undefined` (13.2);
- salva CPF e telefone com máscara (13.3);
- abre vazia quando o cache está frio (13.4).

As regras desta task estão em R7 e R8.

**Files:**
- Modify: `src/utils/validatePix.ts` (telefone aceita `+55`)
- Modify: `src/domain/agility/wallet/dto/request/wallet.request.ts` (`UpdateBankInfoRequest` aceita `null`)
- Create: `src/app/(auth)/(tabs)/menu/carteira/_utils/bankInfoForm.ts`
- Modify: `src/domain/agility/wallet/useCase/useUpdateBankInfo.ts`
- Rewrite: `src/app/(auth)/(tabs)/menu/carteira/config/dados-bancarios.tsx`
- Test: `src/utils/__tests__/validatePix.test.ts`
- Test: `src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/bankInfoForm.test.ts`
- Test (reescrever): `src/domain/agility/wallet/useCase/__tests__/walletMutations.test.tsx`
- Test: `src/app/(auth)/(tabs)/menu/carteira/__tests__/dados-bancarios.test.tsx`

**Interfaces:**
- Consumes: `useSubmitLock()` (Task 4) e `WalletResponse` com campos bancários `string | null` (Task 2).
- Produces:
  - `interface BankInfoForm { pixKeyType: PixKeyType | null; pixKey: string; bankName: string; bankAgency: string; bankAccount: string }`
  - `formFromWallet(wallet): BankInfoForm`
  - `normalizePixKey(type: PixKeyType, raw: string): string`
  - `validateBankForm(form): string | null`
  - `buildBankInfoPayload(form): UpdateBankInfoRequest`
  - `useUpdateBankInfo(): { updateBankInfo: (data: UpdateBankInfoRequest) => Promise<WalletResponse>; isPending: boolean }`, que **rejeita** no erro.

- [ ] **Step 1: Write the failing tests**

```ts
// src/utils/__tests__/validatePix.test.ts
import { PixKeyType } from '@/domain/agility/wallet/dto/types';

import { validatePixKey } from '../validatePix';

describe('validatePixKey', () => {
    it('CPF com ou sem máscara', () => {
        expect(validatePixKey('123.456.789-00', PixKeyType.CPF)).toBeNull();
        expect(validatePixKey('12345678900', PixKeyType.CPF)).toBeNull();
        expect(validatePixKey('1234567890', PixKeyType.CPF)).toBe('CPF deve ter 11 dígitos');
    });

    it('telefone digitado com máscara', () => {
        expect(validatePixKey('(11) 91234-5678', PixKeyType.PHONE)).toBeNull();
    });

    it('telefone já salvo no formato +55DDDNÚMERO (reabrir a tela não pode acusar erro)', () => {
        expect(validatePixKey('+5511912345678', PixKeyType.PHONE)).toBeNull();
        expect(validatePixKey('+551134567890', PixKeyType.PHONE)).toBeNull();
    });

    it('telefone sem DDD é recusado', () => {
        expect(validatePixKey('912345678', PixKeyType.PHONE)).toBe('Telefone deve ter DDD + número (10 ou 11 dígitos)');
    });

    it('e-mail e chave aleatória', () => {
        expect(validatePixKey('motorista@exemplo.com', PixKeyType.EMAIL)).toBeNull();
        expect(validatePixKey('nao-e-email', PixKeyType.EMAIL)).toBe('E-mail inválido');
        expect(validatePixKey('8400e8e7-1b9d-4f9b-b7d3-3a5b8d3c1a2b', PixKeyType.RANDOM)).toBeNull();
    });

    it('chave sem tipo', () => {
        expect(validatePixKey('12345678900', null)).toBe('Selecione o tipo da chave PIX');
    });
});
```

```ts
// src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/bankInfoForm.test.ts
import { PixKeyType } from '@/domain/agility/wallet/dto/types';

import { BankInfoForm, buildBankInfoPayload, formFromWallet, normalizePixKey, validateBankForm } from '../bankInfoForm';

function form(over: Partial<BankInfoForm> = {}): BankInfoForm {
    return { pixKeyType: null, pixKey: '', bankName: '', bankAgency: '', bankAccount: '', ...over };
}

describe('formFromWallet', () => {
    it('null do back vira campo vazio', () => {
        expect(formFromWallet({ pixKey: null, pixKeyType: null, bankName: null, bankAgency: null, bankAccount: null })).toEqual(form());
    });

    it('carrega o que o back tem', () => {
        expect(formFromWallet({ pixKey: 'a@b.com', pixKeyType: PixKeyType.EMAIL, bankName: 'Banco X', bankAgency: '1', bankAccount: '2' })).toEqual(
            form({ pixKey: 'a@b.com', pixKeyType: PixKeyType.EMAIL, bankName: 'Banco X', bankAgency: '1', bankAccount: '2' }),
        );
    });
});

describe('normalizePixKey', () => {
    it('CPF e CNPJ só com dígitos', () => {
        expect(normalizePixKey(PixKeyType.CPF, ' 123.456.789-00 ')).toBe('12345678900');
        expect(normalizePixKey(PixKeyType.CNPJ, '12.345.678/0001-90')).toBe('12345678000190');
    });

    it('telefone vira +55DDDNÚMERO, com ou sem o +55 digitado', () => {
        expect(normalizePixKey(PixKeyType.PHONE, '(11) 91234-5678')).toBe('+5511912345678');
        expect(normalizePixKey(PixKeyType.PHONE, '+55 11 91234-5678')).toBe('+5511912345678');
    });

    it('e-mail e aleatória em minúsculas, sem espaço', () => {
        expect(normalizePixKey(PixKeyType.EMAIL, ' Motorista@Exemplo.COM ')).toBe('motorista@exemplo.com');
        expect(normalizePixKey(PixKeyType.RANDOM, '8400E8E7-1B9D-4F9B-B7D3-3A5B8D3C1A2B')).toBe('8400e8e7-1b9d-4f9b-b7d3-3a5b8d3c1a2b');
    });
});

describe('validateBankForm', () => {
    it('só PIX vale', () => {
        expect(validateBankForm(form({ pixKeyType: PixKeyType.CPF, pixKey: '12345678900' }))).toBeNull();
    });

    it('só conta (sem PIX) vale — o back aceita (hasBankInfo)', () => {
        expect(validateBankForm(form({ bankName: 'Banco X', bankAgency: '1234', bankAccount: '56789-0' }))).toBeNull();
    });

    it('conta pela metade é recusada', () => {
        expect(validateBankForm(form({ bankName: 'Banco X', bankAgency: '1234' }))).toBe(
            'Preencha banco, agência e conta, ou deixe os três em branco.',
        );
    });

    it('nada preenchido é recusado', () => {
        expect(validateBankForm(form())).toBe('Informe uma chave PIX ou os dados da conta para receber os saques.');
    });

    it('chave PIX inválida devolve a mensagem da validação', () => {
        expect(validateBankForm(form({ pixKeyType: PixKeyType.CPF, pixKey: '123' }))).toBe('CPF deve ter 11 dígitos');
    });
});

describe('buildBankInfoPayload', () => {
    it('campo apagado vai como null (undefined o back ignora)', () => {
        expect(buildBankInfoPayload(form({ pixKeyType: PixKeyType.CPF, pixKey: '123.456.789-00' }))).toEqual({
            pixKeyType: PixKeyType.CPF,
            pixKey: '12345678900',
            bankName: null,
            bankAgency: null,
            bankAccount: null,
        });
    });

    it('chave vazia apaga chave E tipo', () => {
        expect(buildBankInfoPayload(form({ pixKeyType: PixKeyType.CPF, bankName: ' Banco X ', bankAgency: '1234', bankAccount: '56789-0' }))).toEqual({
            pixKeyType: null,
            pixKey: null,
            bankName: 'Banco X',
            bankAgency: '1234',
            bankAccount: '56789-0',
        });
    });

    it('manda sempre os cinco campos, e nenhum outro (forbidNonWhitelisted)', () => {
        expect(Object.keys(buildBankInfoPayload(form())).sort()).toEqual(['bankAccount', 'bankAgency', 'bankName', 'pixKey', 'pixKeyType']);
    });
});
```

Substitua **todo** o conteúdo de `src/domain/agility/wallet/useCase/__tests__/walletMutations.test.tsx`. Ele fica com os 2 testes da Task 4 e ganha 2 de dados bancários:

```tsx
// src/domain/agility/wallet/useCase/__tests__/walletMutations.test.tsx
/**
 * Os hooks de gesto de dinheiro devolvem `mutateAsync`: a promise REJEITA no erro do
 * back. Com `mutate` (antes), o `await` na tela resolvia na hora e o toast de sucesso
 * aparecia com o saque ou os dados bancários recusados (auditoria, Bugs 2 e 3).
 */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_WALLET } from '@/domain/queryKeys';

import { useRequestWithdrawal } from '../useRequestWithdrawal';
import { useUpdateBankInfo } from '../useUpdateBankInfo';

const mockRequestWithdrawal = jest.fn();
const mockUpdateBankInfo = jest.fn();
jest.mock('../../walletAPI', () => ({
    walletAPI: {
        requestWithdrawal: (...args: unknown[]) => mockRequestWithdrawal(...args),
        updateBankInfo: (...args: unknown[]) => mockUpdateBankInfo(...args),
    },
}));

let saque!: ReturnType<typeof useRequestWithdrawal>;
let dados!: ReturnType<typeof useUpdateBankInfo>;
function Probe() {
    saque = useRequestWithdrawal();
    dados = useUpdateBankInfo();
    return null;
}

let queryClient: QueryClient;
let tree: TestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
    mockRequestWithdrawal.mockReset();
    mockUpdateBankInfo.mockReset();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
    queryClient.setQueryData([KEY_WALLET, 'balance'], { availableBalance: 10000 });
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
});

afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = null;
    queryClient.clear();
});

describe('useRequestWithdrawal', () => {
    it('rejeita quando o back recusa (nada de sucesso silencioso)', async () => {
        const erro = { success: false, error: { message: 'Saldo disponível insuficiente' } };
        mockRequestWithdrawal.mockRejectedValue(erro);

        await act(async () => {
            await expect(saque.requestWithdrawal({ amount: 5000 })).rejects.toBe(erro);
        });
    });

    it('resolve com o saque e invalida a carteira', async () => {
        mockRequestWithdrawal.mockResolvedValue({ id: 'wd-1', amount: 5000 });

        await act(async () => {
            await expect(saque.requestWithdrawal({ amount: 5000 })).resolves.toEqual({ id: 'wd-1', amount: 5000 });
        });

        expect(mockRequestWithdrawal).toHaveBeenCalledWith({ amount: 5000 });
        expect(queryClient.getQueryState([KEY_WALLET, 'balance'])?.isInvalidated).toBe(true);
    });
});

describe('useUpdateBankInfo', () => {
    it('rejeita quando o back recusa', async () => {
        const erro = { success: false, error: { message: 'pixKeyType must be one of the following values' } };
        mockUpdateBankInfo.mockRejectedValue(erro);

        await act(async () => {
            await expect(dados.updateBankInfo({ pixKey: null, pixKeyType: null })).rejects.toBe(erro);
        });
    });

    it('resolve e invalida a carteira', async () => {
        mockUpdateBankInfo.mockResolvedValue({ id: 'w-1', hasBankInfo: true });

        await act(async () => {
            await dados.updateBankInfo({ bankName: 'Banco X', bankAgency: '1', bankAccount: '2', pixKey: null, pixKeyType: null });
        });

        expect(queryClient.getQueryState([KEY_WALLET, 'balance'])?.isInvalidated).toBe(true);
    });
});
```

```tsx
// src/app/(auth)/(tabs)/menu/carteira/__tests__/dados-bancarios.test.tsx
/**
 * Dados bancários: apagar um campo apaga no back (null), a chave é normalizada, o erro
 * mostra a frase do back sem sucesso falso e o salvar é um envio só.
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';

jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-background-geolocation', () => ({
    __esModule: true,
    default: { ready: jest.fn(), onLocation: jest.fn(), removeListeners: jest.fn() },
}));
jest.mock('@/components/Icon/LocalIcon', () => ({ LocalIcon: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
// O teste só lê as props dos campos; o Input real arrasta máscara e teclado.
jest.mock('@/components/Input/Input', () => ({ Input: () => null }));

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));

const mockShowToast = jest.fn();
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: mockShowToast }) }));

const mockUpdateBankInfo = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useGetWallet: () => ({
        wallet: {
            id: 'w-1',
            pixKey: '12345678900',
            pixKeyType: 'CPF',
            bankName: 'Banco X',
            bankAgency: '1234',
            bankAccount: '56789-0',
            hasBankInfo: true,
        },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
    }),
    useUpdateBankInfo: () => ({ updateBankInfo: mockUpdateBankInfo, isPending: false }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DadosBancariosScreen = require('../config/dados-bancarios').default;

function render() {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <DadosBancariosScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

function digitar(tree: TestRenderer.ReactTestRenderer, placeholder: string, valor: string) {
    act(() => {
        tree.root.findAllByProps({ placeholder })[0].props.onChangeText(valor);
    });
}

const salvar = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAllByProps({ title: 'Salvar dados' })[0];

beforeEach(() => jest.clearAllMocks());

describe('Dados bancários', () => {
    it('apagar banco, agência e conta manda null nos três', async () => {
        mockUpdateBankInfo.mockResolvedValue({});
        const tree = render();
        digitar(tree, 'Nome do banco', '');
        digitar(tree, '0000', '');
        digitar(tree, '00000-0', '');

        await act(async () => {
            await salvar(tree).props.onPress();
        });

        expect(mockUpdateBankInfo).toHaveBeenCalledWith({
            pixKeyType: 'CPF',
            pixKey: '12345678900',
            bankName: null,
            bankAgency: null,
            bankAccount: null,
        });
        expect(mockRouter.back).toHaveBeenCalled();
    });

    it('remover a chave PIX (com a conta completa) manda null na chave e no tipo', async () => {
        mockUpdateBankInfo.mockResolvedValue({});
        const tree = render();
        act(() => {
            tree.root.findAllByProps({ testID: 'remover-pix' })[0].props.onPress();
        });

        await act(async () => {
            await salvar(tree).props.onPress();
        });

        expect(mockUpdateBankInfo).toHaveBeenCalledWith({
            pixKeyType: null,
            pixKey: null,
            bankName: 'Banco X',
            bankAgency: '1234',
            bankAccount: '56789-0',
        });
    });

    it('CPF digitado com máscara é salvo só com dígitos', async () => {
        mockUpdateBankInfo.mockResolvedValue({});
        const tree = render();
        digitar(tree, '000.000.000-00', '987.654.321-00');

        await act(async () => {
            await salvar(tree).props.onPress();
        });

        expect(mockUpdateBankInfo).toHaveBeenCalledWith(expect.objectContaining({ pixKey: '98765432100', pixKeyType: 'CPF' }));
    });

    it('erro do back: toast com a frase do back, sem sucesso e sem sair da tela', async () => {
        mockUpdateBankInfo.mockRejectedValue({ success: false, error: { message: 'Carteira não encontrada' } });
        const tree = render();

        await act(async () => {
            await salvar(tree).props.onPress();
        });

        expect(mockShowToast).toHaveBeenCalledWith({ message: 'Carteira não encontrada', type: 'error' });
        expect(mockShowToast).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
        expect(mockRouter.back).not.toHaveBeenCalled();
    });

    it('dois toques em salvar fazem um envio só', async () => {
        let responder!: (v: unknown) => void;
        mockUpdateBankInfo.mockReturnValue(new Promise((resolve) => (responder = resolve)));
        const tree = render();
        const onPress = salvar(tree).props.onPress;

        await act(async () => {
            void onPress();
            void onPress();
        });
        expect(mockUpdateBankInfo).toHaveBeenCalledTimes(1);

        await act(async () => {
            responder({});
        });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --watchAll=false utils/__tests__/validatePix menu/carteira/_utils/__tests__/bankInfoForm wallet/useCase/__tests__/walletMutations menu/carteira/__tests__/dados-bancarios`
Expected:
- `validatePix` falha em "telefone já salvo no formato +55DDDNÚMERO": 13 dígitos dão "Telefone deve ter DDD...".
- `bankInfoForm` falha com "Cannot find module '../bankInfoForm'".
- `walletMutations` falha em `useUpdateBankInfo` "rejeita": `mutate` não devolve promise.
- `dados-bancarios` falha: `bankName` vai `undefined`, `remover-pix` não existe e o toast de sucesso aparece no erro.

- [ ] **Step 3: Write the implementation**

Em `src/utils/validatePix.ts`, troque o `case PixKeyType.PHONE` por:

```ts
        case PixKeyType.PHONE: {
            // Aceita com ou sem o +55: a chave salva vem normalizada como +55DDDNUMERO (R8),
            // e reabrir a tela não pode acusar erro nela.
            const digits = trimmed.replace(/\D/g, '');
            const local = trimmed.startsWith('+55') ? digits.slice(2) : digits;
            if (local.length < 10 || local.length > 11) {
                return 'Telefone deve ter DDD + número (10 ou 11 dígitos)';
            }
            return null;
        }
```

Em `src/domain/agility/wallet/dto/request/wallet.request.ts`, troque `UpdateBankInfoRequest` por:

```ts
/**
 * `PATCH /wallet/bank-info`. `undefined` = não mexe; `null` = APAGA (o `@IsOptional` do
 * DTO pula null e a entidade grava todo campo `!== undefined`). Campo a mais = 400.
 */
export interface UpdateBankInfoRequest {
    bankName?: string | null;
    bankAgency?: string | null;
    bankAccount?: string | null;
    pixKey?: string | null;
    pixKeyType?: PixKeyType | null;
}
```

```ts
// src/app/(auth)/(tabs)/menu/carteira/_utils/bankInfoForm.ts
import type { UpdateBankInfoRequest } from '@/domain/agility/wallet/dto/request/wallet.request';
import type { WalletResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { PixKeyType } from '@/domain/agility/wallet/dto/types';
import { validatePixKey } from '@/utils/validatePix';

export interface BankInfoForm {
    pixKeyType: PixKeyType | null;
    pixKey: string;
    bankName: string;
    bankAgency: string;
    bankAccount: string;
}

type BankFields = Pick<WalletResponse, 'pixKey' | 'pixKeyType' | 'bankName' | 'bankAgency' | 'bankAccount'>;

export function formFromWallet(wallet: BankFields): BankInfoForm {
    return {
        pixKeyType: wallet.pixKeyType ?? null,
        pixKey: wallet.pixKey ?? '',
        bankName: wallet.bankName ?? '',
        bankAgency: wallet.bankAgency ?? '',
        bankAccount: wallet.bankAccount ?? '',
    };
}

/**
 * Formato em que a chave é gravada (R8): CPF/CNPJ só dígitos, telefone +55DDDNÚMERO,
 * e-mail e aleatória em minúsculas. O operador copia a chave para o banco dele; a
 * máscara digitada pelo motorista atrapalhava.
 */
export function normalizePixKey(type: PixKeyType, raw: string): string {
    const trimmed = raw.trim();
    switch (type) {
        case PixKeyType.CPF:
        case PixKeyType.CNPJ:
            return trimmed.replace(/\D/g, '');
        case PixKeyType.PHONE: {
            const digits = trimmed.replace(/\D/g, '');
            const local = trimmed.startsWith('+55') ? digits.slice(2) : digits;
            return `+55${local}`;
        }
        case PixKeyType.EMAIL:
        case PixKeyType.RANDOM:
            return trimmed.toLowerCase();
        default:
            return trimmed;
    }
}

/**
 * Regras do R7, as mesmas do `hasBankInfo` do back: PIX, conta completa ou os dois; a
 * conta é o trio. Devolve a mensagem do primeiro problema, ou `null`.
 */
export function validateBankForm(form: BankInfoForm): string | null {
    const hasPix = form.pixKey.trim() !== '';
    if (hasPix) {
        const pixError = validatePixKey(form.pixKey, form.pixKeyType);
        if (pixError) return pixError;
    }

    const filled = [form.bankName, form.bankAgency, form.bankAccount].filter((v) => v.trim() !== '').length;
    if (filled > 0 && filled < 3) return 'Preencha banco, agência e conta, ou deixe os três em branco.';
    if (!hasPix && filled === 0) return 'Informe uma chave PIX ou os dados da conta para receber os saques.';
    return null;
}

/**
 * Sempre os cinco campos: preenchido vai normalizado, vazio vai `null` (apaga no back).
 * Chave vazia apaga chave E tipo, para não sobrar um tipo sem chave.
 */
export function buildBankInfoPayload(form: BankInfoForm): UpdateBankInfoRequest {
    const orNull = (value: string) => (value.trim() === '' ? null : value.trim());
    const hasPix = form.pixKey.trim() !== '' && form.pixKeyType !== null;
    return {
        pixKeyType: hasPix ? form.pixKeyType : null,
        pixKey: hasPix && form.pixKeyType ? normalizePixKey(form.pixKeyType, form.pixKey) : null,
        bankName: orNull(form.bankName),
        bankAgency: orNull(form.bankAgency),
        bankAccount: orNull(form.bankAccount),
    };
}
```

Substitua **todo** o conteúdo de `src/domain/agility/wallet/useCase/useUpdateBankInfo.ts` por:

```ts
// src/domain/agility/wallet/useCase/useUpdateBankInfo.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';

import { UpdateBankInfoRequest } from '../dto';
import { walletAPI } from '../walletAPI';

/** `updateBankInfo` é `mutateAsync`: REJEITA no erro do back (antes, `mutate` = falso sucesso). */
export function useUpdateBankInfo() {
    const queryClient = useQueryClient();

    const { mutateAsync, isPending } = useMutation({
        mutationFn: (data: UpdateBankInfoRequest) => walletAPI.updateBankInfo(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [KEY_WALLET] });
        },
    });

    return { updateBankInfo: mutateAsync, isPending };
}
```

Substitua **todo** o conteúdo de `src/app/(auth)/(tabs)/menu/carteira/config/dados-bancarios.tsx` por:

```tsx
// src/app/(auth)/(tabs)/menu/carteira/config/dados-bancarios.tsx

import React, { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { mensagemDaApi } from '@/api/apiErrorMessage';
import { ActivityIndicator, Box, Button, Input, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { useGetWallet, useUpdateBankInfo } from '@/domain/agility/wallet';
import type { WalletResponse } from '@/domain/agility/wallet/dto';
import { PixKeyType } from '@/domain/agility/wallet/dto/types';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { PIX_KEY_HINTS, validatePixKey } from '@/utils/validatePix';

import { BankInfoForm, buildBankInfoPayload, formFromWallet, validateBankForm } from '../_utils/bankInfoForm';

const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
    [PixKeyType.CPF]: 'CPF',
    [PixKeyType.CNPJ]: 'CNPJ',
    [PixKeyType.EMAIL]: 'E-mail',
    [PixKeyType.PHONE]: 'Telefone',
    [PixKeyType.RANDOM]: 'Chave aleatória',
};

const title = <Text preset="textTitleScreen">Dados bancários</Text>;

export default function DadosBancariosScreen() {
    const { wallet, isLoading, isError, refetch } = useGetWallet();

    if (isLoading) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    if (isError || !wallet) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box flex={1} justifyContent="center" alignItems="center" px="x24">
                    <Text textAlign="center" color="colorTextSecondary">
                        Não foi possível carregar seus dados bancários.
                    </Text>
                    <TouchableOpacityBox mt="t16" onPress={() => void refetch()}>
                        <Text color="colorTextPrimary">Tentar novamente</Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    // O formulário só monta com a carteira em mãos: nasce com o que o back tem, mesmo
    // com o cache frio (auditoria, Bug 13.4).
    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={title}>
            <BankInfoFormView wallet={wallet} />
        </ScreenBase>
    );
}

function BankInfoFormView({ wallet }: { wallet: WalletResponse }) {
    const router = useRouter();
    const { showToast } = useToastService();
    const { updateBankInfo } = useUpdateBankInfo();
    const { run, isSubmitting, isLocked } = useSubmitLock();
    const [form, setForm] = useState<BankInfoForm>(() => formFromWallet(wallet));
    const [touched, setTouched] = useState(false);

    function update(patch: Partial<BankInfoForm>) {
        setForm((current) => ({ ...current, ...patch }));
        setTouched(true);
    }

    const pixError = useMemo(
        () => (touched && form.pixKey.trim() !== '' ? validatePixKey(form.pixKey, form.pixKeyType) : null),
        [form.pixKey, form.pixKeyType, touched],
    );

    async function handleSave() {
        if (isLocked()) return;
        setTouched(true);
        const error = validateBankForm(form);
        if (error) {
            showToast({ message: error, type: 'error' });
            return;
        }
        await run(async () => {
            try {
                await updateBankInfo(buildBankInfoPayload(form));
                showToast({ message: 'Dados bancários salvos.', type: 'success' });
                router.back();
            } catch (e) {
                showToast({ message: mensagemDaApi(e, 'Não foi possível salvar os dados bancários.'), type: 'error' });
            }
        });
    }

    const placeholder = form.pixKeyType ? PIX_KEY_HINTS[form.pixKeyType] : 'Informe sua chave PIX';

    return (
        <ScrollView>
            <Box pt="t16">
                <Box mt="t8" p="m16" borderRadius="s12" flexDirection="row">
                    <Ionicons name="information-circle-outline" size={measure.m20} color="#2196F3" />
                    <Text ml="l8" fontSize={measure.m12} color="colorTextSecondary" flex={1}>
                        Cadastre uma chave PIX, uma conta bancária ou as duas. Com chave PIX, o saque sai por PIX; sem ela, por TED.
                    </Text>
                </Box>

                <Box mt="t24">
                    <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="b12">
                        <Text fontSize={measure.m16} fontWeightPreset="bold">
                            Chave PIX
                        </Text>
                        {form.pixKey.trim() !== '' && (
                            <TouchableOpacityBox testID="remover-pix" onPress={() => update({ pixKey: '', pixKeyType: null })}>
                                <Text fontSize={measure.m12} color="colorTextError">
                                    Remover chave PIX
                                </Text>
                            </TouchableOpacityBox>
                        )}
                    </Box>

                    <Text fontSize={measure.m14} color="colorTextSecondary" mb="b8">
                        Tipo de chave
                    </Text>
                    <Box flexDirection="row" flexWrap="wrap" gap="x8" mb="b12">
                        {Object.entries(PIX_KEY_TYPE_LABELS).map(([type, label]) => (
                            <TouchableOpacityBox
                                key={type}
                                px="x12"
                                py="y8"
                                borderRadius="s8"
                                borderWidth={1}
                                borderColor={form.pixKeyType === type ? 'primary100' : 'background'}
                                bg={form.pixKeyType === type ? 'primary10' : 'background'}
                                onPress={() => update({ pixKeyType: type as PixKeyType })}
                            >
                                <Text fontSize={measure.m12} fontWeightPreset="semibold" color={form.pixKeyType === type ? 'primary100' : 'colorTextPrimary'}>
                                    {label}
                                </Text>
                            </TouchableOpacityBox>
                        ))}
                    </Box>

                    <Input placeholder={placeholder} value={form.pixKey} onChangeText={(t) => update({ pixKey: t })} messageError={pixError ?? undefined} />
                    {!pixError && form.pixKeyType && (
                        <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                            {`Formato esperado: ${PIX_KEY_HINTS[form.pixKeyType]}`}
                        </Text>
                    )}
                </Box>

                <Box mt="t32">
                    <Text fontSize={measure.m16} fontWeightPreset="bold" mb="b12">
                        Conta bancária
                    </Text>
                    <Text fontSize={measure.m12} color="colorTextSecondary" mb="b12">
                        Preencha os três campos, ou deixe os três em branco.
                    </Text>

                    <Box mb="b12">
                        <Text fontSize={measure.m14} color="colorTextSecondary" mb="b4">
                            Banco
                        </Text>
                        <Input placeholder="Nome do banco" value={form.bankName} onChangeText={(t) => update({ bankName: t })} />
                    </Box>

                    <Box flexDirection="row" gap="x12">
                        <Box flex={1}>
                            <Text fontSize={measure.m14} color="colorTextSecondary" mb="b4">
                                Agência
                            </Text>
                            <Input
                                placeholder="0000"
                                value={form.bankAgency}
                                onChangeText={(t) => update({ bankAgency: t })}
                                keyboardType="numeric"
                                width={measure.x150}
                            />
                        </Box>
                        <Box flex={1}>
                            <Text fontSize={measure.m14} color="colorTextSecondary" mb="b4">
                                Conta
                            </Text>
                            <Input
                                placeholder="00000-0"
                                value={form.bankAccount}
                                onChangeText={(t) => update({ bankAccount: t })}
                                keyboardType="numeric"
                                width={measure.x160}
                            />
                        </Box>
                    </Box>
                </Box>

                <Box mt="t32" mb="b32">
                    <Button title="Salvar dados" onPress={handleSave} isLoading={isSubmitting} disabled={isSubmitting} />
                </Box>
            </Box>
        </ScrollView>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --watchAll=false utils/__tests__/validatePix menu/carteira/_utils/__tests__/bankInfoForm wallet/useCase/__tests__/walletMutations menu/carteira/__tests__/dados-bancarios`
Expected: PASS: `validatePix` (6), `bankInfoForm` (13), `walletMutations` (4) e `dados-bancarios` (5).

Run: `npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add src/utils/validatePix.ts src/utils/__tests__/validatePix.test.ts src/domain/agility/wallet/dto/request/wallet.request.ts "src/app/(auth)/(tabs)/menu/carteira/_utils/bankInfoForm.ts" "src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/bankInfoForm.test.ts" src/domain/agility/wallet/useCase/useUpdateBankInfo.ts src/domain/agility/wallet/useCase/__tests__/walletMutations.test.tsx "src/app/(auth)/(tabs)/menu/carteira/config/dados-bancarios.tsx" "src/app/(auth)/(tabs)/menu/carteira/__tests__/dados-bancarios.test.tsx"
git commit -m "fix(dados-bancarios): apagar campo apaga no back, chave normalizada, PIX ou conta, sem sucesso falso

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Meus saques

Hoje, o `walletAPI.getWithdrawals` não tem tela. O motorista vê o "Bloqueado" subir sem explicação e nunca fica sabendo do motivo da recusa (Bug 12). Esta task usa o endpoint do motorista que já existe, e as regras de exibição estão em R9.

**Files:**
- Create: `src/app/(auth)/(tabs)/menu/carteira/_utils/withdrawalDisplay.ts`
- Create: `src/app/(auth)/(tabs)/menu/carteira/saques.tsx`
- Test: `src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/withdrawalDisplay.test.ts`

**Interfaces:**
- Consumes: `useInfiniteWithdrawals()` (Task 1) e `WithdrawalResponse` com `rejectionReason`, `lastError` e `proofUrls` (Task 2).
- Produces:
  - a rota `/menu/carteira/saques` (usada pelas Tasks 3 e 4)
  - `describeWithdrawal(w): { status: StatusColorConfig; destination: string; note: string | null }`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/withdrawalDisplay.test.ts
import { describeWithdrawal } from '../withdrawalDisplay';

type W = Parameters<typeof describeWithdrawal>[0];

function saque(over: Partial<W> = {}): W {
    return {
        status: 'PENDING',
        method: 'PIX',
        pixKey: '12345678900',
        bankName: null,
        bankAgency: null,
        bankAccount: null,
        rejectionReason: null,
        lastError: null,
        ...over,
    } as W;
}

describe('describeWithdrawal', () => {
    it('rótulo de cada status (recusado é CANCELLED no back)', () => {
        expect(describeWithdrawal(saque()).status.label).toBe('Aguardando pagamento');
        expect(describeWithdrawal(saque({ status: 'PROCESSING' as W['status'] })).status.label).toBe('Em processamento');
        expect(describeWithdrawal(saque({ status: 'COMPLETED' as W['status'] })).status.label).toBe('Pago');
        expect(describeWithdrawal(saque({ status: 'CANCELLED' as W['status'] })).status.label).toBe('Recusado');
        expect(describeWithdrawal(saque({ status: 'FAILED' as W['status'] })).status.label).toBe('Falhou');
    });

    it('recusado mostra o motivo que o operador escreveu', () => {
        const d = describeWithdrawal(saque({ status: 'CANCELLED' as W['status'], rejectionReason: 'Chave PIX de outra pessoa' }));
        expect(d.note).toBe('Motivo da recusa: Chave PIX de outra pessoa');
    });

    it('recusado sem motivo ainda explica que o valor voltou', () => {
        expect(describeWithdrawal(saque({ status: 'CANCELLED' as W['status'] })).note).toBe('Recusado pela empresa. O valor voltou para o disponível.');
    });

    it('falha técnica que voltou para a fila NÃO mostra o texto técnico', () => {
        const d = describeWithdrawal(saque({ lastError: 'ECONNRESET at PixGateway.send' }));
        expect(d.note).toBe('O pagamento falhou uma vez e voltou para a fila da empresa.');
        expect(d.note).not.toContain('ECONNRESET');
    });

    it('pendente sem erro não tem nota', () => {
        expect(describeWithdrawal(saque()).note).toBeNull();
    });

    it('destino PIX e TED a partir do snapshot do saque', () => {
        expect(describeWithdrawal(saque()).destination).toBe('PIX: 12345678900');
        expect(
            describeWithdrawal(saque({ method: 'TED' as W['method'], pixKey: null, bankName: 'Banco X', bankAgency: '1234', bankAccount: '56789-0' }))
                .destination,
        ).toBe('TED: Banco X · Ag. 1234 · Conta 56789-0');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --watchAll=false menu/carteira/_utils/__tests__/withdrawalDisplay`
Expected: FAIL com "Cannot find module '../withdrawalDisplay'".

- [ ] **Step 3: Write the implementation**

```ts
// src/app/(auth)/(tabs)/menu/carteira/_utils/withdrawalDisplay.ts
import type { WithdrawalResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { WithdrawalMethod, WithdrawalStatus } from '@/domain/agility/wallet/dto/types';
import type { StatusColorConfig } from '@/theme';

const STATUS: Record<WithdrawalStatus, StatusColorConfig> = {
    [WithdrawalStatus.PENDING]: { label: 'Aguardando pagamento', textColor: 'yellow100', bgColor: 'yellow20' },
    [WithdrawalStatus.PROCESSING]: { label: 'Em processamento', textColor: 'blue500', bgColor: 'primary20' },
    [WithdrawalStatus.COMPLETED]: { label: 'Pago', textColor: 'tertiary100', bgColor: 'tertiary20' },
    // O back grava a recusa do operador como CANCELLED (withdrawal.service.ts:312).
    [WithdrawalStatus.CANCELLED]: { label: 'Recusado', textColor: 'colorTextError', bgColor: 'gray50' },
    [WithdrawalStatus.FAILED]: { label: 'Falhou', textColor: 'colorTextError', bgColor: 'gray50' },
};

type W = Pick<WithdrawalResponse, 'status' | 'method' | 'pixKey' | 'bankName' | 'bankAgency' | 'bankAccount' | 'rejectionReason' | 'lastError'>;

export interface WithdrawalDisplay {
    status: StatusColorConfig;
    /** Para onde o dinheiro foi (snapshot gravado no pedido, não os dados de hoje). */
    destination: string;
    note: string | null;
}

function destinationOf(w: W): string {
    if (w.method === WithdrawalMethod.PIX) return `PIX: ${w.pixKey ?? '—'}`;
    if (w.method === WithdrawalMethod.TED) {
        const parts = [w.bankName, w.bankAgency && `Ag. ${w.bankAgency}`, w.bankAccount && `Conta ${w.bankAccount}`].filter(Boolean);
        return `TED: ${parts.join(' · ')}`;
    }
    return 'Pagamento manual';
}

/**
 * R9: o motivo da recusa aparece inteiro (o operador escreve para o motorista); a falha
 * técnica (`lastError`) NÃO aparece crua, porque é texto de sistema.
 */
function noteOf(w: W): string | null {
    if (w.status === WithdrawalStatus.CANCELLED) {
        const reason = w.rejectionReason?.trim();
        return reason ? `Motivo da recusa: ${reason}` : 'Recusado pela empresa. O valor voltou para o disponível.';
    }
    if (w.status === WithdrawalStatus.FAILED) return 'O pagamento falhou. Fale com a empresa.';
    if ((w.status === WithdrawalStatus.PENDING || w.status === WithdrawalStatus.PROCESSING) && w.lastError) {
        return 'O pagamento falhou uma vez e voltou para a fila da empresa.';
    }
    return null;
}

export function describeWithdrawal(w: W): WithdrawalDisplay {
    return {
        status: STATUS[w.status] ?? STATUS[WithdrawalStatus.PENDING],
        destination: destinationOf(w),
        note: noteOf(w),
    };
}
```

```tsx
// src/app/(auth)/(tabs)/menu/carteira/saques.tsx

import React, { useCallback } from 'react';
import { FlatList, Linking, RefreshControl } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ActivityIndicator, Box, ButtonBack, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { isRemoteUrl } from '@/domain/agility/chat/utils/messageUtils';
import { useInfiniteWithdrawals } from '@/domain/agility/wallet';
import type { WithdrawalResponse } from '@/domain/agility/wallet/dto';
import { WithdrawalStatus } from '@/domain/agility/wallet/dto/types';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

import { describeWithdrawal } from './_utils/withdrawalDisplay';

function WithdrawalItem({ item }: { item: WithdrawalResponse }) {
    const display = describeWithdrawal(item);
    const { showToast } = useToastService();
    const comprovantes = (item.proofUrls ?? []).filter(isRemoteUrl);

    const abrir = useCallback(
        (url: string) => {
            Linking.openURL(url).catch(() => showToast({ message: 'Nao foi possivel abrir o comprovante', type: 'error' }));
        },
        [showToast],
    );

    return (
        <Box p="m16" borderRadius="s12" mb="b12" borderWidth={1} borderColor="borderColor">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Box>
                    <Text fontSize={measure.m16} fontWeightPreset="bold">
                        {formatCurrency(item.amount)}
                    </Text>
                    <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                        {`Pedido em ${formatDate(item.createdAt)}`}
                    </Text>
                </Box>
                <Box px="x8" py="y4" borderRadius="s4" bg={display.status.bgColor}>
                    <Text fontSize={measure.m12} fontWeightPreset="semibold" color={display.status.textColor}>
                        {display.status.label}
                    </Text>
                </Box>
            </Box>

            <Text fontSize={measure.m12} color="colorTextSecondary" mt="t8">
                {display.destination}
            </Text>
            {item.status === WithdrawalStatus.COMPLETED && !!item.processedAt && (
                <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                    {`Pago em ${formatDate(item.processedAt)}`}
                </Text>
            )}
            {display.note && (
                <Text fontSize={measure.m12} color={item.status === WithdrawalStatus.CANCELLED ? 'colorTextError' : 'colorTextWarning'} mt="t8">
                    {display.note}
                </Text>
            )}

            {comprovantes.map((url, indice) => (
                <TouchableOpacityBox
                    key={url}
                    mt="t8"
                    flexDirection="row"
                    alignItems="center"
                    accessibilityRole="link"
                    accessibilityLabel="Abrir comprovante"
                    onPress={() => abrir(url)}
                >
                    <Ionicons name="receipt-outline" size={measure.m16} color="#666" />
                    <Text fontSize={measure.m12} color="colorTextSecondary" ml="l8">
                        {comprovantes.length === 1 ? 'Ver comprovante' : `Comprovante ${indice + 1}`}
                    </Text>
                </TouchableOpacityBox>
            ))}
        </Box>
    );
}

export default function MeusSaquesScreen() {
    const { items, isLoading, isError, isFetchNextPageError, isFetchingNextPage, loadMore, refetch, isRefreshing } = useInfiniteWithdrawals();
    const title = <Text preset="textTitleScreen">Meus saques</Text>;

    if (isLoading) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    if (isError && items.length === 0) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box flex={1} justifyContent="center" alignItems="center" px="x24">
                    <Text textAlign="center" color="colorTextSecondary">
                        Não foi possível carregar seus saques.
                    </Text>
                    <TouchableOpacityBox mt="t16" onPress={refetch}>
                        <Text color="colorTextPrimary">Tentar novamente</Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={title}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <WithdrawalItem item={item} />}
                contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} />}
                onEndReached={isFetchNextPageError ? undefined : loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    <Box py="y32" alignItems="center">
                        <Text color="colorTextSecondary" textAlign="center">
                            Você ainda não pediu nenhum saque.
                        </Text>
                    </Box>
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <Box py="y16" alignItems="center">
                            <ActivityIndicator />
                        </Box>
                    ) : isFetchNextPageError ? (
                        <TouchableOpacityBox py="y16" alignItems="center" onPress={loadMore}>
                            <Text fontSize={measure.m13} color="colorTextError">
                                Falha ao carregar mais. Toque para tentar de novo.
                            </Text>
                        </TouchableOpacityBox>
                    ) : null
                }
            />
        </ScreenBase>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --watchAll=false menu/carteira/_utils/__tests__/withdrawalDisplay`
Expected: PASS (6 testes).

Run: `npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/menu/carteira/_utils/withdrawalDisplay.ts" "src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/withdrawalDisplay.test.ts" "src/app/(auth)/(tabs)/menu/carteira/saques.tsx"
git commit -m "feat(carteira): tela Meus saques com status, destino e motivo da recusa

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Ganhos pelo livro-razão

Hoje, "Meus Ganhos" soma `receivedValue` dos `Payment`: é o dinheiro que o **cliente** pagou (COD), que para o CLT em dinheiro vira dívida, e o frete fica de fora (Bug 5). A soma usa só os 20 pagamentos mais recentes (Bug 6), filtra por `createdAt` mas exibe `paymentDate` (Bug 18), e ainda formata a moeda à mão. A spec (seção 5) manda: "fretes liberados e a liberar, vindos da carteira e não mais dos `Payment`". As regras estão em R3 e R4.

**Files:**
- Create: `src/domain/agility/wallet/freightEarnings.ts`
- Create: `src/domain/agility/wallet/useCase/useFreightEarnings.ts`
- Modify: `src/domain/agility/wallet/useCase/index.ts`
- Create: `src/app/(auth)/(tabs)/menu/ganhos/_utils/period.ts`
- Rewrite: `src/app/(auth)/(tabs)/menu/ganhos/index.tsx`
- Test: `src/domain/agility/wallet/__tests__/freightEarnings.test.ts`
- Test: `src/app/(auth)/(tabs)/menu/ganhos/_utils/__tests__/period.test.ts`

**Interfaces:**
- Consumes: `fetchAllPages` (Task 1), `walletAPI.getTransactions`, `TransactionType`, `TransactionStatus` e `LedgerSourceType` (Task 2).
- Produces:
  - `interface ReleasedFreight { shareId: string; description: string; releasedCents: number; releasedAt: string }`
  - `groupReleasedFreight(lines): ReleasedFreight[]`
  - `totalReleasedCents(items: ReleasedFreight[]): number`
  - `useFreightEarnings(startDate: string): { earnings?: { items: ReleasedFreight[]; totalCents: number; truncated: boolean }; isLoading; isError; refetch; isRefetching }`
  - `type Period = 'today' | 'week' | 'month' | 'year'`
  - `PERIODS`
  - `periodStart(period: Period, now?: Date): Date`
  - `periodLabel(period: Period): string`
  - `chartDataFor(items: { releasedAt: string; releasedCents: number }[], period: Period): { labels: string[]; datasets: { data: number[] }[] }` (usado também pela Task 8, que usa só `Period`, `PERIODS` e `periodStart`)

- [ ] **Step 1: Write the failing tests**

```ts
// src/domain/agility/wallet/__tests__/freightEarnings.test.ts
/**
 * Frete liberado = FREIGHT_RELEASE da parcela − estorno da MESMA parcela (espelho de
 * back/src/wallet/ledger/ledger-summary.ts). Todas as linhas de frete trazem
 * `sourceId` = id da parcela (freight-share-admin.service.ts:267).
 */
import { groupReleasedFreight, totalReleasedCents } from '../freightEarnings';

type Line = Parameters<typeof groupReleasedFreight>[0][number];

function linha(over: Partial<Line> & { id: string }): Line {
    return {
        type: 'FREIGHT_RELEASE',
        direction: 'IN',
        status: 'COMPLETED',
        amount: 10000,
        sourceType: 'FREIGHT_SHARE_RELEASE',
        sourceId: 'share-1',
        description: 'Frete liberado - roteirização LMR-260920-A1',
        createdAt: '2026-09-20T15:00:00.000Z',
        ...over,
    } as Line;
}

const estorno = (over: Partial<Line> & { id: string }) =>
    linha({ type: 'MANUAL_DEBIT' as Line['type'], direction: 'OUT', sourceType: 'FREIGHT_SHARE_REVERSAL', description: 'Estorno de frete', ...over });

describe('groupReleasedFreight', () => {
    it('liberação integral conta o valor liberado', () => {
        const itens = groupReleasedFreight([linha({ id: 'r1' })]);
        expect(itens).toEqual([
            { shareId: 'share-1', description: 'Frete liberado - roteirização LMR-260920-A1', releasedCents: 10000, releasedAt: '2026-09-20T15:00:00.000Z' },
        ]);
    });

    it('liberou menos que o bloqueado: desconta o estorno da mesma parcela', () => {
        const itens = groupReleasedFreight([linha({ id: 'r1' }), estorno({ id: 'e1', amount: 2500 })]);
        expect(itens[0].releasedCents).toBe(7500);
    });

    it('parcela CANCELADA (liberação + estorno total no mesmo gesto) não conta nem aparece', () => {
        const itens = groupReleasedFreight([
            linha({ id: 'r1', description: 'Frete desbloqueado para cancelamento - roteirização X' }),
            estorno({ id: 'e1', amount: 10000 }),
            linha({ id: 'r2', sourceId: 'share-2', amount: 4000 }),
        ]);
        expect(itens.map((i) => i.shareId)).toEqual(['share-2']);
        expect(totalReleasedCents(itens)).toBe(4000);
    });

    it('liberação de recebível legado (antes da F2) fica fora', () => {
        expect(groupReleasedFreight([linha({ id: 'r1', sourceType: 'LEGACY_RECEIVABLE_RELEASE' })])).toEqual([]);
    });

    it('linha que não está COMPLETED não conta', () => {
        expect(groupReleasedFreight([linha({ id: 'r1', status: 'PENDING' as Line['status'] })])).toEqual([]);
    });

    it('débito manual comum (origem MANUAL) não é estorno de frete', () => {
        const itens = groupReleasedFreight([linha({ id: 'r1' }), estorno({ id: 'e1', amount: 3000, sourceType: 'MANUAL', sourceId: 'share-1' })]);
        expect(itens[0].releasedCents).toBe(10000);
    });

    it('a mesma linha vinda em duas páginas conta uma vez', () => {
        expect(totalReleasedCents(groupReleasedFreight([linha({ id: 'r1' }), linha({ id: 'r1' })]))).toBe(10000);
    });

    it('mais recente primeiro', () => {
        const itens = groupReleasedFreight([
            linha({ id: 'r1', sourceId: 'a', createdAt: '2026-09-01T10:00:00.000Z' }),
            linha({ id: 'r2', sourceId: 'b', createdAt: '2026-09-15T10:00:00.000Z' }),
        ]);
        expect(itens.map((i) => i.shareId)).toEqual(['b', 'a']);
    });
});
```

```ts
// src/app/(auth)/(tabs)/menu/ganhos/_utils/__tests__/period.test.ts
// A suíte roda em America/Sao_Paulo (test/setup-timezone.ts): getters locais = horário de SP.
import { chartDataFor, periodStart } from '../period';

const agora = new Date(2026, 8, 24, 15, 30); // quinta, 24/09/2026 15:30

describe('periodStart', () => {
    it('hoje começa à meia-noite local', () => {
        expect(periodStart('today', agora)).toEqual(new Date(2026, 8, 24, 0, 0, 0, 0));
    });

    it('semana começa na segunda', () => {
        expect(periodStart('week', agora)).toEqual(new Date(2026, 8, 21, 0, 0, 0, 0));
    });

    it('mês e ano', () => {
        expect(periodStart('month', agora)).toEqual(new Date(2026, 8, 1, 0, 0, 0, 0));
        expect(periodStart('year', agora)).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
    });
});

describe('chartDataFor', () => {
    it('agrupa por dia no mês, em ordem numérica, e converte centavos para REAIS', () => {
        const dados = chartDataFor(
            [
                { releasedAt: new Date(2026, 8, 10, 12).toISOString(), releasedCents: 15050 },
                { releasedAt: new Date(2026, 8, 2, 12).toISOString(), releasedCents: 10000 },
                { releasedAt: new Date(2026, 8, 10, 18).toISOString(), releasedCents: 50 },
            ],
            'month',
        );
        expect(dados.labels).toEqual(['2', '10']);
        expect(dados.datasets[0].data).toEqual([100, 151]);
    });

    it('sem itens mostra "Sem dados"', () => {
        expect(chartDataFor([], 'week')).toEqual({ labels: ['Sem dados'], datasets: [{ data: [0] }] });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --watchAll=false wallet/__tests__/freightEarnings menu/ganhos/_utils/__tests__/period`
Expected: FAIL com "Cannot find module '../freightEarnings'" e "Cannot find module '../period'".

- [ ] **Step 3: Write the implementation**

```ts
// src/domain/agility/wallet/freightEarnings.ts
import type { TransactionResponse } from './dto/response/wallet.response';
import { LedgerSourceType, TransactionStatus, TransactionType } from './dto/types';

export interface ReleasedFreight {
    /** Id da parcela. Chave interna, nunca exibida. */
    shareId: string;
    /** Descrição da liberação, já com o código da rota ("Frete liberado - roteirização X"). */
    description: string;
    releasedCents: number;
    releasedAt: string;
}

type Line = Pick<TransactionResponse, 'id' | 'type' | 'direction' | 'status' | 'amount' | 'sourceType' | 'sourceId' | 'description' | 'createdAt'>;

/**
 * Frete que a empresa liberou, por parcela. Espelha `summaryContribution` do back
 * (`back/src/wallet/ledger/ledger-summary.ts`):
 * - FREIGHT_RELEASE da parcela (origem FREIGHT_SHARE_RELEASE) libera o bloqueado inteiro;
 * - o estorno (OUT de origem FREIGHT_SHARE_REVERSAL, mesma parcela) devolve a diferença.
 *   Liberar abaixo do bloqueado conta só o liberado; cancelar soma zero e some da lista.
 * - Liberação de recebível legado (origem LEGACY_RECEIVABLE_RELEASE) fica fora (R3).
 * Só COMPLETED conta. Linha repetida (fronteira de página) conta uma vez.
 */
export function groupReleasedFreight(lines: readonly Line[]): ReleasedFreight[] {
    const seen = new Set<string>();
    const released = new Map<string, ReleasedFreight>();
    const reversed = new Map<string, number>();

    for (const line of lines) {
        if (seen.has(line.id)) continue;
        seen.add(line.id);
        if (line.status !== TransactionStatus.COMPLETED) continue;

        if (line.type === TransactionType.FREIGHT_RELEASE && line.sourceType === LedgerSourceType.FREIGHT_SHARE_RELEASE) {
            const current = released.get(line.sourceId);
            released.set(line.sourceId, {
                shareId: line.sourceId,
                description: line.description,
                releasedCents: (current?.releasedCents ?? 0) + line.amount,
                releasedAt: line.createdAt,
            });
        } else if (line.direction === 'OUT' && line.sourceType === LedgerSourceType.FREIGHT_SHARE_REVERSAL) {
            reversed.set(line.sourceId, (reversed.get(line.sourceId) ?? 0) + line.amount);
        }
    }

    return [...released.values()]
        .map((item) => ({ ...item, releasedCents: item.releasedCents - (reversed.get(item.shareId) ?? 0) }))
        .filter((item) => item.releasedCents > 0)
        .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}

export function totalReleasedCents(items: readonly ReleasedFreight[]): number {
    return items.reduce((sum, item) => sum + item.releasedCents, 0);
}
```

```ts
// src/domain/agility/wallet/useCase/useFreightEarnings.ts
import { useQuery } from '@tanstack/react-query';

import { fetchAllPages } from '@/domain/hooks/pagination';
import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { TransactionStatus, TransactionType } from '../dto/types';
import { groupReleasedFreight, totalReleasedCents } from '../freightEarnings';
import { walletAPI } from '../walletAPI';

/** Máximo aceito pelo back (`@Max(100)` em ListTransactionsDto). */
const EARNINGS_PAGE_SIZE = 100;
/** Teto por tipo: 2000 lançamentos. Acima disso a tela avisa "valores parciais" (R4). */
const EARNINGS_MAX_PAGES = 20;

/**
 * Frete liberado desde `startDate` (ISO). O back filtra UM `type` exato por chamada: são
 * duas buscas (liberações e débitos manuais, dos quais só o estorno de frete conta).
 */
export function useFreightEarnings(startDate: string) {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    const query = useQuery({
        queryKey: [KEY_WALLET, 'earnings', startDate],
        queryFn: async () => {
            const buscarTipo = (type: TransactionType) =>
                fetchAllPages(
                    (page) =>
                        walletAPI.getTransactions({ type, status: TransactionStatus.COMPLETED, startDate, page, limit: EARNINGS_PAGE_SIZE }),
                    EARNINGS_MAX_PAGES,
                );
            const [liberacoes, debitos] = await Promise.all([
                buscarTipo(TransactionType.FREIGHT_RELEASE),
                buscarTipo(TransactionType.MANUAL_DEBIT),
            ]);
            const items = groupReleasedFreight([...liberacoes.items, ...debitos.items]);
            return { items, totalCents: totalReleasedCents(items), truncated: liberacoes.truncated || debitos.truncated };
        },
        enabled: isAuthenticated,
        staleTime: 60_000,
    });

    return {
        earnings: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
        isRefetching: query.isRefetching,
    };
}
```

Em `src/domain/agility/wallet/useCase/index.ts`, acrescente:

```ts
export * from './useFreightEarnings';
```

```ts
// src/app/(auth)/(tabs)/menu/ganhos/_utils/period.ts
import { startOfDay, startOfMonth, startOfWeek, startOfYear } from 'date-fns';

export type Period = 'today' | 'week' | 'month' | 'year';

export const PERIODS: { value: Period; label: string }[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
    { value: 'year', label: 'Ano' },
];

export function periodLabel(period: Period): string {
    return PERIODS.find((p) => p.value === period)?.label ?? 'Mês';
}

/** Início do período no fuso do aparelho (a operação é em SP). Semana começa na segunda. */
export function periodStart(period: Period, now: Date = new Date()): Date {
    switch (period) {
        case 'today':
            return startOfDay(now);
        case 'week':
            return startOfWeek(now, { weekStartsOn: 1 });
        case 'year':
            return startOfYear(now);
        case 'month':
        default:
            return startOfMonth(now);
    }
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function bucketOf(date: Date, period: Period): string {
    switch (period) {
        case 'today':
            return `${date.getHours()}h`;
        case 'week':
            return WEEK_DAYS[date.getDay()];
        case 'year':
            return MONTHS[date.getMonth()];
        case 'month':
        default:
            return String(date.getDate());
    }
}

function orderOf(label: string, period: Period): number {
    if (period === 'week') return WEEK_DAYS.indexOf(label);
    if (period === 'year') return MONTHS.indexOf(label);
    return parseInt(label, 10);
}

export interface ChartData {
    labels: string[];
    datasets: { data: number[] }[];
}

/**
 * Dados do `EarningsChart`, que formata em REAIS: é o único ponto do app que converte
 * centavos → reais à mão.
 */
export function chartDataFor(items: readonly { releasedAt: string; releasedCents: number }[], period: Period): ChartData {
    const cents: Record<string, number> = {};
    for (const item of items) {
        const key = bucketOf(new Date(item.releasedAt), period);
        cents[key] = (cents[key] ?? 0) + item.releasedCents;
    }
    const labels = Object.keys(cents).sort((a, b) => orderOf(a, period) - orderOf(b, period));
    if (labels.length === 0) return { labels: ['Sem dados'], datasets: [{ data: [0] }] };
    return { labels, datasets: [{ data: labels.map((label) => cents[label] / 100) }] };
}
```

Substitua **todo** o conteúdo de `src/app/(auth)/(tabs)/menu/ganhos/index.tsx` por:

```tsx
// src/app/(auth)/(tabs)/menu/ganhos/index.tsx

import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { useFreightEarnings, useGetWallet } from '@/domain/agility/wallet';
import EarningsChart from '@/EarningsChart';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

import { chartDataFor, Period, periodLabel, PERIODS, periodStart } from './_utils/period';

function StatCard({ title, value, subtitle, testID }: { title: string; value: string; subtitle?: string; testID: string }) {
    return (
        <Box flex={1} backgroundColor="white" borderRadius="s20" padding="m12" margin="m4" borderWidth={measure.m1} borderColor="borderColor">
            <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                {title}
            </Text>
            <Text testID={testID} preset="text20" color="primary100" fontWeight="bold" marginBottom="y2">
                {value}
            </Text>
            {!!subtitle && (
                <Text preset="text12" color="secondaryTextColor">
                    {subtitle}
                </Text>
            )}
        </Box>
    );
}

export default function GanhosScreen() {
    const router = useRouter();
    const [period, setPeriod] = useState<Period>('month');
    const startDate = useMemo(() => periodStart(period).toISOString(), [period]);
    const { wallet } = useGetWallet();
    const { earnings, isLoading, isError, refetch, isRefetching } = useFreightEarnings(startDate);
    const chartData = useMemo(() => chartDataFor(earnings?.items ?? [], period), [earnings, period]);

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Meus Ganhos</Text>}>
            <ScrollView refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}>
                <Text preset="text14" color="secondaryTextColor" marginBottom="y12">
                    Fretes que a empresa liberou para você. O que você recebeu de clientes fica em Cobranças.
                </Text>

                {wallet && (
                    <TouchableOpacityBox
                        marginBottom="b12"
                        backgroundColor="primary10"
                        borderRadius="s16"
                        padding="m16"
                        flexDirection="row"
                        alignItems="center"
                        justifyContent="space-between"
                        onPress={() => router.push('/menu/carteira')}
                    >
                        <Box>
                            <Text preset="text12" color="colorTextSecondary">
                                Disponível para saque
                            </Text>
                            <Text preset="text20" color="primary100" fontWeight="bold" marginTop="y4">
                                {formatCurrency(wallet.availableBalance)}
                            </Text>
                        </Box>
                        <Box flexDirection="row" alignItems="center">
                            <Text preset="text14" color="primary100" fontWeight="semibold">
                                Ver carteira
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color="#4A90E2" />
                        </Box>
                    </TouchableOpacityBox>
                )}

                <Box flexDirection="row" justifyContent="space-between" paddingVertical="y12">
                    {PERIODS.map((option) => (
                        <TouchableOpacityBox
                            key={option.value}
                            flex={1}
                            backgroundColor={period === option.value ? 'primary100' : 'gray50'}
                            borderRadius="s10"
                            padding="m12"
                            marginHorizontal="x4"
                            onPress={() => setPeriod(option.value)}
                        >
                            <Text
                                preset="text12"
                                color={period === option.value ? 'white' : 'secondaryTextColor'}
                                fontWeight={period === option.value ? 'bold' : 'normal'}
                                textAlign="center"
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacityBox>
                    ))}
                </Box>

                {isLoading ? (
                    <Box padding="y32" alignItems="center">
                        <ActivityIndicator />
                    </Box>
                ) : isError && !earnings ? (
                    <Box padding="y32" alignItems="center">
                        <Text preset="text14" color="secondaryTextColor" textAlign="center">
                            Não foi possível carregar seus ganhos.
                        </Text>
                        <TouchableOpacityBox mt="t16" onPress={() => void refetch()}>
                            <Text color="colorTextPrimary">Tentar novamente</Text>
                        </TouchableOpacityBox>
                    </Box>
                ) : earnings ? (
                    <>
                        <EarningsChart data={chartData} period={period} />

                        {earnings.truncated && (
                            <Text preset="text12" color="colorTextWarning" marginTop="y8">
                                Valores parciais: há lançamentos demais neste período. Escolha um período menor.
                            </Text>
                        )}

                        <Box flexDirection="row" marginTop="y12">
                            <StatCard
                                testID="frete-liberado"
                                title={`Frete liberado · ${periodLabel(period)}`}
                                value={formatCurrency(earnings.totalCents)}
                                subtitle={`${earnings.items.length} frete(s)`}
                            />
                            <StatCard
                                testID="frete-a-liberar"
                                title="Frete a liberar"
                                value={formatCurrency(wallet?.freightPendingBalance ?? 0)}
                                subtitle="Total de hoje, esperando a empresa liberar"
                            />
                        </Box>

                        <Text preset="text16" color="colorTextPrimary" fontWeight="bold" marginTop="y24" marginBottom="y12">
                            {`Fretes liberados · ${periodLabel(period)}`}
                        </Text>
                        {earnings.items.length === 0 ? (
                            <Text preset="text14" color="secondaryTextColor">
                                Nenhum frete liberado neste período.
                            </Text>
                        ) : (
                            earnings.items.map((item) => (
                                <Box
                                    key={item.shareId}
                                    flexDirection="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    padding="m12"
                                    marginBottom="y10"
                                    borderRadius="s12"
                                    borderWidth={measure.m1}
                                    borderColor="borderColor"
                                >
                                    <Box flex={1} marginRight="x8">
                                        <Text preset="text14" color="colorTextPrimary" numberOfLines={2}>
                                            {item.description}
                                        </Text>
                                        <Text preset="text12" color="secondaryTextColor">
                                            {formatDate(item.releasedAt)}
                                        </Text>
                                    </Box>
                                    <Text preset="text14" color="colorTextSuccess" fontWeight="bold">
                                        {formatCurrency(item.releasedCents)}
                                    </Text>
                                </Box>
                            ))
                        )}
                    </>
                ) : null}

                <TouchableOpacityBox
                    marginTop="y24"
                    marginBottom="y20"
                    padding="m16"
                    borderRadius="s12"
                    borderWidth={measure.m1}
                    borderColor="primary100"
                    alignItems="center"
                    onPress={() => router.push('/menu/ganhos/cobrancas')}
                >
                    <Text preset="text14" color="primary100" fontWeight="semibold">
                        Ver cobranças recebidas de clientes
                    </Text>
                </TouchableOpacityBox>
            </ScrollView>
        </ScreenBase>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --watchAll=false wallet/__tests__/freightEarnings menu/ganhos/_utils/__tests__/period`
Expected: PASS: `freightEarnings` (8) e `period` (5).

Run: `npx tsc --noEmit`
Expected: sem saída (os tokens `y24`, `y20`, `x8` e `y10` existem em `src/theme/spacing.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/domain/agility/wallet/freightEarnings.ts src/domain/agility/wallet/__tests__/freightEarnings.test.ts src/domain/agility/wallet/useCase/useFreightEarnings.ts src/domain/agility/wallet/useCase/index.ts "src/app/(auth)/(tabs)/menu/ganhos/_utils/period.ts" "src/app/(auth)/(tabs)/menu/ganhos/_utils/__tests__/period.test.ts" "src/app/(auth)/(tabs)/menu/ganhos/index.tsx"
git commit -m "feat(ganhos): frete liberado e a liberar vindos da carteira, nao dos pagamentos de cliente

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Cobranças

A spec separa "Cobranças", que é o que o motorista recebeu do cliente, dos "Ganhos". Os `Payment` saem do Ganhos (Task 7) e vêm para cá, paginados no servidor e recortados por período no dia de SP. A tela também deixa de mostrar o fim do id da rota (`…a1b2c3d4`) e passa a usar `routingName`/`routingCode`. O cartão "Dinheiro a devolver" usa o resumo dos adiantamentos e leva ao vencimento (R5). Com a rede fora, ele diz que houve erro, e não que "não há nada a devolver" (Review Focus 5).

**Files:**
- Modify: `src/domain/agility/finance/dto/response/payment.response.ts` (`routingName`)
- Create: `src/domain/agility/finance/paymentsPage.ts`
- Create: `src/domain/agility/finance/useCase/useInfinitePayments.ts`
- Modify: `src/domain/agility/finance/useCase/index.ts`
- Create: `src/app/(auth)/(tabs)/menu/ganhos/_utils/paymentDisplay.ts`
- Create: `src/app/(auth)/(tabs)/menu/ganhos/cobrancas.tsx`
- Test: `src/domain/agility/finance/__tests__/paymentsPage.test.ts`
- Test: `src/app/(auth)/(tabs)/menu/ganhos/_utils/__tests__/paymentDisplay.test.ts`

**Interfaces:**
- Consumes: `useInfinitePagedList` e `PagedResponse` (Task 1); `Period`, `PERIODS` e `periodStart` (Task 7); `useGetAdvancesSummary()` (já existe); `financeAPI.findAll(params): Promise<BaseResponse<PaymentResponse[] | PaginatedPaymentsResponse<PaymentResponse>>>` (já existe).
- Produces:
  - `toPaymentsPage(result, requestedPage): PagedResponse<PaymentResponse>`
  - `useInfinitePayments(range: { startDate: string }): InfinitePagedList<PaymentResponse>`, onde `startDate` é `yyyy-MM-dd`
  - `describePayment(p): { title: string; subtitle: string | null; route: string | null; status: StatusColorConfig; amountCents: number; date: string }`
  - `type DebtCard = { kind: 'error' } | { kind: 'loading' } | { kind: 'none' } | { kind: 'debt'; totalCents: number; count: number; overdueCount: number }`
  - `debtCardState(summary, isError): DebtCard`

- [ ] **Step 1: Write the failing tests**

```ts
// src/domain/agility/finance/__tests__/paymentsPage.test.ts
import { toPaymentsPage } from '../paymentsPage';

const pagamento = (id: string) => ({ id }) as never;

describe('toPaymentsPage', () => {
    it('resposta paginada do back vira página com page/totalPages', () => {
        const pagina = toPaymentsPage(
            { data: [pagamento('p1')], meta: { page: 2, limit: 50, totalItems: 120, totalPages: 3, hasNextPage: true, hasPreviousPage: true } },
            2,
        );
        expect(pagina).toEqual({ data: [{ id: 'p1' }], meta: { page: 2, totalPages: 3 } });
    });

    it('resposta legada em array é a última página', () => {
        expect(toPaymentsPage([pagamento('p1')], 1)).toEqual({ data: [{ id: 'p1' }], meta: { page: 1, totalPages: 1 } });
    });

    it('resposta vazia não quebra', () => {
        expect(toPaymentsPage(undefined, 1)).toEqual({ data: [], meta: { page: 1, totalPages: 1 } });
    });
});
```

```ts
// src/app/(auth)/(tabs)/menu/ganhos/_utils/__tests__/paymentDisplay.test.ts
import { debtCardState, describePayment } from '../paymentDisplay';

type P = Parameters<typeof describePayment>[0];

function pagamento(over: Partial<P> = {}): P {
    return {
        customerName: 'Mercado Bom Preço',
        serviceTitle: 'Entrega NF 123',
        routingId: '2f6c1c8e-1111-2222-3333-a1b2c3d4e5f6',
        routingCode: 'LMR-260920-A1',
        routingName: null,
        expectedValue: 15000,
        receivedValue: 15000,
        status: 'APPROVED',
        paymentDate: '2026-09-20T14:00:00.000Z',
        createdAt: '2026-09-20T14:05:00.000Z',
        ...over,
    } as P;
}

describe('describePayment', () => {
    it('rota pelo nome, depois pelo código — nunca pelo id', () => {
        expect(describePayment(pagamento({ routingName: 'Zona Sul manhã' })).route).toBe('Zona Sul manhã');
        expect(describePayment(pagamento()).route).toBe('LMR-260920-A1');
        expect(describePayment(pagamento({ routingCode: null })).route).toBeNull();
    });

    it('valor recebido, ou o esperado enquanto não recebeu', () => {
        expect(describePayment(pagamento()).amountCents).toBe(15000);
        expect(describePayment(pagamento({ receivedValue: undefined, status: 'PENDING' as P['status'] })).amountCents).toBe(15000);
    });

    it('data do pagamento, ou do registro quando não houver', () => {
        expect(describePayment(pagamento()).date).toBe('2026-09-20T14:00:00.000Z');
        expect(describePayment(pagamento({ paymentDate: undefined })).date).toBe('2026-09-20T14:05:00.000Z');
    });

    it('status em português', () => {
        expect(describePayment(pagamento()).status.label).toBe('Recebido');
        expect(describePayment(pagamento({ status: 'PENDING' as P['status'] })).status.label).toBe('Pendente');
        expect(describePayment(pagamento({ status: 'REJECTED' as P['status'] })).status.label).toBe('Recusado');
    });
});

describe('debtCardState', () => {
    it('erro sem dado NÃO vira "nada a devolver"', () => {
        expect(debtCardState(undefined, true)).toEqual({ kind: 'error' });
    });

    it('dado anterior continua valendo se só o refetch falhou', () => {
        expect(debtCardState({ totalPending: 3000, count: 1, overdueCount: 0 }, true)).toEqual({
            kind: 'debt',
            totalCents: 3000,
            count: 1,
            overdueCount: 0,
        });
    });

    it('sem dívida', () => {
        expect(debtCardState({ totalPending: 0, count: 0, overdueCount: 0 }, false)).toEqual({ kind: 'none' });
    });

    it('carregando', () => {
        expect(debtCardState(undefined, false)).toEqual({ kind: 'loading' });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --watchAll=false finance/__tests__/paymentsPage menu/ganhos/_utils/__tests__/paymentDisplay`
Expected: FAIL com "Cannot find module '../paymentsPage'" e "Cannot find module '../paymentDisplay'".

- [ ] **Step 3: Write the implementation**

Em `src/domain/agility/finance/dto/response/payment.response.ts`, dentro de `PaymentResponse`, logo depois de `routingCode`, acrescente:

```ts
  /** Nome da rota (snapshot do backend via JOIN; null em rota antiga sem nome). */
  routingName?: string | null;
```

```ts
// src/domain/agility/finance/paymentsPage.ts
import type { PagedResponse } from '@/domain/hooks/pagination';

import type { PaginatedPaymentsResponse } from './dto/request/list-payments.request';
import type { PaymentResponse } from './dto/response/payment.response';

/**
 * `GET /finance/payments` devolve `{ data, meta: { page, totalPages, ... } }`; resposta
 * legada em array é tratada como página única.
 */
export function toPaymentsPage(
    result: PaymentResponse[] | PaginatedPaymentsResponse<PaymentResponse> | undefined | null,
    requestedPage: number,
): PagedResponse<PaymentResponse> {
    if (Array.isArray(result)) return { data: result, meta: { page: requestedPage, totalPages: requestedPage } };
    if (result && Array.isArray(result.data)) {
        return { data: result.data, meta: { page: result.meta.page, totalPages: result.meta.totalPages } };
    }
    return { data: [], meta: { page: requestedPage, totalPages: requestedPage } };
}
```

```ts
// src/domain/agility/finance/useCase/useInfinitePayments.ts
import { useInfinitePagedList } from '@/domain/hooks/useInfinitePagedList';
import { KEY_FINANCE } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services/authCredentials/useAuthCredentialsService';

import type { PaymentResponse } from '../dto/response/payment.response';
import { financeAPI } from '../financeAPI';
import { toPaymentsPage } from '../paymentsPage';

const PAYMENTS_PAGE_SIZE = 50;

/**
 * Cobranças do motorista desde `startDate` (`yyyy-MM-dd`, dia de São Paulo — o back usa
 * `startOfDaySaoPaulo`). O `driverId` vem do token no back (`resolveDriverScope`).
 */
export function useInfinitePayments(range: { startDate: string }) {
    const { authCredentials } = useAuthCredentialsService();
    const enabled = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    return useInfinitePagedList<PaymentResponse>(
        [KEY_FINANCE, 'payments', 'infinite', range],
        async (page) => {
            const response = await financeAPI.findAll({ startDate: range.startDate, page, limit: PAYMENTS_PAGE_SIZE });
            return toPaymentsPage(response.result, page);
        },
        { enabled },
    );
}
```

Em `src/domain/agility/finance/useCase/index.ts`, acrescente:

```ts
export * from './useInfinitePayments';
```

```ts
// src/app/(auth)/(tabs)/menu/ganhos/_utils/paymentDisplay.ts
import type { PaymentResponse } from '@/domain/agility/finance/dto/response/payment.response';
import type { StatusColorConfig } from '@/theme';

const STATUS: Record<string, StatusColorConfig> = {
    APPROVED: { label: 'Recebido', textColor: 'tertiary100', bgColor: 'tertiary20' },
    PENDING: { label: 'Pendente', textColor: 'yellow100', bgColor: 'yellow20' },
    REJECTED: { label: 'Recusado', textColor: 'gray400', bgColor: 'gray50' },
};

type P = Pick<
    PaymentResponse,
    'customerName' | 'serviceTitle' | 'routingCode' | 'routingName' | 'expectedValue' | 'receivedValue' | 'status' | 'paymentDate' | 'createdAt'
>;

export interface PaymentDisplay {
    title: string;
    subtitle: string | null;
    /** Nome ou código da rota. Nunca o id (regra "nome, nunca id"). */
    route: string | null;
    status: StatusColorConfig;
    amountCents: number;
    date: string;
}

export function describePayment(p: P): PaymentDisplay {
    return {
        title: p.customerName || 'Cliente',
        subtitle: p.serviceTitle ?? null,
        route: p.routingName || p.routingCode || null,
        status: STATUS[p.status] ?? STATUS.PENDING,
        amountCents: p.receivedValue ?? p.expectedValue,
        date: p.paymentDate ?? p.createdAt,
    };
}

export type DebtCard =
    | { kind: 'error' }
    | { kind: 'loading' }
    | { kind: 'none' }
    | { kind: 'debt'; totalCents: number; count: number; overdueCount: number };

/**
 * Cartão "Dinheiro a devolver". Erro sem dado é ERRO, nunca "nada a devolver" (a tela
 * antiga de adiantamentos dizia ✓ "nenhum pendente" com a API fora — auditoria, Bug 9).
 */
export function debtCardState(
    summary: { totalPending: number; count: number; overdueCount: number } | undefined,
    isError: boolean,
): DebtCard {
    if (!summary) return isError ? { kind: 'error' } : { kind: 'loading' };
    if (summary.totalPending <= 0) return { kind: 'none' };
    return { kind: 'debt', totalCents: summary.totalPending, count: summary.count, overdueCount: summary.overdueCount };
}
```

```tsx
// src/app/(auth)/(tabs)/menu/ganhos/cobrancas.tsx

import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { format } from 'date-fns';
import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, ButtonBack, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { useInfinitePayments } from '@/domain/agility/finance';
import type { PaymentResponse } from '@/domain/agility/finance';
import { useGetAdvancesSummary } from '@/domain/agility/wallet';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

import { debtCardState, describePayment } from './_utils/paymentDisplay';
import { Period, PERIODS, periodStart } from './_utils/period';

function PaymentItem({ item }: { item: PaymentResponse }) {
    const d = describePayment(item);
    return (
        <Box p="m12" mb="b12" borderRadius="s12" borderWidth={1} borderColor="borderColor">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Text fontSize={measure.m14} fontWeightPreset="bold" numberOfLines={1} flex={1} mr="r8">
                    {d.title}
                </Text>
                <Box px="x8" py="y4" borderRadius="s4" bg={d.status.bgColor}>
                    <Text fontSize={measure.m12} fontWeightPreset="semibold" color={d.status.textColor}>
                        {d.status.label}
                    </Text>
                </Box>
            </Box>
            {d.subtitle && (
                <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4" numberOfLines={1}>
                    {d.subtitle}
                </Text>
            )}
            {d.route && (
                <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                    {`Rota: ${d.route}`}
                </Text>
            )}
            <Box flexDirection="row" justifyContent="space-between" mt="t8">
                <Text fontSize={measure.m12} color="colorTextSecondary">
                    {formatDate(d.date)}
                </Text>
                <Text fontSize={measure.m14} fontWeightPreset="bold">
                    {formatCurrency(d.amountCents)}
                </Text>
            </Box>
        </Box>
    );
}

export default function CobrancasScreen() {
    const router = useRouter();
    const [period, setPeriod] = useState<Period>('month');
    const startDate = useMemo(() => format(periodStart(period), 'yyyy-MM-dd'), [period]);
    const range = useMemo(() => ({ startDate }), [startDate]);
    const { items, isLoading, isError, isFetchNextPageError, isFetchingNextPage, loadMore, refetch, isRefreshing } = useInfinitePayments(range);
    const { summary, isError: isSummaryError, refetch: refetchSummary } = useGetAdvancesSummary();
    const debt = debtCardState(summary, isSummaryError);

    const header = (
        <Box>
            <Text fontSize={measure.m12} color="colorTextSecondary" mb="b12">
                O que você recebeu dos clientes na entrega. Esse dinheiro é da empresa: não entra nos seus ganhos.
            </Text>

            {debt.kind === 'error' ? (
                <TouchableOpacityBox testID="divida-erro" p="m16" borderRadius="s12" backgroundColor="gray50" onPress={() => void refetchSummary()}>
                    <Text fontSize={measure.m13} color="colorTextError">
                        Não foi possível carregar o que você deve devolver. Toque para tentar de novo.
                    </Text>
                </TouchableOpacityBox>
            ) : debt.kind === 'debt' ? (
                <TouchableOpacityBox p="m16" borderRadius="s12" backgroundColor="gray50" onPress={() => router.push('/menu/carteira/adiantamentos')}>
                    <Text fontSize={measure.m13} color="colorTextSecondary">
                        Dinheiro a devolver à empresa
                    </Text>
                    <Text fontSize={measure.m20} fontWeightPreset="bold" color={debt.overdueCount > 0 ? 'colorTextError' : 'colorTextWarning'}>
                        {formatCurrency(debt.totalCents)}
                    </Text>
                    <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                        {debt.overdueCount > 0 ? `${debt.overdueCount} vencido(s). Toque para ver os vencimentos.` : 'Toque para ver os vencimentos.'}
                    </Text>
                </TouchableOpacityBox>
            ) : debt.kind === 'none' ? (
                <Text fontSize={measure.m13} color="colorTextSecondary">
                    Você não tem dinheiro a devolver.
                </Text>
            ) : null}

            <Box flexDirection="row" justifyContent="space-between" py="y12">
                {PERIODS.map((option) => (
                    <TouchableOpacityBox
                        key={option.value}
                        flex={1}
                        backgroundColor={period === option.value ? 'primary100' : 'gray50'}
                        borderRadius="s10"
                        padding="m12"
                        marginHorizontal="x4"
                        onPress={() => setPeriod(option.value)}
                    >
                        <Text fontSize={measure.m12} color={period === option.value ? 'white' : 'colorTextSecondary'} textAlign="center">
                            {option.label}
                        </Text>
                    </TouchableOpacityBox>
                ))}
            </Box>
        </Box>
    );

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Cobranças</Text>}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <PaymentItem item={item} />}
                ListHeaderComponent={header}
                contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => {
                            refetch();
                            void refetchSummary();
                        }}
                    />
                }
                onEndReached={isFetchNextPageError ? undefined : loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    isLoading ? (
                        <Box py="y32" alignItems="center">
                            <ActivityIndicator />
                        </Box>
                    ) : isError ? (
                        <Box py="y32" alignItems="center">
                            <Text color="colorTextSecondary" textAlign="center">
                                Não foi possível carregar as cobranças.
                            </Text>
                            <TouchableOpacityBox mt="t16" onPress={refetch}>
                                <Text color="colorTextPrimary">Tentar novamente</Text>
                            </TouchableOpacityBox>
                        </Box>
                    ) : (
                        <Box py="y32" alignItems="center">
                            <Text color="colorTextSecondary" textAlign="center">
                                Nenhuma cobrança neste período.
                            </Text>
                        </Box>
                    )
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <Box py="y16" alignItems="center">
                            <ActivityIndicator />
                        </Box>
                    ) : isFetchNextPageError ? (
                        <TouchableOpacityBox py="y16" alignItems="center" onPress={loadMore}>
                            <Text fontSize={measure.m13} color="colorTextError">
                                Falha ao carregar mais. Toque para tentar de novo.
                            </Text>
                        </TouchableOpacityBox>
                    ) : null
                }
            />
        </ScreenBase>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --watchAll=false finance/__tests__/paymentsPage menu/ganhos/_utils/__tests__/paymentDisplay`
Expected: PASS: `paymentsPage` (3) e `paymentDisplay` (8).

Run: `npx tsc --noEmit`
Expected: sem saída (o token `r8` existe em `src/theme/spacing.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/domain/agility/finance/dto/response/payment.response.ts src/domain/agility/finance/paymentsPage.ts src/domain/agility/finance/__tests__/paymentsPage.test.ts src/domain/agility/finance/useCase/useInfinitePayments.ts src/domain/agility/finance/useCase/index.ts "src/app/(auth)/(tabs)/menu/ganhos/_utils/paymentDisplay.ts" "src/app/(auth)/(tabs)/menu/ganhos/_utils/__tests__/paymentDisplay.test.ts" "src/app/(auth)/(tabs)/menu/ganhos/cobrancas.tsx"
git commit -m "feat(cobrancas): cobrancas recebidas de clientes por periodo e o que falta devolver

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Adiantamentos: acumula, erro ≠ vazio, vencimento

A tela atual tem quatro problemas:
- com a API fora, mostra ✓ verde "Nenhum adiantamento pendente", ou seja, diz ao motorista que ele não deve nada (Bug 9);
- troca a página em vez de acumular (Bug 7);
- não mostra o vencimento que a spec pede (UC6: "com vencimento em `prazoDevolucaoDias`");
- exibe a descrição da dívida de cobrança com o id do serviço.

As regras desta task estão em R12.

**Files:**
- Create: `src/app/(auth)/(tabs)/menu/carteira/_utils/advanceDisplay.ts`
- Rewrite: `src/app/(auth)/(tabs)/menu/carteira/adiantamentos.tsx`
- Modify: `src/domain/agility/wallet/useCase/useGetAdvances.ts` (sai `useGetAdvances(page, limit)` e fica só `useGetAdvancesSummary`)
- Test: `src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/advanceDisplay.test.ts`
- Test: `src/app/(auth)/(tabs)/menu/carteira/__tests__/adiantamentos.test.tsx`

**Interfaces:**
- Consumes: `useInfiniteAdvances()` (Task 1) e `useGetAdvancesSummary()` (já existe).
- Produces:
  - `advanceTitle(a: Pick<AdvanceResponse, 'description'>): string`
  - `advanceDueText(a: Pick<AdvanceResponse, 'dueDate'>): string | null`

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/advanceDisplay.test.ts
import { advanceDueText, advanceTitle } from '../advanceDisplay';

describe('advanceTitle', () => {
    it('dívida de cobrança em dinheiro não mostra o id do serviço', () => {
        const titulo = advanceTitle({ description: 'Dinheiro recebido no service 2f6c1c8e-1111-2222-3333-a1b2c3d4e5f6 — devolução pendente' });
        expect(titulo).toBe('Dinheiro recebido de cliente');
        expect(titulo).not.toContain('2f6c1c8e');
    });

    it('adiantamento do operador mantém a descrição dele', () => {
        expect(advanceTitle({ description: 'Combustível rota Zona Sul' })).toBe('Combustível rota Zona Sul');
    });
});

describe('advanceDueText', () => {
    it('vencimento como dia-calendário (o painel grava meia-noite UTC)', () => {
        expect(advanceDueText({ dueDate: '2026-09-30T00:00:00.000Z' })).toBe('Vence em 30/09/2026');
    });

    it('sem vencimento', () => {
        expect(advanceDueText({ dueDate: undefined })).toBeNull();
    });
});
```

```tsx
// src/app/(auth)/(tabs)/menu/carteira/__tests__/adiantamentos.test.tsx
/**
 * Com a API fora, a tela NÃO pode dizer "nenhum adiantamento" (antes: ✓ verde, o motorista
 * achava que não devia nada — auditoria, Bug 9).
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';

jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-background-geolocation', () => ({
    __esModule: true,
    default: { ready: jest.fn(), onLocation: jest.fn(), removeListeners: jest.fn() },
}));
jest.mock('@/components/Icon/LocalIcon', () => ({ LocalIcon: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    router: { push: jest.fn(), back: jest.fn() },
}));

const mockUseInfiniteAdvances = jest.fn();
const mockUseGetAdvancesSummary = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useInfiniteAdvances: () => mockUseInfiniteAdvances(),
    useGetAdvancesSummary: () => mockUseGetAdvancesSummary(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdiantamentosScreen = require('../adiantamentos').default;

const LISTA_OK = {
    items: [],
    isLoading: false,
    isError: false,
    isFetchNextPageError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    loadMore: jest.fn(),
    refetch: jest.fn(),
    isRefreshing: false,
};

function render(lista: Record<string, unknown>, resumo: Record<string, unknown>) {
    mockUseInfiniteAdvances.mockReturnValue({ ...LISTA_OK, ...lista });
    mockUseGetAdvancesSummary.mockReturnValue({ refetch: jest.fn(), ...resumo });
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <AdiantamentosScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

const existe = (tree: TestRenderer.ReactTestRenderer, testID: string) => tree.root.findAllByProps({ testID }).length > 0;

describe('Adiantamentos', () => {
    it('lista com erro mostra erro, não "nenhum adiantamento"', () => {
        const tree = render({ isError: true }, { summary: undefined, isError: true });
        expect(existe(tree, 'adiantamentos-erro')).toBe(true);
        expect(existe(tree, 'adiantamentos-vazio')).toBe(false);
    });

    it('resumo com erro não mostra total zerado', () => {
        const tree = render({ items: [] }, { summary: undefined, isError: true });
        expect(existe(tree, 'resumo-erro')).toBe(true);
        expect(existe(tree, 'resumo-total')).toBe(false);
    });

    it('mostra o vencimento e esconde o id do serviço da dívida de cobrança', () => {
        const tree = render(
            {
                items: [
                    {
                        id: 'a-1',
                        amount: 5000,
                        pendingAmount: 5000,
                        returnedAmount: 0,
                        status: 'PENDING',
                        description: 'Dinheiro recebido no service 2f6c1c8e-1111 — devolução pendente',
                        dueDate: '2026-09-30T00:00:00.000Z',
                        isOverdue: false,
                        createdAt: '2026-09-23T12:00:00.000Z',
                    },
                ],
            },
            { summary: { totalPending: 5000, count: 1, overdueCount: 0 }, isError: false },
        );
        expect(tree.root.findAllByProps({ testID: 'vencimento-a-1' })[0].props.children).toBe('Vence em 30/09/2026');
        expect(tree.root.findAllByProps({ testID: 'titulo-a-1' })[0].props.children).toBe('Dinheiro recebido de cliente');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --watchAll=false menu/carteira/_utils/__tests__/advanceDisplay menu/carteira/__tests__/adiantamentos`
Expected: FAIL com "Cannot find module '../advanceDisplay'". A tela atual chama `useGetAdvances`, que o mock não fornece: "useGetAdvances is not a function".

- [ ] **Step 3: Write the implementation**

```ts
// src/app/(auth)/(tabs)/menu/carteira/_utils/advanceDisplay.ts
import type { AdvanceResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { formatDateOnly } from '@/utils/formatDate';

/**
 * A dívida de cobrança em dinheiro nasce com a descrição
 * "Dinheiro recebido no service <uuid> — devolução pendente" (back, payment.listener.ts:99).
 * O id não vai para a tela (regra "nome, nunca id").
 */
const CASH_DEBT_PREFIX = /^Dinheiro recebido no service /;

export function advanceTitle(a: Pick<AdvanceResponse, 'description'>): string {
    if (CASH_DEBT_PREFIX.test(a.description ?? '')) return 'Dinheiro recebido de cliente';
    return a.description;
}

/** Dia-calendário (R12): o painel grava o vencimento como meia-noite UTC do dia escolhido. */
export function advanceDueText(a: Pick<AdvanceResponse, 'dueDate'>): string | null {
    if (!a.dueDate) return null;
    const dia = formatDateOnly(a.dueDate);
    return dia ? `Vence em ${dia}` : null;
}
```

Em `src/domain/agility/wallet/useCase/useGetAdvances.ts`, apague a função `useGetAdvances(page, limit)` inteira e deixe só `useGetAdvancesSummary`, com os imports que ela usa. A lista agora é `useInfiniteAdvances` (Task 1).

Substitua **todo** o conteúdo de `src/app/(auth)/(tabs)/menu/carteira/adiantamentos.tsx` por:

```tsx
// src/app/(auth)/(tabs)/menu/carteira/adiantamentos.tsx

import React from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ActivityIndicator, Box, ButtonBack, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { useGetAdvancesSummary, useInfiniteAdvances } from '@/domain/agility/wallet';
import type { AdvanceResponse } from '@/domain/agility/wallet/dto';
import { AdvanceStatus } from '@/domain/agility/wallet/dto/types';
import { measure, StatusColorConfig } from '@/theme';
import { colors } from '@/theme/colors';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

import { advanceDueText, advanceTitle } from './_utils/advanceDisplay';

const STATUS_CONFIG: Record<AdvanceStatus, StatusColorConfig> = {
    [AdvanceStatus.PENDING]: { label: 'Pendente', textColor: 'yellow100', bgColor: 'yellow20' },
    [AdvanceStatus.PARTIAL]: { label: 'Parcial', textColor: 'blue500', bgColor: 'primary20' },
    [AdvanceStatus.RETURNED]: { label: 'Devolvido', textColor: 'tertiary100', bgColor: 'tertiary20' },
    [AdvanceStatus.CANCELLED]: { label: 'Cancelado', textColor: 'gray400', bgColor: 'gray50' },
};

function AdvanceItem({ item }: { item: AdvanceResponse }) {
    const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG[AdvanceStatus.PENDING];
    const due = advanceDueText(item);
    const open = item.status === AdvanceStatus.PENDING || item.status === AdvanceStatus.PARTIAL;

    return (
        <Box p="m16" borderRadius="s12" mb="b12" borderWidth={1} borderColor="borderColor">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Box flex={1}>
                    <Text testID={`titulo-${item.id}`} fontSize={measure.m14} fontWeightPreset="semibold" numberOfLines={2}>
                        {advanceTitle(item)}
                    </Text>
                    <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                        {formatDate(item.createdAt)}
                    </Text>
                </Box>
                <Box px="x8" py="y4" borderRadius="s4" bg={config.bgColor}>
                    <Text fontSize={measure.m12} fontWeightPreset="semibold" color={config.textColor}>
                        {config.label}
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="row" justifyContent="space-between" mt="t12" pt="t12" borderTopWidth={1} borderTopColor="borderColor">
                <Box>
                    <Text fontSize={11} color="colorTextSecondary">
                        Valor total
                    </Text>
                    <Text fontSize={measure.m16} fontWeightPreset="bold">
                        {formatCurrency(item.amount)}
                    </Text>
                </Box>
                <Box alignItems="flex-end">
                    <Text fontSize={11} color="colorTextSecondary">
                        Falta devolver
                    </Text>
                    <Text fontSize={measure.m16} fontWeightPreset="bold" color={open ? 'colorTextWarning' : 'colorTextSecondary'}>
                        {formatCurrency(item.pendingAmount)}
                    </Text>
                </Box>
            </Box>

            {open && due && (
                <Box flexDirection="row" alignItems="center" mt="t12">
                    {item.isOverdue && <Ionicons name="alert-circle" size={16} color={colors.redError} />}
                    <Text testID={`vencimento-${item.id}`} ml={item.isOverdue ? 'l6' : 'l0'} fontSize={measure.m12} color={item.isOverdue ? 'colorTextError' : 'colorTextSecondary'}>
                        {item.isOverdue ? `Vencido — ${due.toLowerCase()}` : due}
                    </Text>
                </Box>
            )}
        </Box>
    );
}

export default function AdiantamentosScreen() {
    const { items, isLoading, isError, isFetchNextPageError, isFetchingNextPage, loadMore, refetch, isRefreshing } = useInfiniteAdvances();
    const { summary, isError: isSummaryError, refetch: refetchSummary } = useGetAdvancesSummary();

    const resumo = !summary ? (
        isSummaryError ? (
            <TouchableOpacityBox testID="resumo-erro" mt="t16" p="m16" borderRadius="s12" backgroundColor="gray50" onPress={() => void refetchSummary()}>
                <Text fontSize={measure.m13} color="colorTextError">
                    Não foi possível carregar o total a devolver. Toque para tentar de novo.
                </Text>
            </TouchableOpacityBox>
        ) : null
    ) : summary.count > 0 ? (
        <Box mt="t16" p="m16" borderRadius="s12">
            <Box flexDirection="row" justifyContent="space-between">
                <Box>
                    <Text fontSize={measure.m12} color="colorTextSecondary">
                        Total a devolver
                    </Text>
                    <Text testID="resumo-total" fontSize={measure.m20} fontWeight="bold" color="colorTextWarning">
                        {formatCurrency(summary.totalPending)}
                    </Text>
                </Box>
                <Box alignItems="flex-end">
                    <Text fontSize={measure.m12} color="colorTextSecondary">
                        {`${summary.count} em aberto`}
                    </Text>
                    {summary.overdueCount > 0 && (
                        <Text mt="t4" fontSize={measure.m12} color="colorTextError">
                            {`${summary.overdueCount} vencido(s)`}
                        </Text>
                    )}
                </Box>
            </Box>
        </Box>
    ) : null;

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Adiantamentos</Text>}>
            {resumo}
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AdvanceItem item={item} />}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => {
                            refetch();
                            void refetchSummary();
                        }}
                    />
                }
                onEndReached={isFetchNextPageError ? undefined : loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    isLoading ? (
                        <Box py="y32" alignItems="center">
                            <ActivityIndicator size="large" />
                        </Box>
                    ) : isError ? (
                        <Box testID="adiantamentos-erro" py="y32" alignItems="center">
                            <Text color="colorTextSecondary" textAlign="center">
                                Não foi possível carregar os adiantamentos.
                            </Text>
                            <TouchableOpacityBox mt="t16" onPress={refetch}>
                                <Text color="colorTextPrimary">Tentar novamente</Text>
                            </TouchableOpacityBox>
                        </Box>
                    ) : (
                        <Box testID="adiantamentos-vazio" py="y32" alignItems="center">
                            <Ionicons name="checkmark-circle-outline" size={48} color={colors.greenSuccess} />
                            <Text mt="t12" color="colorTextSecondary" textAlign="center">
                                Nenhum adiantamento.
                            </Text>
                        </Box>
                    )
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <Box py="y16" alignItems="center">
                            <ActivityIndicator size="small" />
                        </Box>
                    ) : isFetchNextPageError ? (
                        <TouchableOpacityBox py="y16" alignItems="center" onPress={loadMore}>
                            <Text fontSize={measure.m13} color="colorTextError">
                                Falha ao carregar mais. Toque para tentar de novo.
                            </Text>
                        </TouchableOpacityBox>
                    ) : null
                }
            />
        </ScreenBase>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --watchAll=false menu/carteira/_utils/__tests__/advanceDisplay menu/carteira/__tests__/adiantamentos`
Expected: PASS: `advanceDisplay` (4) e `adiantamentos` (3).

Run: `npx tsc --noEmit`
Expected: sem saída (os tokens `l0` e `l6` existem em `src/theme/spacing.ts`).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/menu/carteira/_utils/advanceDisplay.ts" "src/app/(auth)/(tabs)/menu/carteira/_utils/__tests__/advanceDisplay.test.ts" "src/app/(auth)/(tabs)/menu/carteira/adiantamentos.tsx" "src/app/(auth)/(tabs)/menu/carteira/__tests__/adiantamentos.test.tsx" src/domain/agility/wallet/useCase/useGetAdvances.ts
git commit -m "fix(adiantamentos): erro nao vira 'nada a devolver', rolagem acumula e mostra o vencimento

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Saldo fresco depois de concluir parada ou rota

Hoje, `KEY_WALLET` só é invalidado pelo saque e pelos dados bancários (Bug 16). Com a F2, dois gestos do motorista mexem no dinheiro:
- **concluir a rota** faz nascer a parcela de frete (`FREIGHT` bloqueado, "Frete a liberar" sobe);
- **concluir uma parada** com cobrança em dinheiro faz nascer a dívida e o `Payment` (Cobranças).

O back não emite evento de carteira por WebSocket ou push (R11). A invalidação fica, então, nos dois pontos que o app controla.

**Files:**
- Modify: `src/domain/queryKeys.ts`
- Modify: `src/domain/agility/routing/useCase/useCompleteRouting.ts`
- Test: `src/domain/__tests__/routeStopQueryKeys.test.ts` (acrescenta 1 teste)
- Test: `src/domain/agility/routing/useCase/__tests__/useCompleteRouting.test.tsx`

**Interfaces:**
- Produces:
  - `moneyChangedKeys(): unknown[][]`, que devolve `[[KEY_WALLET], [KEY_FINANCE]]`
  - `routeStopChangedKeys(rotaId, serviceId?)`, que passa a incluir as chaves de dinheiro
  - `useCompleteRouting(options)`, que invalida as chaves de dinheiro no sucesso antes de chamar `options.onSuccess`

- [ ] **Step 1: Write the failing tests**

Em `src/domain/__tests__/routeStopQueryKeys.test.ts`:

1. Troque o import por:

```ts
import { KEY_FINANCE, KEY_ROUTINGS, KEY_SERVICES, KEY_WALLET, routeStopChangedKeys } from '../queryKeys'
```

2. Acrescente, dentro do `describe('invalidação após mudança de status de parada', ...)`:

```ts
    it('invalida o dinheiro do motorista: carteira e cobranças (parada com cobrança em dinheiro vira dívida)', () => {
        const queryClient = new QueryClient()
        queryClient.setQueryData([KEY_WALLET, 'balance'], {})
        queryClient.setQueryData([KEY_WALLET, 'advances', 'summary'], {})
        queryClient.setQueryData([KEY_FINANCE, 'payments', 'infinite', { startDate: '2026-09-01' }], {})

        for (const queryKey of routeStopChangedKeys(ROTA_ID, SERVICE_ID)) {
            void queryClient.invalidateQueries({ queryKey })
        }

        expect(queryClient.getQueryState([KEY_WALLET, 'balance'])?.isInvalidated).toBe(true)
        expect(queryClient.getQueryState([KEY_WALLET, 'advances', 'summary'])?.isInvalidated).toBe(true)
        expect(queryClient.getQueryState([KEY_FINANCE, 'payments', 'infinite', { startDate: '2026-09-01' }])?.isInvalidated).toBe(true)
    })
```

```tsx
// src/domain/agility/routing/useCase/__tests__/useCompleteRouting.test.tsx
/**
 * Concluir a rota faz nascer a parcela de frete (F2): "Frete a liberar" e o extrato mudam.
 * O hook invalida as chaves de dinheiro ANTES do onSuccess de quem chama (que costuma
 * navegar para a home).
 */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_FINANCE, KEY_WALLET } from '@/domain/queryKeys';

import { useCompleteRouting } from '../useCompleteRouting';

// O hook só repassa a config ao useMutationService; o teste captura o onSuccess.
let mockConfig: { onSuccess?: (data: unknown) => unknown } = {};
jest.mock('@/api', () => ({
    useMutationService: (config: { onSuccess?: (data: unknown) => unknown }) => {
        mockConfig = config;
        return { mutate: jest.fn(), isLoading: false, isSuccess: false, isError: false };
    },
}));
jest.mock('../../routingService', () => ({ routingService: { complete: jest.fn() } }));

it('no sucesso, invalida carteira e cobranças e depois chama o onSuccess de quem chamou', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    queryClient.setQueryData([KEY_WALLET, 'balance'], {});
    queryClient.setQueryData([KEY_FINANCE, 'payments', 'infinite', { startDate: '2026-09-01' }], {});
    const onSuccess = jest.fn(() => {
        expect(queryClient.getQueryState([KEY_WALLET, 'balance'])?.isInvalidated).toBe(true);
    });

    function Probe() {
        useCompleteRouting({ onSuccess });
        return null;
    }
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });

    await act(async () => {
        await mockConfig.onSuccess?.({ success: true });
    });

    expect(onSuccess).toHaveBeenCalledWith({ success: true });
    expect(queryClient.getQueryState([KEY_FINANCE, 'payments', 'infinite', { startDate: '2026-09-01' }])?.isInvalidated).toBe(true);

    act(() => tree.unmount());
    queryClient.clear();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --watchAll=false domain/__tests__/routeStopQueryKeys routing/useCase/__tests__/useCompleteRouting`
Expected: FAIL:
- `routeStopQueryKeys`: "invalida o dinheiro..." espera `true` e recebe `false`.
- `useCompleteRouting`: `onSuccess` é chamado, mas a asserção interna (`isInvalidated`) falha.

- [ ] **Step 3: Write the implementation**

Em `src/domain/queryKeys.ts`, acrescente **antes** de `routeStopChangedKeys`:

```ts
/**
 * Chaves do dinheiro do motorista. Concluir uma parada com cobrança em dinheiro cria a
 * dívida e o pagamento; concluir a rota cria a parcela de frete (F2). O back não emite
 * evento de carteira por WebSocket/push, então quem conclui invalida. Invalidar só refaz
 * o que tem observador ativo; o resto refaz ao abrir a tela.
 */
export function moneyChangedKeys(): unknown[][] {
    return [[KEY_WALLET], [KEY_FINANCE]]
}
```

No `return` de `routeStopChangedKeys`, acrescente como últimos elementos:

```ts
        // Parada concluída com cobrança em dinheiro: dívida (carteira) e pagamento
        // (cobranças) nascem no mesmo evento.
        ...moneyChangedKeys(),
```

Substitua **todo** o conteúdo de `src/domain/agility/routing/useCase/useCompleteRouting.ts` por:

```ts
import { useQueryClient } from '@tanstack/react-query'

import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import { moneyChangedKeys } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import type { RoutingResponse } from '../dto'
import { routingService } from '../routingService'

export function useCompleteRouting(options?: MutationOptions<BaseResponse<RoutingResponse>>) {
    const queryClient = useQueryClient()

    const mutation = useMutationService<RoutingResponse, Id>({
        action: (id: Id) => routingService.complete(id),
        onSuccess: async (data) => {
            // A conclusão da rota cria a parcela de frete (F2): saldo, "Frete a liberar" e
            // extrato mudam. Invalida antes do onSuccess de quem chama, que costuma navegar.
            for (const queryKey of moneyChangedKeys()) {
                void queryClient.invalidateQueries({ queryKey })
            }
            await options?.onSuccess?.(data)
        },
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        completeRouting: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}
```

Os três chamadores de `useCompleteRouting` passam `onSuccess` próprio (verificado em `useRouteActions.ts:240`, `parada/[pid]/index.tsx:316` e `retorno/index.tsx:91`). Por isso o `onSuccess` sempre definido não apaga o toast padrão do `useMutationService` de ninguém.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --watchAll=false domain/__tests__ routing/useCase/__tests__/useCompleteRouting`
Expected: PASS (inclui `queryKeys.test.ts` e os testes antigos de `routeStopQueryKeys`).

Run: `npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add src/domain/queryKeys.ts src/domain/__tests__/routeStopQueryKeys.test.ts src/domain/agility/routing/useCase/useCompleteRouting.ts src/domain/agility/routing/useCase/__tests__/useCompleteRouting.test.tsx
git commit -m "fix(carteira): saldo e cobrancas atualizam ao concluir parada ou rota

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Remover o código morto de operador

`useCreatePayment`, `useUpdatePayment` e `useRemovePayment` chamam `POST/PATCH/DELETE /finance/payments`, que no back são restritos a `COLLABORATOR_ADMIN/MANAGER/SUPERVISOR` (`finance.controller.ts:41,144,158`) e dão **403** para o motorista. `useGetDriverSummary`, `useGetPayment`, `useFinancialSummary` e `walletAPI.getSummary` não têm uso e somariam errado (Bug 17). Depois das Tasks 7 e 8, o `useGetPayments` também fica sem uso. Tirar tudo isso evita que alguém reaproveite um hook que o back recusa.

**Files:**
- Delete: `src/domain/agility/finance/useCase/useCreatePayment.ts`, `useUpdatePayment.ts`, `useRemovePayment.ts`, `useGetPayment.ts`, `useGetDriverSummary.ts` e `useGetPayments.ts`
- Delete: `src/domain/agility/finance/financeService.ts`
- Delete: `src/domain/agility/finance/dto/request/create-payment.request.ts`, `src/domain/agility/finance/dto/request/update-payment.request.ts` e `src/domain/agility/finance/dto/types.ts` (este último não é exportado nem importado)
- Rewrite: `src/domain/agility/finance/financeAPI.ts` (fica só `findAll`)
- Modify: `src/domain/agility/finance/useCase/index.ts`, `src/domain/agility/finance/dto/index.ts` e `src/domain/agility/finance/dto/response/payment.response.ts` (sai `DriverSummaryItem`)
- Delete: `src/domain/agility/wallet/useCase/useFinancialSummary.ts`
- Modify: `src/domain/agility/wallet/useCase/index.ts`, `src/domain/agility/wallet/walletAPI.ts` (sai `getSummary`), `src/domain/agility/wallet/dto/response/wallet.response.ts` (sai `WalletSummaryResponse`) e `src/domain/agility/wallet/dto/request/wallet.request.ts` (saem `CreateAdvanceRequest` e `ReturnAdvanceRequest`, gestos do operador)

**Interfaces:**
- Consumes: `useInfinitePayments` (Task 8), que é o único consumidor restante do `financeAPI`.
- Produces: `financeAPI = { findAll }`.

- [ ] **Step 1: Medir os usos antes (o "teste vermelho" desta task)**

Run: `git grep -nE "useCreatePayment|useUpdatePayment|useRemovePayment|useGetPayment\b|useGetPayments|useGetDriverSummary|useFinancialSummary|financeService|WalletSummaryResponse|getSummary\(\)|CreateAdvanceRequest|ReturnAdvanceRequest|DriverSummaryItem" -- src`
Expected: só as próprias definições, os barrels e `useFinancialSummary.ts` (que importa `useGetPayments`). **Nenhuma tela.** Se alguma tela aparecer, pare e reporte: alguma task anterior deixou uso.

- [ ] **Step 2: Apagar e ajustar**

Apague os arquivos listados em **Files**. Depois:

`src/domain/agility/finance/useCase/index.ts` fica:

```ts
export * from './useInfinitePayments';
```

`src/domain/agility/finance/dto/index.ts` fica:

```ts
export * from './response/payment.response';
export * from './request/list-payments.request';
```

Em `src/domain/agility/finance/dto/response/payment.response.ts`, apague a interface `DriverSummaryItem` inteira.

Substitua **todo** o conteúdo de `src/domain/agility/finance/financeAPI.ts` por:

```ts
import { BaseResponse } from '@/api';
import { apiAgility } from '@/api/apiConfig';

import type { ListPaymentsRequest, PaginatedPaymentsResponse, PaymentResponse } from './dto';

/**
 * Só a leitura do motorista (`GET /finance/payments`, `driverId` forçado pelo token).
 * Criar, editar e remover pagamento é gesto do operador (`@Roles('COLLABORATOR_ADMIN'...)`
 * no back): os hooks que chamavam esses endpoints davam 403 no app e saíram na F5.
 */
async function findAll(
    params: ListPaymentsRequest = {},
): Promise<BaseResponse<PaymentResponse[] | PaginatedPaymentsResponse<PaymentResponse>>> {
    const { data } = await apiAgility.get<BaseResponse<PaymentResponse[] | PaginatedPaymentsResponse<PaymentResponse>>>('/finance/payments', {
        params: {
            ...(params.routingId && { routingId: params.routingId }),
            ...(params.serviceId && { serviceId: params.serviceId }),
            ...(params.status && { status: params.status }),
            ...(params.startDate && { startDate: params.startDate }),
            ...(params.endDate && { endDate: params.endDate }),
            ...(params.page && { page: params.page }),
            ...(params.limit && { limit: params.limit }),
        },
    });
    return data;
}

export const financeAPI = {
    findAll,
};
```

(`driverId` e `customerId` saíram dos params: o back ignora o `driverId` do motorista e usa o do token.)

Em `src/domain/agility/wallet/useCase/index.ts`, apague a linha `export * from './useFinancialSummary';`.

Em `src/domain/agility/wallet/walletAPI.ts`:
- apague o método `getSummary` inteiro;
- apague `WalletSummaryResponse` da lista de imports.

Em `src/domain/agility/wallet/dto/response/wallet.response.ts`, apague a interface `WalletSummaryResponse`.

Em `src/domain/agility/wallet/dto/request/wallet.request.ts`:
- apague `CreateAdvanceRequest` e `ReturnAdvanceRequest`;
- troque o import por `import { PixKeyType } from '../types';`.

- [ ] **Step 3: Medir os usos depois**

Run: `git grep -nE "useCreatePayment|useUpdatePayment|useRemovePayment|useGetPayment\b|useGetPayments|useGetDriverSummary|useFinancialSummary|financeService|WalletSummaryResponse|getSummary\(\)|CreateAdvanceRequest|ReturnAdvanceRequest|DriverSummaryItem|UBERIZATION" -- src`
Expected: saída vazia. O `getSummary` de `routingAPI`/`routingService` recebe `id`, então não casa com `getSummary\(\)`. Se casar, confira que é o de rota e siga.

Run: `npx tsc --noEmit`
Expected: sem saída.

Run: `npx jest --watchAll=false domain/agility/finance domain/agility/wallet menu/ganhos menu/carteira`
Expected: PASS em todos.

- [ ] **Step 4: Commit**

```bash
git add -A src/domain/agility/finance src/domain/agility/wallet
git commit -m "chore(financeiro): remove hooks de operador que davam 403 e resumos sem uso

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Verificação final e PR

- [ ] **Step 1: Suítes tocadas, tipos e lint**

```bash
npx jest --watchAll=false menu/carteira menu/ganhos domain/hooks domain/agility/wallet domain/agility/finance domain/__tests__ routing/useCase hooks/__tests__ utils/__tests__
npx tsc --noEmit
npx eslint "src/app/(auth)/(tabs)/menu/carteira" "src/app/(auth)/(tabs)/menu/ganhos" src/domain/agility/wallet src/domain/agility/finance src/domain/hooks src/hooks/useSubmitLock.ts src/domain/queryKeys.ts src/domain/agility/routing/useCase/useCompleteRouting.ts src/utils/validatePix.ts
```

Expected: jest verde, `tsc` sem saída e eslint com `0 errors`. Os 6 warnings de origem já saíram: `isError`/`error` sem uso no extrato e no saque, e `usePagination` no `useGetPayments` apagado.

- [ ] **Step 2: Suíte inteira**

Run: `npx jest --watchAll=false`
Expected: verde. Se algo falhar fora dos caminhos do Step 1, prove que a falha já existe em `origin/main` antes de chamá-la de pré-existente: rode o mesmo teste num worktree limpo de `origin/main`. Não use `git stash` nem `git checkout origin/main -- <arquivo>` neste worktree.

- [ ] **Step 3: Mutação nos cinco pontos do Review Focus**

Os arquivos já estão commitados, então `git checkout -- <arquivo>` desfaz a mutação. Para cada linha abaixo: aplique a mutação com a ferramenta Edit, rode o teste indicado, **confirme que FALHA**, e reverta com `git checkout -- <arquivo>`.

| # | Mutação | Teste que precisa falhar |
|---|---|---|
| 1 | Em `useRequestWithdrawal.ts`, devolver `requestWithdrawal: mutate` (e desestruturar `mutate`) | `menu/carteira/__tests__/saque` ("back recusa") e `walletMutations` |
| 2 | Em `useSubmitLock.ts`, apagar a linha `if (lockRef.current) return undefined;` | `menu/carteira/__tests__/saque` ("dois toques") e `hooks/__tests__/useSubmitLock` |
| 3 | Em `bankInfoForm.ts`, `orNull` devolver `undefined` em vez de `null` | `menu/carteira/__tests__/dados-bancarios` ("apagar banco...") e `bankInfoForm` |
| 4 | Em `freightEarnings.ts`, tirar a subtração do estorno no `.map` | `wallet/__tests__/freightEarnings` ("parcela CANCELADA") |
| 5 | Em `paymentDisplay.ts`, `debtCardState` devolver `{ kind: 'none' }` quando `!summary` | `menu/ganhos/_utils/__tests__/paymentDisplay` ("erro sem dado") |

Se algum teste passar verde com a mutação, ele não cobre o que diz. Corrija o teste antes de seguir.

- [ ] **Step 4: Conferência no aparelho (dev com a F2 no ar)**

Com o dev client apontando para o `dev` e a F2 do back já deployada, logue com um motorista que tenha carteira e confira:
1. **Carteira:** a soma dos quatro números fecha (disponível + frete a liberar + saque pendente = total).
2. **Extrato:** um frete liberado aparece sem sinal. Um saque pedido gera "Saque solicitado" sem sinal, e depois de pago aparece "Saque pago −".
3. **Saque:**
   - valor acima do disponível, forçado no back (por exemplo, pedir de dois aparelhos): a frase do back aparece;
   - com sucesso, o app cai em Meus saques com o pedido "Aguardando pagamento".
4. **Dados bancários:** apague a conta, salve e reabra a tela: a conta continua vazia.
5. **Ganhos e Cobranças** abrem sem erro no período "Mês".

Se o aparelho não estiver disponível, escreva na PR, em linha própria: **"não validado no aparelho"**.

- [ ] **Step 5: `graphify update .`**, se existir no PATH.

- [ ] **Step 6: Push e PR contra `main`**

```bash
export GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never
timeout 120 git push -q https://DanielASantos-dev@github.com/consultoriaroteirizador-lab/agility-app.git HEAD:refs/heads/feat/financeiro-f5
```

Abra a PR `feat/financeiro-f5` → `main` (GitHub MCP `create_pull_request` ou `gh pr create --base main`). O corpo deve conter:
- **o que muda para o motorista:** extrato com sinal pela direção e selo; carteira com os quatro saldos; Ganhos pela carteira; Cobranças separadas; Meus saques; saque e dados bancários sem sucesso falso nem envio duplo;
- **ordem de deploy:** o build do app **só depois** da F2 do back em cada ambiente (os campos `direction`, `affectsBalance` e `freightPendingBalance` não existem antes);
- **o que ficou para o back:** desempate por `id` no `orderBy` de `/wallet/transactions` e `/wallet/withdrawals` (R13), `type` como lista no filtro (R2), `paymentMethod` no `PaymentResponseDto` (R5) e um agregado de ganhos por período (R4);
- a tabela de Rulings deste plano (R1–R13), resumida;
- a linha do Step 4 (validado ou "não validado no aparelho");
- no fim: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Fora desta fase

- **F3:**
  - política de saque com dívida (`withdrawalWithDebtPolicy`): o saque já mostra a mensagem do back, e quando a F3 recusar o app exibe a frase sem mudança;
  - `cashReturnDueDays`: o vencimento já vem pronto do back;
  - divisão da parcela por motorista (UC10);
  - cancelamento de dívida (UC15).
- **Back (anotado na PR):** desempate por `id` na ordenação, `type` como lista, `paymentMethod` na resposta de pagamentos e agregado de ganhos por período.
- **Operador:** nenhuma tela de operador muda aqui (é a F4, na plataforma).
