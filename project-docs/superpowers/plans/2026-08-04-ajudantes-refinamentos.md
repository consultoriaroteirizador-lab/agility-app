# Ajudantes: ícones, recolhível e lista de rotas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Goal:** O motorista vê os ajudantes já na lista de rotas, num bloco recolhível que nasce fechado, com contato por ícone em vez de texto.

**Architecture:** O bloco de ajudantes vira um componente compartilhado e recolhível, usado no detalhe da rota e no card da lista. Para o card ter o dado, o `GET /routings/my-routings` passa a devolver `helpers` por rota, resolvidos numa query em lote — não N+1.

**Tech Stack:** Backend NestJS + Prisma + Jest. App React Native + Expo Router + Restyle + `@expo/vector-icons`.

**Spec:** `project-docs/superpowers/specs/2026-08-04-ajudantes-refinamentos-design.md`

## Global Constraints

- **As duas branches são ENCADEADAS sobre a entrega anterior, que ainda NÃO está mergeada.**
  - Backend: criar a partir de `feat/equipe-contato-roster-me` (PR `agility-services#453`), **não** de `development`.
  - App: criar a partir de `feat/equipe-e-ajudantes-no-app` (PR `agility-app#28`), **não** de `main`.
  - Consequência de deploy: estas PRs só podem mergear **depois** das anteriores. As PRs deste time são mergeadas por **squash**, o que faz a merge-base enganar — ao conferir se algo chegou ao destino, leia o **arquivo** no branch de destino, nunca o selo "merged".
- **Sem migration.**
- **Ordem: backend primeiro.** Sem ele, `helpers` vem ausente e o bloco não aparece no card — degradação limpa, sem mensagem falsa.
- O motorista **vê e contata**; não escala ninguém. Nada de escrita nesta entrega.
- Comentários em português; mensagens de commit **sem acento**.
- lab-app: `npx tsc --noEmit`, `npm run lint` (~121 warnings pré-existentes são normais — o que importa é zero **erros** e nenhum warning novo nos arquivos tocados), testes com `npx jest <caminho> --watchAll=false` (o `npm test` roda em watch, não use). Há hook de pre-commit (husky) rodando lint.
- agility-services: `npm test -- <caminho>`, `npm run build`. Indentação de 4 espaços.

---

# BLOCO A — Backend (`agility-services`)

Branch: `feat/ajudantes-na-lista-de-rotas`, criada **a partir de `feat/equipe-contato-roster-me`**.

### Task 1: `helpers` no `GET /routings/my-routings`, em lote

**Files:**
- Modify: `src/routing/service/routing.service.ts` (novo método em lote; `getRoutingHelpers` passa a delegar)
- Modify: `src/routing/controller/routing.controller.ts:484-507` (handler `findMyRoutings`)
- Test: `src/routing/service/routing.service.spec.ts`

**Interfaces:**
- Consumes: `resolvePersonName`, `resolvePersonPhone` de `src/shared/person-display.util.ts` (entrega anterior).
- Produces:

  ```ts
  type RoutingHelperDto = {
      id: string
      collaboratorId: string | null
      providerId: string | null
      helperName: string | null
      helperPhone: string | null
  }

  // Uma query para todas as rotas. SEMPRE devolve uma entrada por id recebido —
  // `{ helpers: [] }` quando a rota não tem ajudante.
  getHelpersByRoutingId(routingIds: string[]): Promise<Map<string, { helpers: RoutingHelperDto[] }>>
  ```

  **Recebe ids, não entidades** — diferente de `getAssigneesByRoutingId`, que recebe
  `RoutingEntity[]`. O motivo é o outro chamador: `getRoutingHelpers(id)` delega a este
  método, e com entidades ele precisaria fabricar uma entidade falsa só para carregar um id.
  O controller faz o `.map(r => r.id()!)`, que é trivial.

  O app (Task 4) lê `helpers` de cada item da lista.

**Contexto que evita retrabalho:**

