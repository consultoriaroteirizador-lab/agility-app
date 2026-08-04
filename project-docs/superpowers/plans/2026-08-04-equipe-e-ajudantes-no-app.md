# Equipe e ajudantes no app do motorista — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Goal:** O motorista passa a ver — e contatar — os ajudantes escalados na sua rota e os colegas da sua equipe fixa, dentro do app.

**Architecture:** O backend já tem os dois dados; falta expor telefone e um endpoint que resolva "quem sou eu". Acrescentamos `GET /teams/roster/me` (único lugar por onde o telefone sai), extraímos a função de nome/telefone da pessoa hoje duplicada byte a byte, e no app criamos o domínio `team` mais dois pontos de leitura: um bloco no detalhe da rota (dado que já chega e é descartado) e uma tela no menu.

**Tech Stack:** Backend NestJS + Prisma + Jest. App React Native + Expo Router + TanStack Query + Restyle (`Box`/`Text`/`TouchableOpacityBox`).

**Spec:** `project-docs/superpowers/specs/2026-08-04-equipe-e-ajudantes-no-app-design.md`

## Global Constraints

- **Dois repos.** Bloco A em `c:\Users\daniel\Agility\Front\agility-services`; Bloco B em `c:\Users\daniel\Agility\Front\lab-app`. Nenhuma tarefa toca os dois.
- **Ordem de deploy: backend PRIMEIRO**, mesma janela. Bloco A inteiro antes de mergear o Bloco B.
- **Sem migration.** `Collaborator.phone` e `Provider.phone` já existem. Se surgir necessidade de migration, PARE — é sinal de que o desenho saiu do trilho.
- **Telefone sai por UM caminho só:** `GET /teams/roster/me`. `TeamMemberEntity.toJson()` **não pode** passar a emitir telefone — `TeamEntity.toJson()` chama `m.toJson()` (`team.entity.ts:321`) e o campo vazaria por `GET /teams`, `GET /teams/:id` e `GET /teams/by-person/:personId`.
- **PT-BR** em mensagens de erro e textos de UI, sem acento em mensagem de commit (padrão do repo).
- **Branch backend:** `feat/equipe-contato-roster-me`, base `development`. **Branch app:** `feat/equipe-e-ajudantes-no-app` (já criada, base `main`).
- **PR do backend contra `development`; PR do app contra `main`.**
- Comandos: backend `npm test -- <caminho>` e `npm run build`; app `npx jest <caminho> --watchAll=false`.

---

# BLOCO A — Backend (`agility-services`)

### Task 1: Util compartilhado de nome e telefone da pessoa

Fecha a duplicação byte a byte documentada em `team.mapper.ts:10-17`. Esta tarefa **só cria** o util e seus testes; os dois consumidores migram nas Tasks 2 e 5.

**Files:**
- Create: `src/shared/person-display.util.ts`
- Test: `src/shared/person-display.util.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `PersonDisplaySource`, `resolvePersonName(src: PersonDisplaySource): string | null`, `resolvePersonPhone(src: PersonDisplaySource): string | null`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/shared/person-display.util.spec.ts`:

```ts
import { resolvePersonName, resolvePersonPhone } from './person-display.util';

describe('resolvePersonName', () => {
    it('monta o nome do colaborador com firstName + lastName', () => {
        const nome = resolvePersonName({
            collaborator: { firstName: 'Ana', lastName: 'Souza', email: 'ana@x.com', phone: null },
        });
        expect(nome).toBe('Ana Souza');
    });

    it('cai para o email quando o colaborador nao tem nome', () => {
        const nome = resolvePersonName({
            collaborator: { firstName: null, lastName: null, email: 'ana@x.com', phone: null },
        });
        expect(nome).toBe('ana@x.com');
    });

    it('cai para o fallbackId quando o colaborador nao tem nome nem email', () => {
        const nome = resolvePersonName({
            collaborator: { firstName: null, lastName: null, email: null, phone: null },
            fallbackId: 'col-1',
        });
        expect(nome).toBe('col-1');
    });

    it('usa o nome fantasia do prestador PJ, ignorando firstName/lastName', () => {
        const nome = resolvePersonName({
            provider: {
                personType: 'PJ', tradeName: 'Transportes XPTO', companyName: 'XPTO LTDA',
                firstName: 'Nao', lastName: 'Usar', email: 'xpto@x.com', phone: null,
            },
        });
        expect(nome).toBe('Transportes XPTO');
    });

    it('cai para a razao social quando o prestador PJ nao tem nome fantasia', () => {
        const nome = resolvePersonName({
            provider: {
                personType: 'PJ', tradeName: null, companyName: 'XPTO LTDA',
                firstName: null, lastName: null, email: 'xpto@x.com', phone: null,
            },
        });
        expect(nome).toBe('XPTO LTDA');
    });

    it('usa o nome pessoal do prestador PF', () => {
        const nome = resolvePersonName({
            provider: {
                personType: 'PF', tradeName: null, companyName: null,
                firstName: 'Joao', lastName: 'Lima', email: 'joao@x.com', phone: null,
            },
        });
        expect(nome).toBe('Joao Lima');
    });

    it('prefere o prestador quando os dois vem preenchidos (XOR violado no dado)', () => {
        const nome = resolvePersonName({
            collaborator: { firstName: 'Ana', lastName: 'Souza', email: null, phone: null },
            provider: {
                personType: 'PF', tradeName: null, companyName: null,
                firstName: 'Joao', lastName: 'Lima', email: 'joao@x.com', phone: null,
            },
        });
        expect(nome).toBe('Joao Lima');
    });

    it('devolve null quando nao ha pessoa nenhuma nem fallbackId', () => {
        expect(resolvePersonName({})).toBeNull();
    });
});

describe('resolvePersonPhone', () => {
    it('devolve o telefone do colaborador', () => {
        const tel = resolvePersonPhone({
            collaborator: { firstName: 'Ana', lastName: null, email: null, phone: '11988887777' },
        });
        expect(tel).toBe('11988887777');
    });

    it('devolve o telefone do prestador', () => {
        const tel = resolvePersonPhone({
            provider: {
                personType: 'PJ', tradeName: 'XPTO', companyName: null,
                firstName: null, lastName: null, email: 'x@x.com', phone: '11977776666',
            },
        });
        expect(tel).toBe('11977776666');
    });

    // Guarda de decisao da spec (§3.2): recoveryPhone e declaradamente "proprio
    // OU DE SUPERVISOR". Usa-lo como fallback faria o motorista ligar para a
    // pessoa errada achando que liga para o colega. Este teste existe para que
    // quem "melhorar" o util adicionando o fallback veja vermelho.
    it('NAO cai para recoveryPhone quando phone e nulo', () => {
        const tel = resolvePersonPhone({
            collaborator: {
                firstName: 'Ana', lastName: null, email: null, phone: null,
                recoveryPhone: '11955554444',
            } as any,
        });
        expect(tel).toBeNull();
    });

    it('devolve null quando nao ha pessoa', () => {
        expect(resolvePersonPhone({})).toBeNull();
    });

    it('trata string vazia como ausencia de telefone', () => {
        const tel = resolvePersonPhone({
            collaborator: { firstName: 'Ana', lastName: null, email: null, phone: '   ' },
        });
        expect(tel).toBeNull();
    });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npm test -- src/shared/person-display.util.spec.ts
```

Esperado: FAIL — `Cannot find module './person-display.util'`.

- [ ] **Step 3: Implementar o util**

Crie `src/shared/person-display.util.ts`:

```ts
import { PersonType } from '@prisma/client';

/**
 * Nome e telefone exibiveis de uma PESSOA (colaborador OU prestador) — a
 * definicao unica.
 *
 * Nasceu de uma duplicacao byte a byte assumida: `nomeDoAjudante`
 * (`routing.service.ts`) e `resolvePersonName` (`team.mapper.ts`) eram a mesma
 * funcao em dois lugares, "sincronizadas so por disciplina". Ao acrescentar
 * telefone as duas ao mesmo tempo, a copia virou custo — entao virou este util,
 * no mesmo espirito de `person-skills.util.ts`.
 *
 * A TERCEIRA implementacao, `ProviderEntity.displayName()`, NAO foi unificada de
 * proposito: a ordem de fallback dela e diferente (separa PJ/PF em vez de tentar
 * todos os campos em cascata) e tem outros consumidores.
 */
export interface PersonDisplaySource {
    collaborator?: {
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
    } | null;
    provider?: {
        personType: PersonType;
        tradeName: string | null;
        companyName: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string;
        phone: string | null;
    } | null;
    /** Ultima linha de defesa do nome: o id da pessoa, quando nao ha nome nem email. */
    fallbackId?: string | null;
}

/** `null` para string vazia/so espacos — "campo preenchido com nada" nao e um valor. */
function limpar(valor: string | null | undefined): string | null {
    const t = valor?.trim();
    return t ? t : null;
}

/**
 * Prestador PJ nao tem `firstName` — `personType` diz qual ramo usar, em vez de
 * adivinhar por qual campo esta preenchido. `Provider.email` e NOT NULL no
 * schema, entao o fallback final nunca e o id para prestador; para colaborador o
 * email e opcional e o `fallbackId` continua sendo a ultima defesa.
 *
 * O prestador tem precedencia sobre o colaborador quando os dois vem: o CHECK
 * `*_person_xor` garante que isso nao acontece no banco, mas a ordem precisa ser
 * deterministica de qualquer forma.
 */
export function resolvePersonName(src: PersonDisplaySource): string | null {
    const p = src.provider;
    if (p) {
        const pessoal = [limpar(p.firstName), limpar(p.lastName)].filter(Boolean).join(' ');
        return (
            (p.personType === 'PJ' ? limpar(p.tradeName) || limpar(p.companyName) : pessoal) ||
            limpar(p.tradeName) ||
            limpar(p.companyName) ||
            pessoal ||
            limpar(p.email)
        );
    }
    const c = src.collaborator;
    if (c) {
        const pessoal = [limpar(c.firstName), limpar(c.lastName)].filter(Boolean).join(' ');
        return pessoal || limpar(c.email) || limpar(src.fallbackId);
    }
    return limpar(src.fallbackId);
}

/**
 * Telefone para contato direto (ligar / WhatsApp).
 *
 * NAO cai para `Collaborator.recoveryPhone`: o schema declara esse campo como
 * "telefone p/ recuperacao/contato — proprio OU DE SUPERVISOR". Usa-lo aqui
 * faria o motorista ligar para outra pessoa achando que liga para o colega. Sem
 * telefone e uma resposta valida; telefone errado nao e.
 */
export function resolvePersonPhone(src: PersonDisplaySource): string | null {
    if (src.provider) return limpar(src.provider.phone);
    if (src.collaborator) return limpar(src.collaborator.phone);
    return null;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npm test -- src/shared/person-display.util.spec.ts
```

