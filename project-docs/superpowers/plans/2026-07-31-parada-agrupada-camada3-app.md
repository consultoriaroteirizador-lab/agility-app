# Camada 3 — App: chave canônica e chegada na porta

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development ou superpowers:executing-plans.

**Goal:** Alinhar o agrupamento do app à chave canônica da Camada 1 e mover a chegada para o nível da PARADA, com cada nota entrando em atendimento ao ser aberta.

**Spec:** `agility-services/project-docs/superpowers/specs/2026-07-31-parada-agrupada-camada3-execucao-design.md`

**Branch:** continuar em `feat/parada-agrupada-app` (PR #22, ainda não mergeada) — esta camada conserta o que ela entregou.

---

## Global Constraints

- **A Task A2 só pode ser DEPLOYADA depois do gate do backend** (plano `...-camada3-backend.md`). Antes disso o app volta a prometer o que o servidor recusa — que é o estado de hoje. Implementar e mergear pode; deployar sem o backend, não.
- **A ordem interna importa:** a chave canônica (A1) entra antes do fluxo (A2). Invertido, o fluxo agruparia por um critério que o gate — já corrigido — não reconhece.
- **A chave canônica é do backend.** O app espelha `stopKeyOf` de `agility-services/src/optimization/constants/stop-grouping.ts`. O app NÃO tem opinião própria sobre o que é uma parada. Qualquer degrau a mais na cascata de cliente é regressão.
- Baseline: `npx tsc --noEmit` exit 0; `npx jest --ci` 16 suítes / 193 testes. Nunca `npm test` (é `--watchAll`).
- Antes de cada commit: `npx tsc --noEmit && npx jest --ci`, encadeados.
- **Prova por mutação** na paridade da chave: backup, MD5, mutação, VERMELHO, restaura por cópia, MD5 confere. Nunca `git checkout --`.
- Teste pré-existente vermelho: **ler antes**. Vários testes da Camada 2 congelam a chave ANTIGA e vão falhar legitimamente — reescreva registrando o motivo, nunca apague para chegar ao verde.
- O fluxo de entrega por nota (foto, canhoto, checklist, código, insucesso) fica **intocado**.
- Nunca `Read` em `graphify-out/graph.json`.

---

### Task 1: `stopKeyOf` espelha a chave canônica

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/stopGrouping.ts`
- Test: `.../_utils/__tests__/stopGrouping.test.ts`
- Test: `.../_utils/__tests__/paradaAgrupada.test.ts` (os casos que assumem a chave antiga)

**Interfaces:**
- `StopKeyInput` ganha `taxNumber?: string | null` e perde a dependência de `fantasyName`/`responsible` na chave (os campos continuam no tipo se outros pontos os usarem para exibição).
- `stopKeyOf` e `mapPointStopKeyOf` mantêm assinatura.

A chave canônica, transcrita do backend:

```
`${addressId ?? 'sem-endereco:<id>'}|${customerId ?? taxNumber ?? 'sem-cliente'}|${sentido}`
sentido: PICKUP → 'P' | TRANSFER → 'T' | qualquer outro → 'D'
```

Regras que o app hoje inverte e precisa passar a obedecer:
1. **Sem cliente identificado agrupa por endereço** (hoje devolve chave própria).
2. **A cascata para em `taxNumber`** — `fantasyName`/`responsible` saem da chave.
3. **Sentido, não `serviceType` cru** — DELIVERY e SERVICE agrupam juntos; PICKUP e TRANSFER não.
4. TRANSFER e RETURN continuam em chave própria (no canônico isso vem via `addressId: undefined`).

- [ ] **Step 1: Escrever os testes que falham** — incluindo um bloco de **paridade** com casos copiados do spec do backend (`stop-grouping.spec.ts`): mesmos dados de entrada, mesma chave esperada. É esse bloco que impede a divergência de voltar.
- [ ] **Step 2: Rodar e ver falhar** — `npx jest --ci stopGrouping`.
- [ ] **Step 3: Implementar** a chave canônica em `stopKeyOf`, com o comentário explicando que a fonte é o backend e por que a cascata para em `taxNumber`.
- [ ] **Step 4: Simplificar `mapPointStopKeyOf`** — com anônimo agrupando por endereço, o pino não precisa mais de `title`: passa a ser `addressId` + sentido, e cai em chave própria sem `addressId`. Some a fragilidade do texto livre apontada no review da Camada 2.
- [ ] **Step 5: Consertar os testes da Camada 2 que congelam a chave antiga** — em `paradaAgrupada.test.ts`, os casos "2 clientes no mesmo endereço → 2 paradas" e "tipos diferentes não agrupam" mudam de resultado quando o cliente é anônimo. Reescreva com `customerId`/`taxNumber` REAIS (que é o cenário do produto) e registre no comentário por que o caso anônimo agora funde.
- [ ] **Step 6: Mutação** — remover o degrau `taxNumber` da cascata deixa o teste de paridade vermelho. Restaurar por cópia, MD5 confere.
- [ ] **Step 7: Verificar e commitar** — `npx tsc --noEmit && npx jest --ci`.

---

### Task 2: chegada na porta, notas depois

**Files:**
- Modify: `.../parada/[pid]/index.tsx`
- Modify: `.../parada/[pid]/_context/ParadaContext.tsx`
- Test: `.../_utils/__tests__/paradaDisplay.test.ts` (derivações puras da nova tela)

**Interfaces:**
- Produces: `resolveParadaAtendida(pedidos: ServiceResponse[]): boolean` em `_utils` — a parada está atendida quando QUALQUER nota está em atendimento ou além (terminal conta). Pura e testada; é o que substitui o gate por serviço.

- [ ] **Step 1: Escrever os testes da derivação** — `resolveParadaAtendida`: nenhuma nota iniciada → false; uma em atendimento → true; uma concluída e o resto pendente → true; lista vazia → false.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar `resolveParadaAtendida`** e exportar no barrel.
- [ ] **Step 4: A tela da parada ganha a chegada.** Em `parada/[pid]/index.tsx`, no ramo `isParadaAgrupada`: enquanto `!resolveParadaAtendida(pedidosDaParada)`, renderizar o bloco de chegada ("Indo pra lá" / "Estou aqui!") no lugar da lista de notas — reusando `useStopActions` como `EtapaInicial` faz, e respeitando `startBlockReason` (o gate continua valendo entre PORTAS). Depois da chegada, a lista de notas aparece.
- [ ] **Step 5: Abrir uma nota entra em atendimento.** No `onOpen` do card: se a nota ainda não está em atendimento, disparar `start-attendance` dela antes de navegar. É o que o dono do produto pediu — a nota muda de estado conforme o motorista confere.
- [ ] **Step 6: O fluxo por nota não pede chegada de novo.** Em `ParadaContext`, `isServiceStarted` passa a considerar a PARADA atendida, não só o serviço. Assim `entrega/index.tsx:105` (`etapa === 1 && !isServiceStarted`) para de cair em `EtapaInicial` na segunda nota. **Cuidado:** o contexto hoje só conhece o serviço corrente e a lista da rota (`routeServices`) — derive a parada com `resolvePedidosDaParada`, a mesma função da tela.
- [ ] **Step 7: Verificar** — `npx tsc --noEmit && npx jest --ci`. Verificação manual (não afirmar sem rodar): a parada de 1 nota continua idêntica; a agrupada pede chegada uma vez só; abrir a nota 2 não repete "Estou aqui".
- [ ] **Step 8: Commitar.**

---

### Task 3: prova ponta a ponta

- [ ] **Step 1:** Com o gate do backend deployado no dev, rodar na rota `E3EHCR2` (Teste Aragao): chegar na porta da CRISTIANA e entregar as DUAS notas, sem 400.
- [ ] **Step 2:** Conferir a contagem nova de paradas da rota (com a chave canônica, os anônimos do endereço `e0f705da` fundem — o número muda em relação ao da Camada 2, e o número novo é o correto).
- [ ] **Step 3:** Atualizar o PR #22 com o resultado e remover o aviso de "execução bloqueada no servidor".