- O padrão de "mapper + spread de mapas em lote" **já existe** neste controller: `getAssigneesByRoutingId` e `getListBadgesByRoutingId`, usados em `/routings/paginated` (`routing.controller.ts:305-335`). Siga o mesmo formato — inclusive o nome no plural terminando em `ByRoutingId`.
- `getRoutingHelpers(id)` continua existindo (é o contrato de `GET /routings/:id/helpers` e do `findByIdFull`), mas passa a **delegar** ao método novo. Não copie a resolução de nome/telefone: ela acabou de ser unificada num util na entrega anterior, e uma segunda cópia reabriria exatamente a duplicação que aquele trabalho fechou.
- **Privacidade:** `my-routings` é `@Roles('COLLABORATOR_DRIVER')` e resolve o motorista pelo `sub` do JWT, devolvendo só as rotas dele. O telefone circula num escopo **menor** que o do `GET /routings/:id`. Não é preciso gate novo.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `src/routing/service/routing.service.spec.ts`, seguindo o estilo de mocks que o arquivo já usa para `routingHelper.findMany`:

```ts
describe('getHelpersByRoutingId', () => {
    it('resolve ajudantes de varias rotas em UMA query', async () => {
        prismaService.client.routingHelper.findMany.mockResolvedValue([
            {
                id: 'rh-1', routingId: 'rot-1', helperId: 'col-1', providerId: null,
                helper: { firstName: 'Ana', lastName: 'Souza', email: null, phone: '11988887777' },
                provider: null,
            },
            {
                id: 'rh-2', routingId: 'rot-2', helperId: null, providerId: 'prov-1',
                helper: null,
                provider: {
                    personType: 'PJ', tradeName: 'Transportes XPTO', companyName: null,
                    firstName: null, lastName: null, email: 'xpto@x.com', phone: '11977776666',
                },
            },
        ]);

        const mapa = await service.getHelpersByRoutingId(['rot-1', 'rot-2']);

        expect(prismaService.client.routingHelper.findMany).toHaveBeenCalledTimes(1);
        expect(mapa.get('rot-1')!.helpers[0].helperName).toBe('Ana Souza');
        expect(mapa.get('rot-1')!.helpers[0].helperPhone).toBe('11988887777');
        expect(mapa.get('rot-2')!.helpers[0].helperName).toBe('Transportes XPTO');
    });

    // O bug que este teste existe para impedir: sem entrada no Map, o spread do
    // controller (`...mapa.get(id)`) nao acrescenta nada e `helpers` fica AUSENTE.
    // O app trata ausencia como "backend antigo" e esconderia o bloco tambem nas
    // rotas que TEM ajudante. Lista vazia e presenca; ausencia e outra coisa.
    it('devolve entrada com lista VAZIA para rota sem ajudante, nunca ausencia', async () => {
        prismaService.client.routingHelper.findMany.mockResolvedValue([]);

        const mapa = await service.getHelpersByRoutingId(['rot-9']);

        expect(mapa.has('rot-9')).toBe(true);
        expect(mapa.get('rot-9')).toEqual({ helpers: [] });
    });

    it('nao consulta o banco quando a lista de rotas e vazia', async () => {
        const mapa = await service.getHelpersByRoutingId([]);

        expect(prismaService.client.routingHelper.findMany).not.toHaveBeenCalled();
        expect(mapa.size).toBe(0);
    });
});

describe('getRoutingHelpers (delegando ao metodo em lote)', () => {
    it('devolve o mesmo formato de antes para uma rota', async () => {
        prismaService.client.routingHelper.findMany.mockResolvedValue([
            {
                id: 'rh-1', routingId: 'rot-1', helperId: 'col-1', providerId: null,
                helper: { firstName: 'Ana', lastName: 'Souza', email: null, phone: '11988887777' },
                provider: null,
            },
        ]);

        const helpers = await service.getRoutingHelpers('rot-1');

        expect(helpers).toEqual([
            { id: 'rh-1', collaboratorId: 'col-1', providerId: null,
              helperName: 'Ana Souza', helperPhone: '11988887777' },
        ]);
    });

    it('devolve lista vazia quando a rota nao tem ajudante', async () => {
        prismaService.client.routingHelper.findMany.mockResolvedValue([]);

        await expect(service.getRoutingHelpers('rot-9')).resolves.toEqual([]);
    });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
npm test -- src/routing/service/routing.service.spec.ts -t getHelpersByRoutingId
```