Esperado: PASS, 14 testes.

- [ ] **Step 5: Commit**

```bash
git add src/shared/person-display.util.ts src/shared/person-display.util.spec.ts
git commit -m "feat(shared): util unico de nome e telefone da pessoa

Fecha a duplicacao byte a byte entre nomeDoAjudante (routing) e
resolvePersonName (team), documentada em team.mapper.ts. Os dois
consumidores migram nos proximos commits.

resolvePersonPhone NAO cai para recoveryPhone: o campo e declaradamente
'proprio ou de supervisor' e o fallback faria o motorista ligar para a
pessoa errada.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `personPhone` no membro de equipe, sem vazar nas outras superfícies

**Files:**
- Modify: `src/team/entities/team.entity.ts` (tipo `TeamMemberPersistenceData`, campo `_personPhone`, getter, novo `toJsonWithContact()`)
- Modify: `src/team/mapper/team.mapper.ts` (usar o util da Task 1, remover `resolvePersonName` local, acrescentar `phone` ao recorte de tipo)
- Test: `src/team/entities/team.entity.spec.ts` (acrescentar bloco)

**Interfaces:**
- Consumes: `resolvePersonName`, `resolvePersonPhone`, `PersonDisplaySource` (Task 1).
- Produces: `TeamMemberEntity.personPhone(): string | null` e `TeamMemberEntity.toJsonWithContact()`, que devolve tudo de `toJson()` **mais** `personPhone`. A Task 4 consome `toJsonWithContact()`.

**Contexto que evita retrabalho:** as repositories **não mudam**. Os `include` são de modelo inteiro (`collaborator: { include: { collaboratorSkills: … } }`) — `phone` já chega no runtime; falta só o tipo declarar.

**Por que um método novo em vez de um parâmetro:** `TeamEntity.toJson()` chama `m.toJson()` (`team.entity.ts:321`). Um `toJson({ includePhone })` com default seguro ainda pode ser ligado por engano por um chamador futuro; um método separado só é chamado por quem o procura.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao final de `src/team/entities/team.entity.spec.ts` (dentro do `describe` de `TeamMemberEntity`, ou num `describe` novo no mesmo arquivo):

```ts
describe('contato do membro', () => {
    const base = {
        companyId: 'comp-1',
        teamId: 'team-1',
        collaboratorId: 'col-1',
        personName: 'Ana Souza',
        personPhone: '11988887777',
    };

    it('toJson() NAO expoe personPhone — protege GET /teams e /teams/by-person', () => {
        const json = TeamMemberEntity.fromPersistence(base).toJson();
        expect(json).not.toHaveProperty('personPhone');
    });

    it('toJsonWithContact() expoe personPhone junto com tudo que toJson devolve', () => {
        const membro = TeamMemberEntity.fromPersistence(base);
        const json = membro.toJsonWithContact();
        expect(json.personPhone).toBe('11988887777');
        expect(json.personName).toBe('Ana Souza');
        expect(json.collaboratorId).toBe('col-1');
    });

    it('personPhone e null (nunca undefined) quando a pessoa nao tem telefone', () => {
        const membro = TeamMemberEntity.fromPersistence({ ...base, personPhone: undefined });
        expect(membro.toJsonWithContact().personPhone).toBeNull();
    });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npm test -- src/team/entities/team.entity.spec.ts
```

Esperado: FAIL — `membro.toJsonWithContact is not a function`.

- [ ] **Step 3: Implementar na entity**

Em `src/team/entities/team.entity.ts`:

1. No tipo `TeamMemberPersistenceData`, logo abaixo de `personName`, acrescente:

```ts
    /** Telefone da pessoa, resolvido no mapper — não é coluna própria. Só sai pelo endpoint `roster/me`. */
    personPhone?: string | null;
```

2. Junto dos campos privados (abaixo de `private _personName: string | null;`):

```ts
    private _personPhone: string | null;
```

3. No construtor, abaixo de `this._personName = props.personName ?? null;`:

```ts
        this._personPhone = props.personPhone ?? null;
```

4. Junto dos getters, abaixo de `personName()`:

```ts
    /** Telefone da pessoa. `null` quando não resolvido ou não cadastrado. */
    public personPhone(): string | null { return this._personPhone; }
```

5. Abaixo de `toJson()`, acrescente:

```ts
    /**
     * `toJson()` + telefone. Método separado, e não um parâmetro de `toJson()`,
     * porque `TeamEntity.toJson()` serializa os membros chamando `m.toJson()`:
     * qualquer telefone que entre lá vaza por `GET /teams`, `GET /teams/:id` e
     * `GET /teams/by-person/:personId` — endpoints que qualquer COLLABORATOR
     * consulta para QUALQUER pessoa, sem checagem de dono. Só o `roster/me`,
     * que responde sobre quem perguntou, pode usar este método.
     */
    public toJsonWithContact() {
        return { ...this.toJson(), personPhone: this._personPhone };
    }
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npm test -- src/team/entities/team.entity.spec.ts
```

Esperado: PASS.

- [ ] **Step 5: Migrar o mapper para o util**

Em `src/team/mapper/team.mapper.ts`:

1. Troque o import do topo, acrescentando:

```ts
import { resolvePersonName, resolvePersonPhone } from 'src/shared/person-display.util';
```

2. **Apague** a função local `resolvePersonName` (linhas 37-57, incluindo o docblock) e o docblock do tipo que fala em cópia byte a byte (linhas 7-18). Substitua o docblock do tipo por:

```ts
/**
 * Forma mínima que o mapper precisa da linha de `team_members` (com
 * `collaborator`/`provider` incluídos). `phone` já vem do `include` de modelo
 * inteiro da repository — este tipo só precisava declará-lo.
 *
 * Nome e telefone são resolvidos por `src/shared/person-display.util.ts`, que é
 * a definição única (antes esta era uma cópia byte a byte de `nomeDoAjudante`).
 */
```

3. No tipo `PrismaTeamMemberWithPerson`, acrescente `phone: string | null;` nos dois ramos:

```ts
type PrismaTeamMemberWithPerson = PrismaTeamMember & {
    collaborator?: {
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        collaboratorSkills?: Array<{ skillId: number }> | null;
    } | null;
    provider?: {
        personType: PersonType;
        tradeName: string | null;
        companyName: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string;
        phone: string | null;
        collaboratorSkills?: Array<{ skillId: number }> | null;
    } | null;
};
```

4. Em `memberToDomain`, troque a linha `personName:` e acrescente `personPhone:`:

```ts
            personName: resolvePersonName({
                collaborator: prisma.collaborator,
                provider: prisma.provider,
                fallbackId: prisma.collaboratorId,
            }),
            personPhone: resolvePersonPhone({
                collaborator: prisma.collaborator,
                provider: prisma.provider,
            }),
```

- [ ] **Step 6: Rodar a suíte do módulo team e o build**

```bash
npm test -- src/team
npm run build
```

Esperado: PASS em tudo, build sem erro de tipo. Se `team.mapper.spec.ts` (se existir) referenciar a função local removida, ajuste o teste para importar do util.

- [ ] **Step 7: Commit**

```bash
git add src/team/entities/team.entity.ts src/team/entities/team.entity.spec.ts src/team/mapper/team.mapper.ts
git commit -m "feat(team): personPhone no membro, exposto so por toJsonWithContact

O mapper passa a usar o util compartilhado (a copia local de
resolvePersonName sai). O telefone NAO entra em toJson(): TeamEntity
serializa os membros por ali, e o campo vazaria em GET /teams,
/teams/:id e /teams/by-person — endpoints sem checagem de dono.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `PersonIdentityService` — quem é o usuário logado

**Files:**
- Create: `src/person-identity/person-identity.service.ts`
- Create: `src/person-identity/person-identity.module.ts`
- Test: `src/person-identity/person-identity.service.spec.ts`
- Modify: `src/app.module.ts` (registrar o módulo)

**Interfaces:**
- Consumes: `CollaboratorService.findByKeycloakUserId`, `ProviderService.findByKeycloakUserId`.
- Produces: `PersonIdentityModule` (exporta o service) e

  ```ts
  PersonIdentityService.resolveByKeycloakUserId(keycloakUserId: string): Promise<ResolvedPerson | null>

  type PersonLinkType = 'COLLABORATOR' | 'PROVIDER'
  interface ResolvedPerson {
      personId: string
      personLinkType: PersonLinkType
      collaborator?: CollaboratorEntity   // presente quando personLinkType === 'COLLABORATOR'
      provider?: ProviderEntity           // presente quando personLinkType === 'PROVIDER'
  }
  ```

  Consumido pela Task 4 (só `personId`/`personLinkType`) e pela Task 6 (também a entidade).

**Dois cuidados de nome que já custaram tempo:**

- **`PersonLinkType`, não `PersonType`.** O Prisma já exporta um `PersonType`, e ele
  significa **PF/PJ** — outra pergunta inteiramente. Duas coisas diferentes com o mesmo
  nome no mesmo projeto é armadilha para o próximo leitor.
- A entidade vai junto no retorno **de propósito**: sem ela, a Task 6 buscaria a mesma
  pessoa de novo por id, um round-trip a mais no `GET /drivers/me`, que é caminho quente do
  app. O campo de resposta público continua se chamando `personType` (Task 4) — é contrato
  de API, e ali não há ambiguidade com PF/PJ.

**A assimetria que motiva esta tarefa:** `CollaboratorService.findByKeycloakUserId` **lança** `NotFoundException` quando não acha; o do `Provider` **resolve `null`**. Hoje só `DriverProfileService` sabe disso. Um segundo consumidor que não saiba nunca alcança o terceirizado — a exceção estoura antes.

**Diferença deliberada em relação ao `/drivers/me`:** aqui **não** se exige `Driver` vinculado. A pergunta é "quem é esta pessoa", não "esta pessoa é motorista".

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/person-identity/person-identity.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { PersonIdentityService } from './person-identity.service';

describe('PersonIdentityService', () => {
    let collaboratorService: any;
    let providerService: any;
    let service: PersonIdentityService;

    beforeEach(() => {
        collaboratorService = { findByKeycloakUserId: jest.fn() };
        providerService = { findByKeycloakUserId: jest.fn() };
        service = new PersonIdentityService(collaboratorService, providerService);
    });

    it('resolve o colaborador quando o usuario e funcionario', async () => {
        const colaborador = { id: () => 'col-1' };
        collaboratorService.findByKeycloakUserId.mockResolvedValue(colaborador);

        await expect(service.resolveByKeycloakUserId('kc-1')).resolves.toEqual({
            personId: 'col-1',
            personLinkType: 'COLLABORATOR',
            collaborator: colaborador,
        });
        expect(providerService.findByKeycloakUserId).not.toHaveBeenCalled();
    });

    // O teste que protege a assimetria: o CollaboratorService LANCA quando nao
    // acha. Sem o catch, o terceirizado nunca seria alcancado.
    it('alcanca o prestador mesmo quando o CollaboratorService LANCA', async () => {
        const prestador = { id: () => 'prov-1' };
        collaboratorService.findByKeycloakUserId.mockRejectedValue(new NotFoundException());
        providerService.findByKeycloakUserId.mockResolvedValue(prestador);

        await expect(service.resolveByKeycloakUserId('kc-2')).resolves.toEqual({
            personId: 'prov-1',
            personLinkType: 'PROVIDER',
            provider: prestador,
        });
    });

    it('alcanca o prestador quando o CollaboratorService resolve null', async () => {
        collaboratorService.findByKeycloakUserId.mockResolvedValue(null);
        providerService.findByKeycloakUserId.mockResolvedValue({ id: () => 'prov-1' });

        await expect(service.resolveByKeycloakUserId('kc-3')).resolves.toMatchObject({
            personId: 'prov-1',
            personLinkType: 'PROVIDER',
        });
    });

    it('devolve null quando o usuario nao e nem colaborador nem prestador', async () => {
        collaboratorService.findByKeycloakUserId.mockRejectedValue(new NotFoundException());
        providerService.findByKeycloakUserId.mockResolvedValue(null);

        await expect(service.resolveByKeycloakUserId('kc-4')).resolves.toBeNull();
    });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npm test -- src/person-identity/person-identity.service.spec.ts
```

Esperado: FAIL — `Cannot find module './person-identity.service'`.

- [ ] **Step 3: Implementar o service**

Crie `src/person-identity/person-identity.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { CollaboratorService } from 'src/collaborator/service/collaborator.service';
import { ProviderService } from 'src/provider/service/provider.service';
import { CollaboratorEntity } from 'src/collaborator/entities/collaborator.entity';
import { ProviderEntity } from 'src/provider/entities/provider.entity';

/**
 * COMO a pessoa se liga à empresa. NÃO confundir com o `PersonType` do Prisma,
 * que é PF/PJ — outra pergunta. Daí o nome mais longo.
 */
export type PersonLinkType = 'COLLABORATOR' | 'PROVIDER';

export interface ResolvedPerson {
    personId: string;
    personLinkType: PersonLinkType;
    /** Presente quando `personLinkType === 'COLLABORATOR'`. */
    collaborator?: CollaboratorEntity;
    /** Presente quando `personLinkType === 'PROVIDER'`. */
    provider?: ProviderEntity;
}

/**
 * "Quem e a pessoa por tras deste usuario Keycloak" — a definicao unica.
 *
 * Existe porque os dois caminhos possiveis se comportam de forma DIFERENTE
 * quando nao encontram: `CollaboratorService.findByKeycloakUserId` LANCA
 * `NotFoundException`, enquanto o do `Provider` resolve `null`. Quem nao sabe
 * disso escreve um `if (colaborador) … else prestador` que nunca alcanca o
 * terceirizado, porque a excecao estoura antes. Esse conhecimento morava so
 * dentro de `DriverProfileService`.
 *
 * Diferenca deliberada em relacao a `GET /drivers/me`: aqui NAO se exige
 * `Driver` vinculado. A pergunta e "quem e esta pessoa", nao "esta pessoa e
 * motorista".
 */
@Injectable()
export class PersonIdentityService {
    constructor(
        private readonly collaboratorService: CollaboratorService,
        private readonly providerService: ProviderService,
    ) {}

    async resolveByKeycloakUserId(keycloakUserId: string): Promise<ResolvedPerson | null> {
        const collaborator = await this.collaboratorService
            .findByKeycloakUserId(keycloakUserId)
            .catch(() => null);
        if (collaborator) {
            // A entidade vai junto: quem já a tem em mãos não deve buscá-la de
            // novo por id (o `GET /drivers/me` é caminho quente do app).
            return { personId: collaborator.id()!, personLinkType: 'COLLABORATOR', collaborator };
        }

        const provider = await this.providerService.findByKeycloakUserId(keycloakUserId);
        if (provider) {
            return { personId: provider.id()!, personLinkType: 'PROVIDER', provider };
        }

        // Nunca inventar identidade: sem colaborador nem prestador, o usuario
        // autenticado nao e uma pessoa do cadastro desta empresa.
        return null;
    }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npm test -- src/person-identity/person-identity.service.spec.ts
```

Esperado: PASS, 4 testes.

- [ ] **Step 5: Criar o módulo e registrá-lo**

Crie `src/person-identity/person-identity.module.ts`:

```ts
import { Module, forwardRef } from '@nestjs/common';
import { CollaboratorModule } from 'src/collaborator/collaborator.module';
import { ProviderModule } from 'src/provider/provider.module';
import { PersonIdentityService } from './person-identity.service';

/**
 * `forwardRef` nos dois: `ProviderModule` importa `DriverModule`, que importa
 * `CollaboratorModule` e `ProviderModule` de volta — o grafo ja e circular
 * (ver os comentarios em `driver.module.ts`). Sem os forwardRef, registrar este
 * modulo derruba o boot com "Nest can't resolve dependencies".
 */
@Module({
    imports: [forwardRef(() => CollaboratorModule), forwardRef(() => ProviderModule)],
    providers: [PersonIdentityService],
    exports: [PersonIdentityService],
})
export class PersonIdentityModule {}
```

Em `src/app.module.ts`, acrescente o import junto dos demais e `PersonIdentityModule` na lista `imports` (perto de `TeamModule`).

- [ ] **Step 6: Verificar que a aplicação sobe**

```bash
npm run build
```

Esperado: build sem erro. Se aparecer erro de dependência circular no boot em runtime, **não** remova o service — acrescente `forwardRef` no lado que reclamar.

- [ ] **Step 7: Commit**

```bash
git add src/person-identity src/app.module.ts
git commit -m "feat(person-identity): resolucao unica de quem e o usuario logado

CollaboratorService.findByKeycloakUserId LANCA quando nao acha e o do
Provider resolve null. Esse conhecimento morava so no DriverProfileService;
quem nao o tivesse escreveria um fluxo que nunca alcanca o terceirizado.

Nao exige Driver vinculado: a pergunta e 'quem e esta pessoa'.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `GET /teams/roster/me`

**Files:**
- Create: `src/team/dto/my-roster.response.dto.ts`
- Modify: `src/team/service/team.service.ts` (novo método `findMyTeamRoster`)
- Modify: `src/team/controller/team.controller.ts` (novo endpoint)
- Modify: `src/team/team.module.ts` (importar `PersonIdentityModule`)
- Test: `src/team/service/team.service.spec.ts` (acrescentar bloco)

**Interfaces:**
- Consumes: `PersonIdentityService.resolveByKeycloakUserId` (Task 3), `TeamMemberEntity.toJsonWithContact()` (Task 2), `TeamService.findTeamRosterOfPerson` (já existe).
- Produces: `GET /teams/roster/me?date=YYYY-MM-DD` respondendo `MyRosterResponseDto`:

```ts
{ personId: string; personType: 'COLLABORATOR' | 'PROVIDER'; members: Array<{ …membro, personPhone: string | null }> }
```

O app (Task 10) consome exatamente esta forma.

**Por que envelope e não array cru:** o roster **inclui a própria pessoa**, por contrato do P2 (`team.service.ts:233`). Sem o `personId` na resposta o app precisaria de uma segunda chamada (`/drivers/me`) só para descobrir qual linha é ele mesmo.

**Onde declarar o endpoint — o detalhe que decide se ele funciona:** `@Get('roster/me')` tem de vir **ANTES** de `@Get('roster/:personId')`, e não só antes de `@Get(':id')`.

O Nest (Express por baixo) casa rotas na **ordem de registro**, não por especificidade. Com `roster/:personId` declarado primeiro, uma requisição a `/teams/roster/me` casa nele com `personId = "me"` — que não é id de ninguém, resolve para roster vazio e responde **200 com lista vazia**. O endpoint novo nunca executa e a tela do app mostra "você ainda não faz parte de uma equipe" para todo mundo. Falha silenciosa, sem log, sem erro.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `src/team/service/team.service.spec.ts` (siga o padrão de mocks já usado no arquivo; o exemplo abaixo assume `service` construído com o repositório e o `PersonIdentityService` mockados):

```ts
describe('findMyTeamRoster', () => {
    it('devolve o roster com personId e personType do usuario logado', async () => {
        personIdentityService.resolveByKeycloakUserId.mockResolvedValue({
            personId: 'col-1',
            personLinkType: 'COLLABORATOR',
        });
        jest.spyOn(service, 'findTeamRosterOfPerson').mockResolvedValue([
            TeamMemberEntity.fromPersistence({
                companyId: 'comp-1', teamId: 'team-1', collaboratorId: 'col-1',
                personName: 'Ana Souza', personPhone: '11988887777',
            }),
        ]);

        const resultado = await service.findMyTeamRoster('kc-1');

        expect(resultado.personId).toBe('col-1');
        expect(resultado.personType).toBe('COLLABORATOR');
        expect(resultado.members[0].personPhone).toBe('11988887777');
    });

    it('lanca NotFound quando o usuario logado nao e uma pessoa do cadastro', async () => {
        personIdentityService.resolveByKeycloakUserId.mockResolvedValue(null);

        await expect(service.findMyTeamRoster('kc-x')).rejects.toThrow(NotFoundException);
    });

    // "Nao tenho equipe" e uma RESPOSTA, nao um erro: a tela do app precisa
    // distinguir "sem equipe" (estado vazio) de "falhou" (tentar de novo).
    it('devolve members vazio, sem erro, quando a pessoa nao tem equipe ativa', async () => {
        personIdentityService.resolveByKeycloakUserId.mockResolvedValue({
            personId: 'col-2',
            personLinkType: 'COLLABORATOR',
        });
        jest.spyOn(service, 'findTeamRosterOfPerson').mockResolvedValue([]);

        const resultado = await service.findMyTeamRoster('kc-2');

        expect(resultado.members).toEqual([]);
        expect(resultado.personId).toBe('col-2');
    });

    it('repassa a data recebida para findTeamRosterOfPerson', async () => {
        personIdentityService.resolveByKeycloakUserId.mockResolvedValue({
            personId: 'col-1', personLinkType: 'COLLABORATOR',
        });
        const spy = jest.spyOn(service, 'findTeamRosterOfPerson').mockResolvedValue([]);

        await service.findMyTeamRoster('kc-1', '2026-08-10');

        expect(spy).toHaveBeenCalledWith('col-1', '2026-08-10');
    });
});
```

Acrescente o mock de `PersonIdentityService` no `beforeEach` existente do arquivo e passe-o ao construir o `TeamService`.

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npm test -- src/team/service/team.service.spec.ts
```

Esperado: FAIL — `service.findMyTeamRoster is not a function`.

- [ ] **Step 3: Criar o DTO de resposta**

Crie `src/team/dto/my-roster.response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class MyRosterResponseDto {
    @ApiProperty({ description: 'Id interno da pessoa logada (colaborador ou prestador)' })
    personId: string;

    @ApiProperty({ enum: ['COLLABORATOR', 'PROVIDER'] })
    personType: 'COLLABORATOR' | 'PROVIDER';

    @ApiProperty({
        description:
            'Membros da equipe cuja vigência cobre a data — INCLUSIVE a própria pessoa ' +
            '(contrato do P2). O cliente filtra a si mesmo comparando com `personId`. ' +
            'Único lugar da API que devolve `personPhone`.',
        isArray: true,
        type: Object,
    })
    members: Array<Record<string, unknown>>;
}
```

- [ ] **Step 4: Implementar o método no service**

Em `src/team/service/team.service.ts`:

1. No construtor, injete o service novo:

```ts
    constructor(
        private readonly repository: TeamRepository,
        private readonly personIdentityService: PersonIdentityService,
    ) {}
```

com o import `import { PersonIdentityService } from 'src/person-identity/person-identity.service';`.

2. Logo abaixo de `findTeamRosterOfPerson`, acrescente:

```ts
    /**
     * O roster de QUEM ESTÁ PERGUNTANDO — o único caminho por onde o telefone
     * dos colegas sai da API.
     *
     * `GET /teams/roster/:personId` é `@Roles('COLLABORATOR')` sem checagem de
     * dono: qualquer motorista logado consulta qualquer pessoa da empresa (e o
     * terceirizado tem essa role). Devolver telefone por lá transformaria o
     * endpoint num catálogo de contatos. Aqui a pergunta é sobre a própria
     * pessoa, resolvida pelo `sub` do JWT, então o telefone é legítimo.
     *
     * Sem equipe ativa → `members: []`, não 404: "não tenho equipe" é uma
     * resposta, e a tela precisa distingui-la de uma falha.
     */
    async findMyTeamRoster(
        keycloakUserId: string,
        date?: string,
    ): Promise<{
        personId: string;
        personType: 'COLLABORATOR' | 'PROVIDER';
        members: ReturnType<TeamMemberEntity['toJsonWithContact']>[];
    }> {
        const pessoa = await this.personIdentityService.resolveByKeycloakUserId(keycloakUserId);
        if (!pessoa) {
            throw new NotFoundException('Nenhuma pessoa encontrada para o usuário autenticado.');
        }

        const roster = await this.findTeamRosterOfPerson(pessoa.personId, date);

        return {
            // O campo público da API se chama `personType` (contrato do app);
            // internamente é `personLinkType`, para não colidir com o
            // `PersonType` do Prisma, que significa PF/PJ.
            personId: pessoa.personId,
            personType: pessoa.personLinkType,
            members: roster.map((m) => m.toJsonWithContact()),
        };
    }
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

```bash
npm test -- src/team/service/team.service.spec.ts
```

Esperado: PASS.

- [ ] **Step 6: Expor o endpoint e ligar o módulo**

Em `src/team/controller/team.controller.ts`, **imediatamente ACIMA do `@Get('roster/:personId')` existente** (não depois dele, não antes do `@Get(':id')` — ver a explicação da ordem acima), acrescente:

```ts
    // ORDEM IMPORTA, e a falha é silenciosa: o Nest casa na ordem de registro.
    // Declarada DEPOIS de `roster/:personId`, esta rota nunca executa — a
    // requisição casa lá com `personId="me"` e responde 200 com lista vazia.
    @Get('roster/me')
    @Roles('COLLABORATOR')
    @ApiOperation({
        summary: 'Minha equipe — o roster de quem está perguntando',
        description:
            'Resolve a pessoa pelo `sub` do JWT (colaborador OU prestador). Único endpoint ' +
            'que devolve `personPhone`. Sem equipe ativa responde `members: []`, não 404. ' +
            'O roster INCLUI a própria pessoa: filtre pelo `personId` do envelope.',
    })
    @ApiQuery({ name: 'date', required: false, type: String, description: 'Data (YYYY-MM-DD); default = hoje' })
    @ApiResponse({ status: 200, type: MyRosterResponseDto })
    @ApiResponse({ status: 404, description: 'Usuário autenticado não é colaborador nem prestador' })
    async findMyRoster(
        @CurrentUser() user: AuthenticatedUser,
        @Query('date') date?: string,
    ): Promise<MyRosterResponseDto> {
        return this.service.findMyTeamRoster(user.id, date);
    }
```

Acrescente aos imports do controller:

```ts
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from 'src/auth';
import type { AuthenticatedUser } from 'src/auth';
import { MyRosterResponseDto } from '../dto/my-roster.response.dto';
```

(o import de `src/auth` já existe — acrescente só `CurrentUser`.)

Em `src/team/team.module.ts`, acrescente `imports: [PersonIdentityModule]`:

```ts
import { PersonIdentityModule } from 'src/person-identity/person-identity.module';

@Module({
    imports: [PersonIdentityModule],
    controllers: [TeamController],
    // …resto inalterado
})
```

- [ ] **Step 7: Verificar ordem de rota e build**

```bash
npm run build
npm test -- src/team
```

Esperado: build limpo e suíte verde. **Verificação manual obrigatória** (a falha aqui é silenciosa): suba a API e confirme que `GET /teams/roster/me` devolve o envelope, e **não** uma lista vazia — lista vazia com `members` ausente significa que a requisição caiu em `roster/:personId` com `personId="me"`.

- [ ] **Step 8: Commit**

```bash
git add src/team src/person-identity
git commit -m "feat(team): GET /teams/roster/me com telefone dos colegas

Unico caminho por onde personPhone sai da API. O roster/:personId nao
checa dono — qualquer COLLABORATOR consulta qualquer pessoa — entao
telefone por la viraria catalogo de contatos da empresa.

Responde envelope { personId, personType, members }: o roster inclui a
propria pessoa por contrato do P2, e sem o personId o cliente precisaria
de uma segunda chamada so para se identificar.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: `helperPhone` nos ajudantes da rota

**Files:**
- Modify: `src/routing/service/routing.service.ts` (linhas 97-136: remover `AjudanteRow` e `nomeDoAjudante`; linhas 1627-1642: `getRoutingHelpers`)
- Test: `src/routing/service/routing.service.spec.ts` (acrescentar bloco)

**Interfaces:**
- Consumes: `resolvePersonName`, `resolvePersonPhone` (Task 1).
- Produces: `getRoutingHelpers` devolve `Array<{ id, collaboratorId, providerId, helperName, helperPhone }>`. Sai por `GET /routings/:id/helpers` **e** embutido em `GET /routings/:id` (`findByIdFull`, linha 511) — é este último que o app consome (Task 9).

**A repository não muda:** o `include: { helper: true, provider: true }` já é de modelo inteiro; `phone` chega no runtime hoje.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `src/routing/service/routing.service.spec.ts`:

```ts
describe('getRoutingHelpers', () => {
    it('devolve nome e telefone do ajudante colaborador', async () => {
        prismaService.client.routingHelper.findMany.mockResolvedValue([
            {
                id: 'rh-1', helperId: 'col-1', providerId: null,
                helper: { firstName: 'Ana', lastName: 'Souza', email: 'ana@x.com', phone: '11988887777' },
                provider: null,
            },
        ]);

        const helpers = await service.getRoutingHelpers('rot-1');

        expect(helpers).toEqual([
            { id: 'rh-1', collaboratorId: 'col-1', providerId: null,
              helperName: 'Ana Souza', helperPhone: '11988887777' },
        ]);
    });

    it('devolve nome fantasia e telefone do ajudante prestador PJ', async () => {
        prismaService.client.routingHelper.findMany.mockResolvedValue([
            {
                id: 'rh-2', helperId: null, providerId: 'prov-1',
                helper: null,
                provider: {
                    personType: 'PJ', tradeName: 'Transportes XPTO', companyName: 'XPTO LTDA',
                    firstName: null, lastName: null, email: 'xpto@x.com', phone: '11977776666',
                },
            },
        ]);

        const helpers = await service.getRoutingHelpers('rot-1');

        expect(helpers[0].helperName).toBe('Transportes XPTO');
        expect(helpers[0].helperPhone).toBe('11977776666');
    });

    it('devolve helperPhone null quando a pessoa nao tem telefone cadastrado', async () => {
        prismaService.client.routingHelper.findMany.mockResolvedValue([
            {
                id: 'rh-3', helperId: 'col-2', providerId: null,
                helper: { firstName: 'Beto', lastName: null, email: null, phone: null },
                provider: null,
            },
        ]);

        const helpers = await service.getRoutingHelpers('rot-1');

        expect(helpers[0].helperPhone).toBeNull();
        expect(helpers[0].helperName).toBe('Beto');
    });
});
```

Ajuste os nomes dos mocks ao padrão já usado no arquivo.

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npm test -- src/routing/service/routing.service.spec.ts -t getRoutingHelpers
```

Esperado: FAIL — objeto sem `helperPhone`.

- [ ] **Step 3: Migrar para o util**

Em `src/routing/service/routing.service.ts`:

1. **Apague** a interface `AjudanteRow` e a função `nomeDoAjudante` (linhas 97-136, com os docblocks).
2. Acrescente aos imports:

```ts
import { resolvePersonName, resolvePersonPhone } from 'src/shared/person-display.util';
```

3. Substitua o corpo de `getRoutingHelpers`:

```ts
    async getRoutingHelpers(
        routingId: string,
    ): Promise<
        Array<{
            id: string;
            collaboratorId: string | null;
            providerId: string | null;
            helperName: string | null;
            helperPhone: string | null;
        }>
    > {
        const companyId = this.getCompanyId();
        const rows = await this.prismaService.client.routingHelper.findMany({
            where: { routingId, companyId },
            // `include` de modelo inteiro: `phone` já vem daqui, sem select novo.
            include: { helper: true, provider: true },
            orderBy: { createdAt: 'asc' },
        });
        return rows.map((r) => {
            // Nome e telefone resolvidos pelo util compartilhado (antes havia uma
            // cópia byte a byte desta cascata aqui e outra em team.mapper.ts).
            const pessoa = { collaborator: r.helper, provider: r.provider, fallbackId: r.helperId };
            return {
                id: r.id,
                collaboratorId: r.helperId,
                providerId: r.providerId,
                helperName: resolvePersonName(pessoa),
                helperPhone: resolvePersonPhone(pessoa),
            };
        });
    }
```

Se o TypeScript reclamar do tipo de `r.helper`/`r.provider` contra `PersonDisplaySource`, o motivo é que o payload do Prisma traz campos a mais — isso é compatível estruturalmente. Se ainda assim reclamar (campos `null` vs `undefined`), tipe o argumento explicitamente com `satisfies PersonDisplaySource` ou faça o cast mínimo do objeto `pessoa`, **sem** alargar a assinatura do util.

- [ ] **Step 4: Rodar os testes e o build**

```bash
npm test -- src/routing
npm run build
```

Esperado: PASS. Testes existentes que esperavam o objeto exato de `getRoutingHelpers` vão falhar por causa do campo novo — atualize-os acrescentando `helperPhone`, sem afrouxar as asserções para `expect.objectContaining`.

- [ ] **Step 5: Commit**

```bash
git add src/routing/service/routing.service.ts src/routing/service/routing.service.spec.ts
git commit -m "feat(routing): helperPhone nos ajudantes da viagem

Sai por GET /routings/:id/helpers e embutido no GET /routings/:id, que e
o que o app do motorista ja consome. nomeDoAjudante e AjudanteRow saem:
viram chamadas ao util compartilhado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: `DriverProfileService` passa a usar o `PersonIdentityService`

Tarefa independente e **removível**: se o grafo de módulos resistir, o Bloco A entrega valor sem ela. Ela existe para que a assimetria "um lança, o outro devolve null" tenha uma casa só, e não duas.

**Files:**
- Modify: `src/driver/service/driver-profile.service.ts`
- Modify: `src/driver/driver.module.ts` (importar `PersonIdentityModule`)
- Test: `src/driver/service/driver-profile.service.spec.ts` (se existir; caso contrário, os testes do controller cobrem)

**Interfaces:**
- Consumes: `PersonIdentityService.resolveByKeycloakUserId` (Task 3).
- Produces: nada novo. `DriverMeDto` fica **idêntico** — esta é uma refatoração de comportamento preservado.

- [ ] **Step 1: Fixar o comportamento atual com um teste**

Antes de mudar qualquer linha, rode o que já existe e anote o resultado:

```bash
npm test -- src/driver
```

Esperado: PASS. Se `driver-profile.service.spec.ts` não existir, **crie-o** cobrindo os três caminhos (funcionário com driver, terceirizado com driver, usuário sem driver → `NotFoundException`) antes de refatorar. Refatorar sem rede é o que transforma esta tarefa opcional em regressão.

- [ ] **Step 2: Refatorar o `getMe`**

Em `src/driver/service/driver-profile.service.ts`, troque a resolução de pessoa pelo service novo, preservando a busca de `Driver` e a montagem do nome:

```ts
    async getMe(keycloakUserId: string): Promise<DriverMeDto> {
        const companyFeatures = await this.collaboratorService.getCompanyFeatures();

        // A assimetria entre os dois caminhos (um lança, o outro devolve null)
        // agora mora em PersonIdentityService — ver o docblock de lá.
        const pessoa = await this.personIdentityService.resolveByKeycloakUserId(keycloakUserId);

        if (pessoa?.personLinkType === 'COLLABORATOR') {
            const collaborator = pessoa.collaborator!;
            const driver = await this.driverService.findByCollaboratorId(pessoa.personId);
            if (driver) {
                return {
                    driverId: driver.id()!,
                    linkType: 'COLLABORATOR',
                    personId: pessoa.personId,
                    firstName: collaborator.firstName(),
                    lastName: collaborator.lastName(),
                    email: collaborator.email(),
                    companyFeatures,
                };
            }
        }

        if (pessoa?.personLinkType === 'PROVIDER') {
            const provider = pessoa.provider!;
            const driver = await this.driverService.findByProviderId(pessoa.personId);
            if (driver) {
                // `firstName`/`lastName` só existem no provider PESSOA FÍSICA. Para o
                // terceirizado PJ os dois são undefined e o GET /drivers/me devolvia um
                // motorista sem nome nenhum. Cascata: nome pessoal → nome fantasia →
                // razão social.
                const personalName = `${provider.firstName() ?? ''} ${provider.lastName() ?? ''}`.trim();
                return {
                    driverId: driver.id()!,
                    linkType: 'PROVIDER',
                    personId: pessoa.personId,
                    firstName: personalName
                        ? provider.firstName()
                        : provider.tradeName() || provider.companyName(),
                    lastName: personalName ? provider.lastName() : undefined,
                    email: provider.email(),
                    companyFeatures,
                };
            }
        }

        // Nunca inventar identidade: sem colaborador nem provider com Driver
        // vinculado, o usuário autenticado não é motorista.
        throw new NotFoundException('Motorista não encontrado para o usuário autenticado');
    }
```

Injete `private readonly personIdentityService: PersonIdentityService` no construtor.

**Por que não há nova busca aqui:** a entidade vem dentro do `ResolvedPerson` (Task 3). A versão anterior deste plano rebuscava a pessoa por id — e usava `providerService.findOne`, que **não existe** (o método é `findById`). Um round-trip a menos e um nome errado a menos.

`this.collaboratorService` continua injetado: `getCompanyFeatures()` ainda vem dele. `this.providerService` provavelmente fica sem uso após esta mudança — se o lint acusar, remova-o do construtor.

- [ ] **Step 3: Rodar os testes**

```bash
npm test -- src/driver
npm run build
```

Esperado: PASS, comportamento idêntico.

- [ ] **Step 4: Ligar o módulo**

Em `src/driver/driver.module.ts`, acrescente `forwardRef(() => PersonIdentityModule)` à lista `imports`.

- [ ] **Step 5: Verificar o boot**

```bash
npm run start:dev
```

Esperado: a aplicação sobe sem "Nest can't resolve dependencies". Encerre depois de confirmar. **Se o boot quebrar e o `forwardRef` não resolver, reverta esta tarefa** (`git checkout -- src/driver`) e siga: as Tasks 1-5 entregam o valor.

- [ ] **Step 6: Commit**

```bash
git add src/driver
git commit -m "refactor(driver): getMe usa PersonIdentityService

Comportamento preservado. A assimetria entre CollaboratorService (lanca)
e ProviderService (devolve null) passa a ter uma casa so.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Abrir a PR do Bloco A**

```bash
git push origin feat/equipe-contato-roster-me
```

PR contra `development`, título `feat(team): contato da equipe e GET /teams/roster/me`. No corpo: link para a spec, aviso de que **o app depende deste merge** e que não há migration.

---

# BLOCO B — App do motorista (`lab-app`)

Branch `feat/equipe-e-ajudantes-no-app` já existe (contém a spec). **Não mergear antes do Bloco A estar deployado.**

### Task 7: Remover o código morto de equipe do motorista

**Files:**
- Delete: `src/domain/agility/driver/useCase/useAssignDriverToTeam.ts`
- Delete: `src/domain/agility/driver/useCase/useRemoveDriverFromTeam.ts`
- Modify: `src/domain/agility/driver/useCase/index.ts:8-9`
- Modify: `src/domain/agility/driver/driverAPI.ts:67-76,93-94`
- Modify: `src/domain/agility/driver/driverService.ts:47-55,71-72`

**Interfaces:**
- Consumes: nada.
- Produces: nada. Remoção pura.

**Por quê:** `/drivers/:id/assign-team` e `/drivers/:id/remove-team` foram removidos do backend na entrega B do épico de equipes (confirmado por grep: zero ocorrências em `agility-services/src`). Estas chamadas são 404 garantido.

- [ ] **Step 1: Confirmar que ninguém consome**

```bash
grep -rn "useAssignDriverToTeam\|useRemoveDriverFromTeam\|assignToTeam\|removeFromTeam" src
```

Esperado: só as definições listadas acima e as duas linhas do `useCase/index.ts`. **Se aparecer um consumidor em tela, PARE** e reporte — a premissa desta tarefa caiu.

- [ ] **Step 2: Remover**

```bash
rm src/domain/agility/driver/useCase/useAssignDriverToTeam.ts
rm src/domain/agility/driver/useCase/useRemoveDriverFromTeam.ts
```

Em `src/domain/agility/driver/useCase/index.ts`, apague as linhas 8 e 9.
Em `driverAPI.ts`, apague as funções `assignToTeam` e `removeFromTeam` e suas entradas no objeto exportado.
Em `driverService.ts`, idem. Se `AssignDriverToTeamRequest` (ou tipo equivalente) ficar sem uso em `dto/`, apague-o também.

- [ ] **Step 3: Verificar que nada quebrou**

```bash
npx tsc --noEmit
npm run lint
```

Esperado: sem erro novo. (O lint do repo já emite ~121 warnings pré-existentes; o que importa é não aparecer **erro**, nem warning novo nos arquivos tocados.)

- [ ] **Step 4: Commit**

```bash
git add -A src/domain/agility/driver
git commit -m "chore(driver): remove chamadas mortas de equipe do motorista

/drivers/:id/assign-team e /remove-team foram removidos do backend na
entrega B do epico de equipes. Estas chamadas eram 404 garantido.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Contato — normalização de telefone e `PessoaContatoRow`

**Files:**
- Create: `src/functions/phoneContact.ts`
- Create: `src/functions/__tests__/phoneContact.test.ts`
- Create: `src/components/PessoaContatoRow/PessoaContatoRow.tsx`
- Create: `src/components/PessoaContatoRow/index.ts`
- Modify: `src/components/index.ts` (exportar o componente)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `toTelHref(phone: string | null): string | null`
  - `toWhatsAppHrefs(phone: string | null): { app: string; web: string } | null`
  - `<PessoaContatoRow nome={string} telefone={string | null} etiqueta={string | undefined} />`

  **Sem prop de habilidades**, apesar de a spec original dizer "habilidades exibidas": o
  roster devolve `skillIds` como **números** (`[1, 5, 7]`), não nomes. Renderizar ids crus
  para o motorista não informa nada, e traduzir para nome exigiria mais uma chamada a um
  endpoint de habilidades — escopo que ninguém pediu. Fica de fora, registrado.

  As Tasks 9 e 10 renderizam este componente.

**Confira antes de criar:** se já existir um helper de telefone em `src/functions/`, estenda-o em vez de criar outro arquivo.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/functions/__tests__/phoneContact.test.ts`:

```ts
import { toTelHref, toWhatsAppHrefs } from '../phoneContact'

describe('toTelHref', () => {
    it('monta o link tel: so com digitos', () => {
        expect(toTelHref('(11) 98888-7777')).toBe('tel:11988887777')
    })

    it('preserva o + do formato internacional', () => {
        expect(toTelHref('+55 11 98888-7777')).toBe('tel:+5511988887777')
    })

    it('devolve null para telefone ausente', () => {
        expect(toTelHref(null)).toBeNull()
        expect(toTelHref('   ')).toBeNull()
    })

    // Numero curto demais nao e telefone — abrir o discador com lixo e pior
    // do que nao oferecer o botao.
    it('devolve null para numero curto demais', () => {
        expect(toTelHref('1234')).toBeNull()
    })
})

describe('toWhatsAppHrefs', () => {
    it('acrescenta o DDI 55 quando o numero vem so com DDD', () => {
        expect(toWhatsAppHrefs('(11) 98888-7777')).toEqual({
            app: 'whatsapp://send?phone=5511988887777',
            web: 'https://wa.me/5511988887777',
        })
    })

    it('nao duplica o DDI quando ele ja veio', () => {
        expect(toWhatsAppHrefs('+55 11 98888-7777')?.web).toBe('https://wa.me/5511988887777')
    })

    it('devolve null para telefone ausente ou invalido', () => {
        expect(toWhatsAppHrefs(null)).toBeNull()
        expect(toWhatsAppHrefs('1234')).toBeNull()
    })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npx jest src/functions/__tests__/phoneContact.test.ts --watchAll=false
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

Crie `src/functions/phoneContact.ts`:

```ts
/**
 * Links de contato a partir de um telefone cadastrado.
 *
 * O telefone chega do backend como o operador digitou — com máscara, com DDI,
 * sem DDI, ou com lixo. Normalizar aqui, e não no componente, é o que impede
 * que cada tela invente a sua própria regra.
 */

/** Menor comprimento que ainda pode ser um telefone brasileiro com DDD (10 dígitos). */
const MIN_DIGITOS = 10

function apenasDigitos(phone: string): string {
    return phone.replace(/\D/g, '')
}

/**
 * Link do discador. Preserva o `+` inicial quando o cadastro veio em formato
 * internacional — o discador entende, e reescrever isso adivinhando o país
 * seria pior.
 */
export function toTelHref(phone: string | null): string | null {
    if (!phone?.trim()) return null
    const digitos = apenasDigitos(phone)
    if (digitos.length < MIN_DIGITOS) return null
    const internacional = phone.trim().startsWith('+')
    return `tel:${internacional ? '+' : ''}${digitos}`
}

/**
 * O WhatsApp exige DDI. Números cadastrados só com DDD (o caso comum aqui)
 * ganham 55.
 *
 * Devolve os dois links de propósito: o esquema `whatsapp://` só abre se o app
 * estiver instalado, e o chamador decide via `Linking.canOpenURL`. Sem o
 * fallback `wa.me`, o toque no botão não faz nada em celular sem WhatsApp —
 * falha silenciosa.
 */
export function toWhatsAppHrefs(phone: string | null): { app: string; web: string } | null {
    if (!phone?.trim()) return null
    const digitos = apenasDigitos(phone)
    if (digitos.length < MIN_DIGITOS) return null
    const comDDI = digitos.startsWith('55') && digitos.length > 11 ? digitos : `55${digitos}`
    return {
        app: `whatsapp://send?phone=${comDDI}`,
        web: `https://wa.me/${comDDI}`,
    }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npx jest src/functions/__tests__/phoneContact.test.ts --watchAll=false
```

Esperado: PASS, 8 testes.

- [ ] **Step 5: Criar o componente**

Crie `src/components/PessoaContatoRow/PessoaContatoRow.tsx`:

```tsx
import { Linking } from 'react-native'

import { toTelHref, toWhatsAppHrefs } from '@/functions/phoneContact'
import { measure } from '@/theme'

import { Box } from '../Box/Box'
import { Text } from '../Text/Text'
import { TouchableOpacityBox } from '../Box/TouchableOpacityBox'

interface PessoaContatoRowProps {
    nome: string
    telefone: string | null
    /** Etiqueta curta à direita do nome — ex.: "Líder", "Ajudante". */
    etiqueta?: string
}

/**
 * Uma pessoa numa lista, com os contatos que ela permite.
 *
 * Sem telefone a linha continua existindo, só sem os botões: esconder a pessoa
 * por falta de cadastro faria o motorista achar que a equipe está incompleta.
 */
export function PessoaContatoRow({ nome, telefone, etiqueta }: PessoaContatoRowProps) {
    const tel = toTelHref(telefone)
    const zap = toWhatsAppHrefs(telefone)

    async function abrirWhatsApp() {
        if (!zap) return
        // O esquema whatsapp:// só abre com o app instalado. Sem esta checagem,
        // o toque não faz nada em quem não tem WhatsApp.
        const temApp = await Linking.canOpenURL(zap.app).catch(() => false)
        Linking.openURL(temApp ? zap.app : zap.web)
    }

    return (
        <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            paddingVertical="y12"
            borderBottomWidth={1}
            borderBottomColor="gray200"
        >
            <Box flex={1} paddingRight="x12">
                <Text preset="text15" color="colorTextPrimary">
                    {nome}
                </Text>
                {!!etiqueta && (
                    <Text preset="text12" color="gray400" mt="y2">
                        {etiqueta}
                    </Text>
                )}
            </Box>

            {(tel || zap) && (
                <Box flexDirection="row" gap="x16" alignItems="center">
                    {!!tel && (
                        <TouchableOpacityBox
                            onPress={() => Linking.openURL(tel)}
                            accessibilityLabel={`Ligar para ${nome}`}
                            hitSlop={measure.x8}
                        >
                            <Text preset="text13" color="primary100">
                                Ligar
                            </Text>
                        </TouchableOpacityBox>
                    )}
                    {!!zap && (
                        <TouchableOpacityBox
                            onPress={abrirWhatsApp}
                            accessibilityLabel={`Abrir WhatsApp de ${nome}`}
                            hitSlop={measure.x8}
                        >
                            <Text preset="text13" color="primary100">
                                WhatsApp
                            </Text>
                        </TouchableOpacityBox>
                    )}
                </Box>
            )}
        </Box>
    )
}
```

Crie `src/components/PessoaContatoRow/index.ts`:

```ts
export { PessoaContatoRow } from './PessoaContatoRow'
```

E exporte de `src/components/index.ts` seguindo o padrão do arquivo.

**Ajuste os imports e os tokens** (`preset`, `color`, `measure`, caminho de `Box`/`Text`/`TouchableOpacityBox`) ao que o repo realmente usa — confira um componente vizinho antes de aceitar os nomes acima.

- [ ] **Step 6: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sem erro.

- [ ] **Step 7: Commit**

```bash
git add src/functions/phoneContact.ts src/functions/__tests__/phoneContact.test.ts src/components/PessoaContatoRow src/components/index.ts
git commit -m "feat(components): PessoaContatoRow com ligar e WhatsApp

Normalizacao de telefone em funcao pura testada (DDI, mascara, numero
invalido). WhatsApp com fallback wa.me: sem ele, o toque nao faz nada em
celular sem o app instalado.

Sem telefone a linha continua, so sem botoes — esconder a pessoa faria a
equipe parecer incompleta.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Ajudantes no detalhe da rota

**Files:**
- Modify: `src/domain/agility/routing/dto/response/routing.response.ts` (novo tipo + campo)
- Modify: `src/domain/agility/routing/dto/index.ts` (exportar o tipo)
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/AjudantesDaRota.tsx`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/index.ts`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/index.tsx`

**Interfaces:**
- Consumes: `PessoaContatoRow` (Task 8); `helpers` de `GET /routings/:id` (Task 5).
- Produces: `RoutingHelperResponse` (`id`, `collaboratorId`, `providerId`, `helperName`, `helperPhone`), reutilizado pela Task 10.

**Nenhuma requisição nova.** O `routing` do `RotaContext` vem de `useRouteDetails` → `useFindOneRouting` → `GET /routings/:id`, que embute `helpers`. (O `useFindMyRoutings` que também aparece no contexto responde outra pergunta — "há outra rota em andamento" — e o payload leve dele **não** traz `helpers`.)

- [ ] **Step 1: Declarar o tipo**

Em `src/domain/agility/routing/dto/response/routing.response.ts`, acrescente antes de `RoutingResponse`:

```ts
/**
 * Ajudante escalado para UMA viagem (`routing_helpers`) — a tripulação daquela
 * rota, montada pelo operador. Não confundir com a equipe fixa de cadastro
 * (`Team`/`TeamMember`), que é outra pergunta e outro endpoint.
 *
 * `id` é o id da LINHA de `routing_helpers`, não o da pessoa.
 * Exatamente um entre `collaboratorId` e `providerId` vem preenchido
 * (ajudante pode ser funcionário ou terceirizado).
 */
export interface RoutingHelperResponse {
    id: string
    collaboratorId: string | null
    providerId: string | null
    helperName: string | null
    /** Só vem do `GET /routings/:id`; ausente enquanto o backend não estiver deployado. */
    helperPhone?: string | null
}
```

E dentro de `RoutingResponse`, junto dos campos opcionais:

```ts
    /** Ajudantes da viagem. Só o `GET /routings/:id` embute; o payload leve das
     *  listagens não traz. Ausente também enquanto o backend não subir. */
    helpers?: RoutingHelperResponse[]
```

Exporte o tipo em `src/domain/agility/routing/dto/index.ts`:

```ts
export type { RoutingHelperResponse } from './response/routing.response'
```

- [ ] **Step 2: Criar o componente**

Crie `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/AjudantesDaRota.tsx`:

```tsx
import { Box, Text, PessoaContatoRow } from '@/components'
import type { RoutingHelperResponse } from '@/domain/agility/routing/dto'

interface AjudantesDaRotaProps {
    ajudantes: RoutingHelperResponse[] | undefined
}

/**
 * Quem está nesta viagem junto com o motorista.
 *
 * Renderiza `null` quando não há ajudante: rota sem tripulação extra é o caso
 * comum, e um título com lista vazia só ocuparia a tela e sugeriria que alguém
 * deveria estar ali.
 */
export function AjudantesDaRota({ ajudantes }: AjudantesDaRotaProps) {
    if (!ajudantes?.length) return null

    return (
        <Box marginBottom="y24">
            <Text preset="text15" fontWeightPreset="bold" color="colorTextPrimary" marginBottom="y8">
                {ajudantes.length === 1 ? 'Ajudante nesta rota' : 'Ajudantes nesta rota'}
            </Text>

            {ajudantes.map((ajudante) => (
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

Exporte em `_components/index.ts` seguindo o padrão do arquivo.

- [ ] **Step 3: Renderizar na tela**

Em `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/index.tsx`:
1. Acrescente `AjudantesDaRota` ao import vindo de `./_components`.
2. Pegue `routing` do `useRota()` (o contexto já o expõe).
3. Renderize **logo abaixo de `<RouteProgress …/>` e acima de `<RotaTabs …/>`**:

```tsx
<AjudantesDaRota ajudantes={routing?.helpers} />
```

Se o `RouteProgress` estiver dentro de um `ListHeaderComponent` de `FlatList`/`SectionList`, coloque o bloco no mesmo header — não como item da lista.

- [ ] **Step 4: Verificar tipos e lint**

```bash
npx tsc --noEmit
npm run lint
```

Esperado: sem erro novo.

- [ ] **Step 5: Roteiro manual (anotar no relatório da tarefa)**

Com o backend da Task 5 no ar:
1. Abrir uma rota **com** ajudante escalado → bloco aparece com nome e os dois botões.
2. Tocar "Ligar" → discador abre com o número.
3. Tocar "WhatsApp" → conversa abre (ou navegador em `wa.me`, se o app não estiver instalado).
4. Abrir uma rota **sem** ajudante → **nenhum** título e nenhum espaço extra.
5. Ajudante sem telefone cadastrado → nome aparece, botões não.

- [ ] **Step 6: Commit**

```bash
git add src/domain/agility/routing/dto "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/index.tsx"
git commit -m "feat(rota): mostra os ajudantes da viagem no detalhe da rota

O GET /routings/:id ja devolvia helpers e o app descartava o campo: o
RoutingResponse nem o declarava. Zero requisicao nova.

Bloco some quando nao ha ajudante.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Tela "Minha equipe" no menu

**Files:**
- Create: `src/domain/agility/team/dto/response/my-roster.response.ts`
- Create: `src/domain/agility/team/dto/index.ts`
- Create: `src/domain/agility/team/teamAPI.ts`
- Create: `src/domain/agility/team/teamService.ts`
- Create: `src/domain/agility/team/useCase/useMyTeamRoster.ts`
- Create: `src/domain/agility/team/useCase/index.ts`
- Create: `src/app/(auth)/(tabs)/menu/equipe/index.tsx`
- Modify: `src/domain/queryKeys.ts` (nova chave)
- Modify: `src/app/(auth)/(tabs)/menu/_layout.tsx` (registrar a rota)
- Modify: `src/app/(auth)/(tabs)/menu/index.tsx` (item de menu)

**Interfaces:**
- Consumes: `PessoaContatoRow` (Task 8), `RoutingHelperResponse` (Task 9), `useFindMyRoutings`/`useFindOneRouting` (já existem), `GET /teams/roster/me` (Task 4).
- Produces: tela final. Nada depende dela.

- [ ] **Step 1: Criar o DTO**

Crie `src/domain/agility/team/dto/response/my-roster.response.ts`:

```ts
/** Papel da pessoa dentro da equipe. */
export type TeamMemberRole = 'LEADER' | 'MEMBER'

export interface TeamRosterMemberResponse {
    /** Id do VÍNCULO (linha de team_members), não o da pessoa. */
    id: string
    teamId: string
    collaboratorId: string | null
    providerId: string | null
    role: TeamMemberRole
    personName: string | null
    /** Só o endpoint `roster/me` devolve este campo. */
    personPhone: string | null
    skillIds: number[]
    startDate: string | null
    endDate: string | null
}

/**
 * Resposta de `GET /teams/roster/me`.
 *
 * `personId` identifica QUEM PERGUNTOU: o roster inclui a própria pessoa por
 * contrato do backend, e é por este campo que a tela se filtra da lista.
 */
export interface MyRosterResponse {
    personId: string
    personType: 'COLLABORATOR' | 'PROVIDER'
    members: TeamRosterMemberResponse[]
}
```

Crie `src/domain/agility/team/dto/index.ts`:

```ts
export type {
    MyRosterResponse,
    TeamRosterMemberResponse,
    TeamMemberRole,
} from './response/my-roster.response'
```

- [ ] **Step 2: Criar API e service**

Crie `src/domain/agility/team/teamAPI.ts` (siga o padrão de `driverAPI.ts` — confira qual cliente ele usa, `apiService` ou `apiAgility`, e use o mesmo):

```ts
import { BaseResponse } from '@/api'
import { apiAgility } from '@/api/apiConfig'

import type { MyRosterResponse } from './dto'

/**
 * `GET /teams/roster/me` responde o objeto direto, SEM o envelope
 * `BaseResponse` dos demais endpoints — o TeamController devolve `toJson()`
 * cru, diferente do RoutingController, que passa por `ResponseHelper.success`.
 * Confirme a forma real na primeira execução e ajuste aqui, num lugar só.
 */
async function getMyRoster(date?: string): Promise<MyRosterResponse> {
    const { data } = await apiAgility.get<MyRosterResponse>('/teams/roster/me', {
        params: date ? { date } : {},
    })
    return data
}

export const teamAPI = {
    getMyRoster,
}
```

Crie `src/domain/agility/team/teamService.ts`:

```ts
import type { MyRosterResponse } from './dto'
import { teamAPI } from './teamAPI'

async function getMyRoster(date?: string): Promise<MyRosterResponse> {
    return teamAPI.getMyRoster(date)
}

export const teamService = {
    getMyRoster,
}
```

- [ ] **Step 3: Criar o hook**

Em `src/domain/queryKeys.ts`, acrescente junto das demais:

```ts
export const KEY_TEAMS = 'teams'
```

Crie `src/domain/agility/team/useCase/useMyTeamRoster.ts`:

```ts
import { useQuery } from '@tanstack/react-query'

import { KEY_TEAMS } from '@/domain/queryKeys'

import type { TeamRosterMemberResponse } from '../dto'
import { teamService } from '../teamService'

/**
 * A equipe fixa do motorista logado.
 *
 * O backend devolve o roster INCLUINDO a própria pessoa (contrato do P2) — o
 * filtro mora aqui, para que nenhuma tela precise lembrar dele. Compara pelo
 * `personId` do próprio envelope: não é preciso uma segunda chamada para o app
 * descobrir quem ele é.
 */
export function useMyTeamRoster() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_TEAMS, 'roster', 'me'],
        queryFn: () => teamService.getMyRoster(),
        retry: 2,
        staleTime: 5 * 60 * 1000,
    })

    const colegas: TeamRosterMemberResponse[] = (data?.members ?? []).filter(
        (m) => m.collaboratorId !== data?.personId && m.providerId !== data?.personId,
    )

    return {
        colegas,
        temEquipe: (data?.members?.length ?? 0) > 0,
        isLoading,
        isRefetching,
        isError,
        refetch,
    }
}
```

Crie `src/domain/agility/team/useCase/index.ts`:

```ts
export { useMyTeamRoster } from './useMyTeamRoster'
```

- [ ] **Step 4: Criar a tela**

Crie `src/app/(auth)/(tabs)/menu/equipe/index.tsx`:

```tsx
import { ActivityIndicator, Box, Text, PessoaContatoRow } from '@/components'
import { ButtonBack } from '@/components/Button/ButtonBack'
import { RoutingStatus } from '@/domain/agility/routing/dto/types'
import { useFindMyRoutings, useFindOneRouting } from '@/domain/agility/routing/useCase'
import { useMyTeamRoster } from '@/domain/agility/team/useCase'

export default function MinhaEquipeScreen() {
    const { colegas, temEquipe, isLoading, isError, refetch } = useMyTeamRoster()

    // Tripulação de hoje: os ajudantes da rota EM ANDAMENTO. Só o
    // `GET /routings/:id` embute `helpers`, por isso a segunda chamada — a
    // listagem devolve payload leve, sem tripulação.
    const { routings } = useFindMyRoutings({ status: RoutingStatus.IN_PROGRESS })
    const rotaEmAndamento = routings[0] ?? null
    const { routing } = useFindOneRouting(rotaEmAndamento?.id)
    const ajudantesDeHoje = routing?.helpers ?? []

    return (
        <Box scrollable flex={1} backgroundColor="white" px="x16" pt="y12" pb="y24">
            <ButtonBack />

            <Box alignItems="center" marginVertical="y14">
                <Text preset="text20" fontWeightPreset="bold" color="colorTextPrimary">
                    Minha equipe
                </Text>
            </Box>

            {isLoading && <ActivityIndicator />}

            {isError && !isLoading && (
                <Box marginBottom="y24">
                    <Text preset="text15" color="redError">
                        Não foi possível carregar sua equipe.
                    </Text>
                    <Text preset="text13" color="primary100" mt="y8" onPress={refetch}>
                        Tentar de novo
                    </Text>
                </Box>
            )}

            {!isLoading && !isError && (
                <Box marginBottom="y32">
                    {/* Estado vazio honesto: o motorista não cria equipe, então
                        não há ação a oferecer aqui — só a informação. */}
                    {!temEquipe && (
                        <Text preset="text15" color="gray400">
                            Você ainda não faz parte de uma equipe.
                        </Text>
                    )}

                    {temEquipe && colegas.length === 0 && (
                        <Text preset="text15" color="gray400">
                            Você é o único membro da sua equipe.
                        </Text>
                    )}

                    {colegas.map((colega) => (
                        <PessoaContatoRow
                            key={colega.id}
                            nome={colega.personName ?? 'Membro sem nome'}
                            telefone={colega.personPhone}
                            etiqueta={colega.role === 'LEADER' ? 'Líder' : undefined}
                        />
                    ))}
                </Box>
            )}

            {ajudantesDeHoje.length > 0 && (
                <Box marginBottom="y32">
                    <Text preset="text15" fontWeightPreset="bold" color="colorTextPrimary" marginBottom="y8">
                        Comigo hoje
                    </Text>
                    <Text preset="text12" color="gray400" marginBottom="y8">
                        Escalados na rota em andamento
                    </Text>

                    {ajudantesDeHoje.map((ajudante) => (
                        <PessoaContatoRow
                            key={ajudante.id}
                            nome={ajudante.helperName ?? 'Ajudante sem nome'}
                            telefone={ajudante.helperPhone ?? null}
                        />
                    ))}
                </Box>
            )}
        </Box>
    )
}
```

**Confira `RoutingStatus.IN_PROGRESS`** — use o nome real do enum em `routing/dto/types`. E confira se `ButtonBack` é o padrão das outras telas de `menu/` antes de aceitá-lo.

- [ ] **Step 5: Registrar a rota e o item de menu**

Em `src/app/(auth)/(tabs)/menu/_layout.tsx`, acrescente junto das demais:

```tsx
      <Stack.Screen
        name="equipe"
        options={{
          headerShown: false,
        }}
      />
```

Em `src/app/(auth)/(tabs)/menu/index.tsx`, acrescente ao array `itens` (depois de "Histórico de rotas"):

```tsx
    {
      label: 'Minha equipe',
      href: '/(auth)/(tabs)/menu/equipe',
      icon: require('@/assets/images/agility/menu/simbulo-hist-rotas-menu.png'),
    },
```

**Confira se existe um ícone melhor** em `src/assets/images/agility/menu/` antes de reusar o de histórico — o arquivo já reusa ícones em dois itens, então reusar é aceitável, mas um ícone próprio é melhor se existir.

- [ ] **Step 6: Verificar tipos e lint**

```bash
npx tsc --noEmit
npm run lint
```

Esperado: sem erro novo.

- [ ] **Step 7: Roteiro manual (anotar no relatório da tarefa)**

Com o backend do Bloco A no ar:
1. Motorista **com** equipe cadastrada → colegas listados, líder com a etiqueta, **o próprio motorista não aparece**.
2. Motorista **sem** equipe → "Você ainda não faz parte de uma equipe", sem erro e sem spinner preso.
3. Motorista sozinho na equipe → "Você é o único membro da sua equipe."
4. Com rota em andamento **com** ajudante → bloco "Comigo hoje" aparece.
5. Sem rota em andamento → bloco "Comigo hoje" **não** aparece.
6. Terceirizado logado → a tela funciona igual (é o teste que prova o `PersonIdentityService`).
7. Backend fora do ar → mensagem de erro com "Tentar de novo", não tela em branco.

- [ ] **Step 8: Commit e PR**

```bash
git add src/domain/agility/team src/domain/queryKeys.ts "src/app/(auth)/(tabs)/menu"
git commit -m "feat(menu): tela Minha equipe com equipe fixa e tripulacao de hoje

Consome GET /teams/roster/me (unico endpoint com telefone) e filtra a
propria pessoa pelo personId do envelope — o roster inclui quem
perguntou, por contrato do backend.

O bloco 'Comigo hoje' le os ajudantes da rota em andamento e some quando
nao ha rota.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"

git push origin feat/equipe-e-ajudantes-no-app
```

PR contra `main`, título `feat: equipe e ajudantes no app do motorista`. No corpo: link para a spec e **aviso de que depende do deploy do Bloco A**.

---

## Verificação final (depois das 10 tarefas)

- [ ] Backend: `npm test` completo verde e `npm run build` limpo.
- [ ] App: `npx tsc --noEmit` limpo e `npx jest --watchAll=false` verde.
- [ ] **O teste de vazamento, à mão:** logado como motorista, chamar
      `GET /teams/by-person/<qualquer-personId>` e `GET /teams` e confirmar que
      **nenhuma** resposta traz `personPhone`. Só o `roster/me` traz. Este é o
      requisito de privacidade da spec e nenhum teste automatizado o cobre
      ponta a ponta.
- [ ] Confirmar que `grep -rn "nomeDoAjudante\|assignToTeam\|removeFromTeam" src` devolve
      zero nos dois repos.