Esperado: FAIL — `service.getHelpersByRoutingId is not a function`.

- [ ] **Step 3: Implementar o método em lote e a delegação**

Em `src/routing/service/routing.service.ts`, substitua o corpo de `getRoutingHelpers` e acrescente o método novo acima dele:

```ts
    /**
     * Ajudantes de VÁRIAS rotas numa query só.
     *
     * Existe para a listagem do app do motorista (`GET /routings/my-routings`)
     * mostrar a tripulação sem abrir cada rota — buscar por rota ali seria N+1.
     * Mesmo formato de `getAssigneesByRoutingId`/`getListBadgesByRoutingId`, que
     * o `/routings/paginated` já consome.
     *
     * SEMPRE devolve uma entrada por id recebido, com `helpers: []` quando a rota
     * não tem ajudante. Isso não é zelo: o chamador faz `...mapa.get(id)` e, sem
     * a entrada, o spread não acrescenta nada — `helpers` sairia AUSENTE do
     * payload, que é como o app identifica "backend antigo".
     */
    async getHelpersByRoutingId(
        routingIds: string[],
    ): Promise<Map<string, { helpers: RoutingHelperDto[] }>> {
        const mapa = new Map<string, { helpers: RoutingHelperDto[] }>();
        const ids = routingIds.filter(Boolean);
        if (ids.length === 0) return mapa;

        // Toda rota pedida nasce com lista vazia; as linhas encontradas preenchem.
        for (const id of ids) {
            mapa.set(id, { helpers: [] });
        }

        const companyId = this.getCompanyId();
        const rows = await this.prismaService.client.routingHelper.findMany({
            where: { routingId: { in: ids }, companyId },
            // `include` de modelo inteiro: `phone` já vem daqui, sem select novo.
            include: { helper: true, provider: true },
            orderBy: { createdAt: 'asc' },
        });

        for (const r of rows) {
            // Nome e telefone pelo util compartilhado — a definição única.
            const pessoa = { collaborator: r.helper, provider: r.provider, fallbackId: r.helperId };
            mapa.get(r.routingId)?.helpers.push({
                id: r.id,
                collaboratorId: r.helperId,
                providerId: r.providerId,
                helperName: resolvePersonName(pessoa),
                helperPhone: resolvePersonPhone(pessoa),
            });
        }

        return mapa;
    }

    /** Lista os ajudantes de UMA rota. Caso particular do método em lote. */
    async getRoutingHelpers(routingId: string): Promise<RoutingHelperDto[]> {
        const mapa = await this.getHelpersByRoutingId([routingId]);
        return mapa.get(routingId)?.helpers ?? [];
    }
```

Declare o tipo perto do topo do arquivo, junto dos demais tipos locais:

```ts
/** Ajudante da viagem, com nome e telefone já resolvidos. */
type RoutingHelperDto = {
    id: string;
    collaboratorId: string | null;
    providerId: string | null;
    helperName: string | null;
    helperPhone: string | null;
};
```

Troque as assinaturas de `addRoutingHelper` e `removeRoutingHelper` para usarem `RoutingHelperDto[]` no retorno (elas já declaram o shape inteiro inline; o alias evita a terceira cópia).

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
npm test -- src/routing/service/routing.service.spec.ts
npm run build
```

Esperado: PASS e build limpo. Testes existentes de `getRoutingHelpers` continuam verdes — o formato não mudou.

- [ ] **Step 5: Enriquecer o handler de `my-routings`**

Em `src/routing/controller/routing.controller.ts`, no `findMyRoutings`, troque o retorno:

```ts
        // 2. Buscar routings pelo driverId (com filtro de status no DB se fornecido)
        const routings = await this.routingService.findByDriverIdAndStatus(driver.id()!, status);

        // 3. Ajudantes da viagem, em lote — o app mostra a tripulação já na
        // listagem, antes de o motorista abrir a rota. Mesmo padrão de
        // `getAssigneesByRoutingId`/`getListBadgesByRoutingId` no /paginated.
        // Escopo: este endpoint devolve SÓ as rotas do motorista logado, então o
        // telefone circula mais estreito aqui do que no GET /routings/:id.
        const helpers = await this.routingService.getHelpersByRoutingId(
            routings.map(r => r.id()!),
        );

        return ResponseHelper.success(
            routings.map(r => ({
                ...this.mapper.toResponse(r),
                ...helpers.get(r.id()!),
            })),
            'Driver routings retrieved successfully',
        );
```

- [ ] **Step 6: Rodar a suíte de routing e o build**

```bash
npm test -- src/routing
npm run build
```

Esperado: PASS em tudo. Se algum teste do controller assertava o objeto exato de `my-routings`, atualize-o acrescentando `helpers` — **não** afrouxe para `expect.objectContaining`.

- [ ] **Step 7: Commit**

```bash
git add src/routing/service/routing.service.ts src/routing/service/routing.service.spec.ts src/routing/controller/routing.controller.ts
git commit -m "feat(routing): ajudantes no my-routings, resolvidos em lote

O app do motorista mostra a tripulacao ja na listagem, antes de abrir a
rota. Buscar por rota ali seria N+1; o metodo novo faz uma query so, no
padrao de getAssigneesByRoutingId/getListBadgesByRoutingId.

getRoutingHelpers passa a delegar ao metodo em lote — a resolucao de nome
e telefone continua num lugar so.

Map SEMPRE com entrada por rota (helpers: [] quando nao ha ajudante): sem
ela o spread do controller deixaria o campo AUSENTE, que e como o app
identifica backend antigo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# BLOCO B — App (`lab-app`)

Branch: `feat/ajudantes-icones-e-lista`, criada **a partir de `feat/equipe-e-ajudantes-no-app`**.

### Task 2: Ícones no lugar do texto nos botões de contato

**Files:**
- Modify: `src/components/PessoaContatoRow/PessoaContatoRow.tsx:55-80`

**Interfaces:**
- Consumes: `Icon` de `@/components/Icon/Icon` (já existe).
- Produces: nada novo — a assinatura de `PessoaContatoRow` não muda.

**O detalhe que decide a implementação, e que a spec ainda não sabia:** este projeto tem um componente `Icon` próprio (`src/components/Icon/Icon.tsx`), que envolve **`MaterialIcons`** e resolve cor pelo tema. É o padrão usado em `RouteItem` e em várias telas.

Só que **`MaterialIcons` não tem o logo do WhatsApp** — o conjunto Material não inclui marcas. Então:

- **Telefone:** `<Icon name="call" ... />`, pelo componente do projeto.
- **WhatsApp:** `Ionicons name="logo-whatsapp"` importado direto de `@expo/vector-icons`, que já é usado assim em 10 arquivos deste app. Deixe um comentário explicando por que este escapa do `Icon`.

**Acessibilidade não é opcional aqui:** o texto sai da tela mas migra para `accessibilityLabel`. Sem isso um leitor de tela anuncia dois botões sem nome. Os `accessibilityLabel` já existem no arquivo — **preserve-os**.

**Área de toque:** o ícone é menor que o texto que substitui. Aumente o `hitSlop` para manter o alvo em ~44pt — o dedo é de quem está num caminhão, e encolher o alvo junto com o desenho é o erro fácil desta mudança.

- [ ] **Step 1: Trocar os rótulos por ícones**

Em `src/components/PessoaContatoRow/PessoaContatoRow.tsx`, acrescente aos imports:

```tsx
import { Ionicons } from '@expo/vector-icons';

import { Icon } from '@/components/Icon/Icon';
import { useAppTheme } from '@/hooks';
```

Dentro do componente, antes do `return`:

```tsx
    // `Icon` (MaterialIcons) nao tem glifo de marca — WhatsApp so existe em
    // Ionicons. Por isso o telefone usa o componente do projeto e o WhatsApp vem
    // direto de @expo/vector-icons, que este app ja importa assim em outras telas.
    const { colors } = useAppTheme();
```

E substitua o bloco de botões (linhas 55-80) por:

```tsx
            {(tel || zap) && (
                <Box flexDirection="row" gap="x16" alignItems="center">
                    {!!tel && (
                        <TouchableOpacityBox
                            onPress={() => Linking.openURL(tel).catch(() => {})}
                            accessibilityRole="button"
                            accessibilityLabel={`Ligar para ${nome}`}
                            // O icone e menor que o texto que ele substituiu; o
                            // hitSlop mantem o alvo perto de 44pt.
                            hitSlop={measure.x12}
                        >
                            <Icon name="call" size={measure.m24} color="primary100" />
                        </TouchableOpacityBox>
                    )}
                    {!!zap && (
                        <TouchableOpacityBox
                            onPress={abrirWhatsApp}
                            accessibilityRole="button"
                            accessibilityLabel={`Abrir WhatsApp de ${nome}`}
                            hitSlop={measure.x12}
                        >
                            <Ionicons name="logo-whatsapp" size={measure.m24} color={colors.primary100} />
                        </TouchableOpacityBox>
                    )}
                </Box>
            )}
```

**Confira antes de aceitar:** que `measure.m24` e `measure.x12` existem em `src/theme` (abra o arquivo). Se não existirem, use os equivalentes reais e registre a troca no relatório. Confira também que `useAppTheme` é o hook de tema deste projeto (o `Icon.tsx` o usa).

- [ ] **Step 2: Verificar tipos e lint**

```bash
npx tsc --noEmit
npm run lint
```

Esperado: sem erro; nenhum warning novo nos arquivos tocados.

- [ ] **Step 3: Commit**

```bash
git add src/components/PessoaContatoRow/PessoaContatoRow.tsx
git commit -m "feat(contato): icones de telefone e WhatsApp no lugar do texto

O texto sai da tela mas continua no accessibilityLabel — sem isso o leitor
de tela anunciaria dois botoes sem nome. hitSlop maior mantem o alvo perto
de 44pt, porque o icone e menor que o rotulo que substituiu.

WhatsApp vem de Ionicons, nao do componente Icon do projeto: MaterialIcons
nao tem glifo de marca.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `AjudantesDaRota` vira recolhível e compartilhado

**Files:**
- Create: `src/components/AjudantesDaRota/AjudantesDaRota.tsx`
- Create: `src/components/AjudantesDaRota/index.ts`
- Modify: `src/components/index.ts` (exportar do barrel)
- Delete: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/AjudantesDaRota.tsx`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/index.ts` (remover o export)
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/index.tsx` (import passa a vir de `@/components`)

**Interfaces:**
- Consumes: `PessoaContatoRow` (Task 2), `Icon` de `@/components/Icon/Icon`, `RoutingHelperResponse` de `@/domain/agility/routing/dto`.
- Produces: `<AjudantesDaRota ajudantes={RoutingHelperResponse[] | undefined} />` — mesma assinatura de hoje, agora recolhível. A Task 4 usa este componente.

**Comportamento:**
- **Sem ajudante:** devolve `null` — nem cabeçalho, nem espaço. Isso já é o comportamento atual; preserve.
- **Nasce fechado, sempre.** Estado local com `useState(false)`, sem persistência: voltar para a tela recomeça fechado, que é o que "sempre abrir encolhido" pede. Não invente chave de persistência.
- **Cabeçalho (sempre visível):** ícone de pessoas + "N ajudantes" + chevron que gira conforme o estado.

- [ ] **Step 1: Criar o componente compartilhado**

Crie `src/components/AjudantesDaRota/AjudantesDaRota.tsx`:

```tsx
import { useState } from 'react'

import { Box, Text, TouchableOpacityBox, PessoaContatoRow } from '@/components'
import { Icon } from '@/components/Icon/Icon'
import type { RoutingHelperResponse } from '@/domain/agility/routing/dto'
import { measure } from '@/theme'

interface AjudantesDaRotaProps {
    ajudantes: RoutingHelperResponse[] | undefined
}

/**
 * Quem está nesta viagem junto com o motorista, num bloco recolhível.
 *
 * Aparece no detalhe da rota e no card da lista de rotas — o mesmo componente
 * nos dois lugares, para o motorista ver a tripulação antes de começar.
 *
 * Renderiza `null` quando não há ajudante: rota sem tripulação extra é o caso
 * comum, e um título com lista vazia só ocuparia a tela e sugeriria que alguém
 * deveria estar ali.
 *
 * Nasce SEMPRE fechado, e o estado não persiste: sair da tela e voltar recomeça
 * recolhido. Persistir exigiria decidir a chave (por rota? por sessão?) sem que
 * ninguém tenha pedido isso.
 */
export function AjudantesDaRota({ ajudantes }: AjudantesDaRotaProps) {
    const [aberto, setAberto] = useState(false)

    if (!ajudantes?.length) return null

    const total = ajudantes.length
    const rotulo = total === 1 ? '1 ajudante' : `${total} ajudantes`

    return (
        <Box marginBottom="y16">
            <TouchableOpacityBox
                flexDirection="row"
                alignItems="center"
                gap="x8"
                paddingVertical="y8"
                onPress={() => setAberto((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: aberto }}
                accessibilityLabel={`${rotulo} nesta rota. Toque para ${aberto ? 'recolher' : 'ver'}.`}
                hitSlop={measure.x8}
            >
                <Icon name="group" size={measure.m20} color="gray500" />
                <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary" style={{ flex: 1 }}>
                    {rotulo}
                </Text>
                <Icon name={aberto ? 'expand-less' : 'expand-more'} size={measure.m20} color="gray400" />
            </TouchableOpacityBox>

            {aberto &&
                ajudantes.map((ajudante) => (
                    <PessoaContatoRow
                        key={ajudante.id}
                        nome={ajudante.helperName ?? 'Ajudante sem nome'}
                        telefone={ajudante.helperPhone ?? null}
                    />
                ))}
        </Box>
    )
}
```

Crie `src/components/AjudantesDaRota/index.ts`:

```ts
export { AjudantesDaRota } from './AjudantesDaRota'
```

**Confira antes de aceitar:** que `measure.m20`, `measure.x8` e os presets/cores usados existem de verdade em `src/theme`; que `group`, `expand-more` e `expand-less` são nomes válidos de `MaterialIcons` (o tipo `IconNameMaterial` acusa se não forem). Registre qualquer troca no relatório.

- [ ] **Step 2: Exportar do barrel e remover o antigo**

Em `src/components/index.ts`, acrescente o export seguindo o padrão do arquivo.

Apague `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/AjudantesDaRota.tsx` e remova a linha correspondente de `_components/index.ts`. **Não deixe cópia** — o objetivo é um componente só.

Em `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/index.tsx`, tire `AjudantesDaRota` do import de `./_components` e passe a importá-lo de `@/components`, junto dos outros componentes que já vêm de lá.

- [ ] **Step 3: Verificar que não sobrou referência ao caminho antigo**

```bash
grep -rn "AjudantesDaRota" src/
npx tsc --noEmit
npm run lint
```

Esperado: só o componente novo, o barrel e o uso no detalhe da rota. Zero erros.

- [ ] **Step 4: Commit**

```bash
git add -A src/components src/app
git commit -m "feat(ajudantes): bloco recolhivel e compartilhado

Nasce sempre fechado, sem persistir o estado: sair da tela e voltar
recomeca recolhido. Sai de rotas-detalhadas/_components e vira componente
de src/components, porque o card da lista de rotas usa o mesmo bloco.

Continua devolvendo null quando nao ha ajudante.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Os ajudantes no card da lista de rotas

**Files:**
- Modify: `src/app/(auth)/(tabs)/_rotas/components/RouteItem.tsx`

**Interfaces:**
- Consumes: `<AjudantesDaRota ajudantes={...} />` (Task 3); `helpers` no payload de `my-routings` (Task 1).
- Produces: nada — é o consumidor final.

**O risco desta tarefa, e ele é concreto:** o card inteiro é um `TouchableOpacityBox` cujo `onPress` navega para a rota (`RouteItem.tsx:125-134`). Colocar um bloco com `onPress` próprio dentro dele cria **touchables aninhados**. No React Native o sistema de responder faz o touchable interno vencer, então funciona — mas é frágil e é exatamente o tipo de coisa que passa no `tsc` e falha no dedo: tocar no chevron navegaria para a rota em vez de expandir.

Por isso o roteiro manual do Step 3 é obrigatório, não decorativo.

**Onde colocar:** entre o bloco de métricas e o rodapé de status/valor. Ali o bloco fica dentro do card mas fora da linha de informações densas, e quando fechado ocupa uma linha só.

- [ ] **Step 1: Renderizar o bloco no card**

Em `src/app/(auth)/(tabs)/_rotas/components/RouteItem.tsx`, acrescente ao import de `@/components`:

```tsx
import { AjudantesDaRota, Box, Text, TouchableOpacityBox } from '@/components';
```

E insira, **entre** o `Box` das métricas (que termina por volta da linha 215) e o `Box` do rodapé (que começa por volta da linha 218):

```tsx
                {/* Tripulacao da viagem — recolhida por padrao, para o motorista
                    ver com quem vai antes de abrir a rota. Some quando nao ha
                    ajudante, e some tambem enquanto o backend que devolve
                    `helpers` no my-routings nao estiver deployado. */}
                <Box mt="y8">
                    <AjudantesDaRota ajudantes={route.helpers} />
                </Box>
```

- [ ] **Step 2: Verificar tipos e lint**

```bash
npx tsc --noEmit
npm run lint
```

Esperado: sem erro. `RoutingResponse.helpers` já é opcional desde a entrega anterior, então o tipo não muda.

- [ ] **Step 3: Roteiro manual (obrigatório; anotar no relatório da tarefa)**

Com o backend da Task 1 no ar:

1. Card de rota **com** ajudante → aparece "2 ajudantes" recolhido.
2. **Tocar no cabeçalho do bloco expande e NÃO navega para a rota.** Este é o teste que justifica a tarefa — se navegar, os touchables aninhados não estão resolvendo como esperado e é preciso reportar antes de seguir.
3. Expandido, tocar em "Ligar" abre o discador e **não** navega.
4. Expandido, tocar no WhatsApp abre a conversa (ou o navegador em `wa.me`) e **não** navega.
5. Tocar em **qualquer outra parte do card** continua abrindo a rota.
6. Card de rota **sem** ajudante → nenhum vestígio do bloco, nenhum espaço extra.
7. Sair da tela e voltar → o bloco está recolhido de novo.
8. App contra backend **sem** a Task 1 → o bloco não aparece em card nenhum, e nada quebra.

- [ ] **Step 4: Commit e PRs**

```bash
git add "src/app/(auth)/(tabs)/_rotas/components/RouteItem.tsx"
git commit -m "feat(rotas): ajudantes recolhidos no card da lista

O motorista ve com quem vai antes de abrir a rota. Mesmo componente do
detalhe, recolhido por padrao.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"

git push origin feat/ajudantes-icones-e-lista
```

Abra a PR do app **contra `feat/equipe-e-ajudantes-no-app`** (não contra `main`) e a do backend **contra `feat/equipe-contato-roster-me`** (não contra `development`) — são PRs encadeadas. Registre no corpo de cada uma que ela só pode mergear depois da anterior.

---

## Verificação final (depois das 4 tarefas)

- [ ] Backend: `npm test -- src/routing` verde e `npm run build` limpo.
- [ ] App: `npx tsc --noEmit` limpo e `npx jest --watchAll=false` verde.
- [ ] `grep -rn "AjudantesDaRota" src/` no app mostra **um** componente, não dois.
- [ ] **O teste do dedo:** tocar no bloco dentro do card expande sem navegar (Task 4, Step 3, item 2). Nenhuma verificação automatizada cobre isso.
