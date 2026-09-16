# Chat e protocolo, fase 4: app do motorista — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Goal:** O motorista vê a resposta do operador ao reabrir a conversa, consegue abrir um atendimento novo depois do encerramento, não perde texto nem anexos quando o envio falha e continua recebendo mensagens depois de uma queda de rede ou de token vencido.

**Architecture:** A lógica que hoje mora solta na tela `menu/suporte/[id].tsx` vira funções puras e hooks testáveis em `src/domain/agility/chat` (mesclagem de mensagens, fila de envio, cache de mensagens, abertura de suporte). O cache do react-query passa a ser a fonte única das mensagens do servidor: a resposta do REST, o `chat_history` do WebSocket e o polling de fallback escrevem nele. O socket passa a ler o token a cada tentativa e a se reconectar sozinho mesmo quando o servidor derruba a conexão.

**Tech Stack:** React Native + Expo Router (typed routes), @tanstack/react-query 5, zustand, socket.io-client, Restyle, Jest (`jest-expo`) + `react-test-renderer`.

**Spec:** `project-docs/superpowers/specs/2026-09-16-auditoria-chat-protocolo.md` (no repo agility-services; achados F3, F4, F7, F8, F15 e "Menores" do app) e o índice `project-docs/superpowers/plans/2026-09-16-chat-protocolo-00-indice.md` (contratos C1–C5, no mesmo repo).

## Global Constraints

- **Repo:** `agility-app` (lab-app). **Uma PR contra `main`.** Branch `fix/chat-suporte-motorista`, criada de `origin/main` depois de `git fetch origin`. Confira `git log -1 --format=%cd origin/main`: se a data não mudou e você sabe que houve merge, o fetch falhou calado (histórico conhecido deste repo) — resolva antes de criar a branch.
- **Commits sem push**, mensagens **sem acento**, terminando com a linha `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- **Contrato C1/C2:** o app continua mandando `senderId` no corpo de `POST /chats/message` e `userType: 'DRIVER'` no handshake. **Não remova** esses campos. Nenhum campo novo pode ir no corpo (o backend usa `forbidNonWhitelisted` e responde 400): o `tempId` interno do Task 2 **não** pode vazar para a API.
- **Contrato C5:** `attachmentUrl` enviado é exatamente o item de `result.urls` devolvido por `POST /chats/upload`. Conferido no backend (`chat.controller.ts` `uploadAttachment` → `storage.upload` devolve a **chave** `chat/<companyId>/chat-<uuid><ext>`) e no app (`serviceUploadUtils.ts` lê `result.urls`). O plano mantém isso: um upload por arquivo, e a chave devolvida vai direto no envio.
- **Contrato C3 (atenção para a fase 1):** este plano passa a chamar `GET /chats/:chatId/unread/:userId` (Task 11) com o `userId` = `sub` do Keycloak do próprio motorista, só para o chat em que ele é participante. A PR precisa avisar a fase 1 para não fechar essa rota para o motorista participante. As demais rotas usadas já eram usadas antes: `GET /chats/user/:id/active`, `POST /chats/driver-support`, `GET /chats/:id`, `GET /chats/:id/messages`, `POST /chats/message`, `POST /chats/upload`, `PATCH /chats/:id/read/:userId`.
- **Sem alerta nativo.** O app tem `useToastService` (`src/services/Toast/useToast`); use só ele para avisos.
- **Não quebrar `returnTo`.** Tela aberta de outra aba recebe `returnTo` e o "voltar" faz `router.navigate(returnTo)`; a aba Menu tem `popToTopOnBlur` (`src/app/(auth)/(tabs)/_layout.tsx`).
- **Testes:** `npx jest <caminho> --watchAll=false` (o `npm test` roda em watch; não use). Suíte inteira: `npx jest --watchAll=false`. Mocks de leaf necessários ao importar o barrel `@/components`: `react-native-webview`, `@react-native-async-storage/async-storage`, `react-native-background-geolocation` (padrão de `src/app/(auth)/(tabs)/_rotas/components/__tests__/routesHeader.test.tsx`).
- **Tipos e lint:** `npx tsc --noEmit` sem erro novo; `npm run lint` com zero **erros** (há warnings pré-existentes; nenhum warning novo nos arquivos tocados). O husky roda lint no pre-commit.
- `.expo/types` não existe no worktree limpo, então o `tsc` não valida rotas tipadas. A remoção de rota (Task 9) é conferida por `git grep`, não pelo `tsc`.
- Comentários em português. Indentação: 4 espaços em `src/domain/**` e 2 espaços nas telas de `src/app/**` e em `src/components/**` (siga o arquivo que estiver editando).
- Constantes fixadas por este plano: `MAX_CHAT_ATTACHMENTS = 5` (o mesmo teto do `FilesInterceptor('files', 5)` do backend), `CHAT_OFFLINE_POLL_MS = 15_000`, `SUPPORT_UNREAD_POLL_MS = 60_000`, `CHAT_RECONNECT_DELAY_MAX_MS = 15_000`, aviso de desconexão depois de `3_000` ms, nova tentativa depois de o servidor derrubar a conexão em `min(30_000, 2_000 * 2^n)` ms.

## Decisões tomadas neste plano (o dono valida na PR)

1. **F8: uma mensagem por anexo, em sequência, com teto de 5.** Não dá para mandar vários anexos numa mensagem só: o `SendMessageDto` tem um único `attachmentUrl`, e mudar isso mexe no contrato C5 nos três repos. Limitar a 1 anexo tiraria uma capacidade que o seletor já oferece (`allowsMultipleSelection`), e o motorista usa isso para mandar várias fotos de uma avaria. O upload passa a ser **um arquivo por vez**, logo antes do envio da mensagem daquele arquivo. Assim não sobra no storage arquivo que nunca virou mensagem (hoje sobem todos e só o primeiro é enviado). Se o envio falhar no meio, o motorista fica só com o que não foi enviado. O texto digitado vai junto do primeiro anexo; os demais levam o rótulo que o app já usa hoje ("Imagem"/"Anexo").
2. **Contador de não lidas: polling leve (60 s) em vez de remover o badge.** Hoje o badge fica sempre em 0, porque só o socket da tela de conversa incrementa o contador, e essa mesma tela zera o número na hora. Sem badge, o motorista que desligou o push não tem nenhum sinal de que o operador respondeu, e esse é justamente o problema do F3. O custo é 1 GET por minuto, e só quando existe chat ativo. O push também invalida o contador (Task 6).
3. **"Novo atendimento" no aviso de encerrado cria o chat direto, sem assunto**, pelo mesmo find-or-create do backend, e troca a tela (`router.replace`). Voltar para a tela de assunto empilharia duas telas de Suporte quando a conversa veio de outra aba com `returnTo`.
4. **A bolha de anexo só sai da tela pela resposta do REST.** A heurística de "confirmado pelo servidor" (janela de 60 s) passa a valer só para texto, casando cada mensagem do servidor com no máximo uma bolha. Hoje, com vários anexos, o primeiro anexo real "confirmava" os seguintes e eles sumiam enquanto ainda subiam.
5. **Queda do socket:** reconexão sem limite de tentativas (intervalo máximo de 15 s); polling REST a cada 15 s enquanto desconectado; aviso visível depois de 3 s sem conexão; o histórico que o servidor manda a cada `join_chat` é gravado no cache.
6. **"Mensagem para torre"** abre direto `/menu/suporte/<id>`, mandando `serviceId` e o assunto `Problema no serviço #<serviceId>` (mesmo formato da tela de Suporte). O handler morto de "mensagem ao destinatário" sai.

## Fora de escopo

- A detecção de MIME no upload (`uploadChatAttachments` decide pela extensão e manda `application/octet-stream` quando não reconhece; o backend recusa). Anotar como pendência na PR.
- A lista `useChatStore.unreadByChat` e `useTotalUnreadCount` continuam existindo. Só o tab bar deixa de usá-las.
- Avaliação do atendimento, retenção de anexos e leitura por participante (ver o índice).

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/domain/agility/chat/utils/messageUtils.ts` (mod.) | funções puras: `toChatMessage`, `isRemoteUrl`, `withDisplayableAttachment`, `upsertServerMessages`, `pendingOptimisticMessages` |
| `src/domain/agility/chat/context/ChatContext.tsx` (mod.) | `getMergedMessages` delega a `pendingOptimisticMessages` |
| `src/domain/agility/chat/useCase/messagesCache.ts` (novo) | `chatMessagesKey`, `upsertMessagesInCache` |
| `src/domain/agility/chat/useCase/usePostMessage.ts` (mod.) | `tempId` opcional, upsert do resultado, remoção determinística |
| `src/domain/agility/chat/dto/types.ts` (mod.) | `OutgoingAttachment`, `ChatSendOutcome` |
| `src/domain/agility/chat/useCase/sendChatBatch.ts` (novo) | `planChatSends`, `runChatSends`, `appendAttachments`, `MAX_CHAT_ATTACHMENTS` |
| `src/components/ChatInput/ChatInput.tsx` (mod.) | só limpa o que foi enviado; teto de anexos |
| `src/components/ChatAttachmentButton/ChatAttachmentButton.tsx` (mod.) | `Attachment` = `OutgoingAttachment` |
| `src/domain/agility/chat/useCase/useGetChatMessages.ts` (mod.) | `staleTime: 0`, `refetchOnMount: 'always'`, polling opcional |
| `src/domain/queryKeys.ts` + `src/services/notification/NotificationContext.tsx` (mod.) | o push invalida chats e tickets |
| `src/domain/agility/chat/useCase/useChatWebSocket.ts` (mod.) | `onHistory`, auth como função, reconexão |
| `src/domain/agility/chat/useCase/useDisconnectedNotice.ts` (novo) | aviso com atraso |
| `src/domain/agility/chat/useCase/openSupportChat.ts` (novo) | `findOrCreateSupportChatId`, `supportChatHref`, `supportSubjectForService` |
| `src/domain/agility/chat/useCase/useFindActiveChatByUser.ts` (mod.) | sempre fresco ao montar |
| `src/domain/agility/chat/useCase/useSupportUnreadCount.ts` (novo) | badge do Menu |
| `src/app/(auth)/(tabs)/menu/suporte/index.tsx` (mod.) | "Continuar" = find-or-create; refetch ao focar |
| `src/app/(auth)/(tabs)/menu/suporte/[id].tsx` (mod.) | tela da conversa (envio, anexo, histórico, polling, aviso, encerrado, erro, `returnTo`) |
| `src/app/(auth)/(tabs)/menu/suporte/_utils/chatBodyState.ts` (novo) | carregando / erro / pronto |
| `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/index.tsx` (mod.) | botão Chat → Suporte |
| `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/nao-realizado/index.tsx` (mod.) | torre → conversa direta |
| `src/app/(auth)/(tabs)/menu/chat/index.tsx`, `src/components/ChatAttachmentView/*` (removidos) | legado |
| `src/components/index.ts`, `src/types/navigation.ts`, `src/services/notification/notificationRoutes.ts` (mod.) | referências ao legado |
| `src/components/CustomTabBar/CustomTabBar.tsx` (mod.) | badge vem do hook novo |

---

### Task 1: Funções puras de mensagem (conversão, anexo exibível, upsert, bolhas pendentes)

Corrige a parte "bolha duplicada/sumindo" dos menores e prepara os Tasks 2, 5 e 6.

**Files:**
- Modify: `src/domain/agility/chat/utils/messageUtils.ts` (acrescentar ao fim, mais um import no topo)
- Modify: `src/domain/agility/chat/context/ChatContext.tsx:6-10` (import) e `:115-159` (`getMergedMessages`)
- Test: `src/domain/agility/chat/utils/__tests__/messageUtils.test.ts` (novo)

**Interfaces:**
- Consumes: `ChatMessage`, `ParticipantType`, `MessageStatus` de `../dto/types`; `mergeAndSortMessages` e `isOptimisticMessage` (já existem no arquivo).
- Produces:
  ```ts
  export function toChatMessage(raw: unknown, chatId: string): ChatMessage
  export function isRemoteUrl(url: string | null | undefined): boolean
  export function withDisplayableAttachment(server: ChatMessage, localUri?: string): ChatMessage
  export function upsertServerMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[]
  export const OPTIMISTIC_TEXT_WINDOW_MS = 60_000
  export function pendingOptimisticMessages(optimistic: ChatMessage[], server: ChatMessage[]): ChatMessage[]
  ```

**Contexto:**
- `toChatMessage` substitui o `convertToChatMessage` local de `[id].tsx:66-81`. A diferença é que **preserva `senderKeycloakUserId`**. O original descartava esse campo, e por isso a heurística de confirmação nunca casava as mensagens vindas do REST.
- O servidor devolve a **chave** do anexo em `POST /chats/message` (`chat.service.ts` `sendMessage` devolve a entidade salva, sem URL assinada). Já `GET /messages`, `chat_history` e `new_message` devolvem URL assinada `https://…`. Daí as regras abaixo:
  - `withDisplayableAttachment` troca uma chave relativa pela URI local da foto;
  - `upsertServerMessages` não troca uma URL exibível por uma chave.
- Anexo **nunca** é confirmado por heurística (decisão 4): quem remove a bolha de anexo é o `onSuccess` do Task 2.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// src/domain/agility/chat/utils/__tests__/messageUtils.test.ts
import { MessageStatus, ParticipantType, type ChatMessage } from '../../dto/types';
import {
    isRemoteUrl,
    pendingOptimisticMessages,
    toChatMessage,
    upsertServerMessages,
    withDisplayableAttachment,
} from '../messageUtils';

function msg(over: Partial<ChatMessage> & { id: string }): ChatMessage {
    return {
        chatId: 'chat-1',
        senderId: 'driver-internal',
        senderType: ParticipantType.DRIVER,
        content: 'oi',
        status: MessageStatus.SENT,
        createdAt: '2026-09-16T12:00:00.000Z',
        ...over,
    };
}

describe('toChatMessage', () => {
    it('preserva senderKeycloakUserId e anexo', () => {
        const out = toChatMessage(
            {
                id: 'm1', senderId: 'int-1', senderKeycloakUserId: 'kc-1', senderType: 'DRIVER',
                content: 'x', attachmentUrl: 'https://s3/a.png', attachmentType: 'image',
                createdAt: '2026-09-16T12:00:00.000Z',
            },
            'chat-1',
        );
        expect(out).toMatchObject({
            id: 'm1', chatId: 'chat-1', senderKeycloakUserId: 'kc-1', attachmentUrl: 'https://s3/a.png',
        });
    });

    it('usa o chatId recebido quando a mensagem nao traz', () => {
        expect(toChatMessage({ id: 'm1' }, 'chat-9').chatId).toBe('chat-9');
    });
});

describe('isRemoteUrl', () => {
    it.each([
        ['https://bucket/x.pdf', true],
        ['HTTP://bucket/x.pdf', true],
        ['chat/company/chat-1.pdf', false],
        ['file:///data/x.jpg', false],
        ['javascript:alert(1)', false],
        [undefined, false],
    ])('%s -> %s', (url, expected) => {
        expect(isRemoteUrl(url)).toBe(expected);
    });
});

describe('withDisplayableAttachment', () => {
    it('troca chave relativa pela URI local', () => {
        const server = msg({ id: 'm1', attachmentUrl: 'chat/c1/chat-1.jpg' });
        expect(withDisplayableAttachment(server, 'file:///local.jpg').attachmentUrl).toBe('file:///local.jpg');
    });

    it('mantem URL assinada do servidor', () => {
        const server = msg({ id: 'm1', attachmentUrl: 'https://s3/x.jpg' });
        expect(withDisplayableAttachment(server, 'file:///local.jpg').attachmentUrl).toBe('https://s3/x.jpg');
    });

    it('sem URI local devolve a mensagem como veio', () => {
        const server = msg({ id: 'm1', attachmentUrl: 'chat/c1/chat-1.jpg' });
        expect(withDisplayableAttachment(server)).toBe(server);
    });
});

describe('upsertServerMessages', () => {
    it('a versao que chega substitui a existente de mesmo id', () => {
        const out = upsertServerMessages(
            [msg({ id: 'm1', status: MessageStatus.SENT })],
            [msg({ id: 'm1', status: MessageStatus.READ })],
        );
        expect(out).toHaveLength(1);
        expect(out[0].status).toBe(MessageStatus.READ);
    });

    it('nao troca URL exibivel por chave relativa', () => {
        const out = upsertServerMessages(
            [msg({ id: 'm1', attachmentUrl: 'file:///local.jpg' })],
            [msg({ id: 'm1', attachmentUrl: 'chat/c1/chat-1.jpg' })],
        );
        expect(out[0].attachmentUrl).toBe('file:///local.jpg');
    });

    it('troca URI local por URL assinada', () => {
        const out = upsertServerMessages(
            [msg({ id: 'm1', attachmentUrl: 'file:///local.jpg' })],
            [msg({ id: 'm1', attachmentUrl: 'https://s3/x.jpg' })],
        );
        expect(out[0].attachmentUrl).toBe('https://s3/x.jpg');
    });

    it('acrescenta as novas e ordena por createdAt', () => {
        const out = upsertServerMessages(
            [msg({ id: 'm2', createdAt: '2026-09-16T12:00:02.000Z' })],
            [msg({ id: 'm1', createdAt: '2026-09-16T12:00:01.000Z' })],
        );
        expect(out.map(m => m.id)).toEqual(['m1', 'm2']);
    });
});

describe('pendingOptimisticMessages', () => {
    const t0 = '2026-09-16T12:00:00.000Z';

    it('texto confirmado pelo servidor (casando pelo keycloak) sai da lista', () => {
        const optimistic = [msg({ id: 'temp-1', senderId: 'kc-1', content: 'oi', createdAt: t0 })];
        const server = [msg({
            id: 'm1', senderId: 'int-1', senderKeycloakUserId: 'kc-1', content: 'oi',
            createdAt: '2026-09-16T12:00:05.000Z',
        })];
        expect(pendingOptimisticMessages(optimistic, server)).toEqual([]);
    });

    it('uma mensagem do servidor confirma no maximo uma bolha', () => {
        const optimistic = [
            msg({ id: 'temp-1', senderId: 'kc-1', content: 'ok', createdAt: t0 }),
            msg({ id: 'temp-2', senderId: 'kc-1', content: 'ok', createdAt: '2026-09-16T12:00:01.000Z' }),
        ];
        const server = [msg({ id: 'm1', senderKeycloakUserId: 'kc-1', content: 'ok', createdAt: t0 })];
        expect(pendingOptimisticMessages(optimistic, server).map(m => m.id)).toEqual(['temp-2']);
    });

    it('anexo nunca e confirmado por heuristica', () => {
        const optimistic = [msg({ id: 'temp-1', senderId: 'kc-1', attachmentUrl: 'file:///a.jpg', createdAt: t0 })];
        const server = [msg({ id: 'm1', senderKeycloakUserId: 'kc-1', attachmentUrl: 'https://s3/a.jpg', createdAt: t0 })];
        expect(pendingOptimisticMessages(optimistic, server).map(m => m.id)).toEqual(['temp-1']);
    });

    it('fora da janela de 60s continua pendente', () => {
        const optimistic = [msg({ id: 'temp-1', senderId: 'kc-1', content: 'oi', createdAt: t0 })];
        const server = [msg({
            id: 'm1', senderKeycloakUserId: 'kc-1', content: 'oi', createdAt: '2026-09-16T12:01:00.000Z',
        })];
        expect(pendingOptimisticMessages(optimistic, server)).toHaveLength(1);
    });

    it('remetente diferente nao confirma', () => {
        const optimistic = [msg({ id: 'temp-1', senderId: 'kc-1', content: 'oi', createdAt: t0 })];
        const server = [msg({ id: 'm1', senderId: 'op-1', senderKeycloakUserId: 'kc-op', content: 'oi', createdAt: t0 })];
        expect(pendingOptimisticMessages(optimistic, server)).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/domain/agility/chat/utils/__tests__/messageUtils.test.ts --watchAll=false`
Expected: FAIL (`toChatMessage is not a function` e as demais funções novas indefinidas).

- [ ] **Step 3: Implementar**

No topo de `messageUtils.ts`, logo abaixo do `import type { ChatMessage } from '../dto/types';` que já existe:

```ts
import { MessageStatus, ParticipantType } from '../dto/types';
```

Ao fim do arquivo:

```ts
/**
 * Normaliza uma mensagem vinda da API ou do socket.
 * Preserva `senderKeycloakUserId`: sem ele a tela não reconhece a mensagem como própria
 * e a confirmação de bolha otimista nunca casa.
 */
export function toChatMessage(raw: unknown, chatId: string): ChatMessage {
    const m = (raw ?? {}) as Record<string, unknown>;
    return {
        id: String(m.id ?? ''),
        chatId: String(m.chatId ?? chatId),
        senderId: String(m.senderId ?? ''),
        senderKeycloakUserId: m.senderKeycloakUserId ? String(m.senderKeycloakUserId) : undefined,
        senderType: (m.senderType as ParticipantType) || ParticipantType.DRIVER,
        content: String(m.content ?? ''),
        attachmentUrl: m.attachmentUrl ? String(m.attachmentUrl) : undefined,
        attachmentType: m.attachmentType as ChatMessage['attachmentType'],
        status: (m.status as MessageStatus) || MessageStatus.SENT,
        readAt: m.readAt as string | undefined,
        deliveredAt: m.deliveredAt as string | undefined,
        createdAt: String(m.createdAt ?? new Date().toISOString()),
        updatedAt: m.updatedAt as string | undefined,
    };
}

/** Só http(s) é tratado como URL remota. Chave do storage, `file://` e outros esquemas não são. */
export function isRemoteUrl(url: string | null | undefined): boolean {
    return !!url && /^https?:\/\//i.test(url);
}

/**
 * `POST /chats/message` devolve a CHAVE do anexo (não assinada). Para a bolha não
 * quebrar até o próximo refetch, usa a URI local da foto no lugar da chave.
 */
export function withDisplayableAttachment(server: ChatMessage, localUri?: string): ChatMessage {
    if (!localUri || !server.attachmentUrl || isRemoteUrl(server.attachmentUrl)) {
        return server;
    }
    return { ...server, attachmentUrl: localUri };
}

/**
 * Insere/atualiza por id e ordena por data. A versão que chega vence, exceto quando
 * traria uma chave relativa no lugar de uma URL que a tela já consegue exibir.
 */
export function upsertServerMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
    const byId = new Map<string, ChatMessage>();
    for (const m of existing) byId.set(m.id, m);
    for (const m of incoming) {
        const prev = byId.get(m.id);
        const keepPrevAttachment =
            !!prev?.attachmentUrl && !!m.attachmentUrl && !isRemoteUrl(m.attachmentUrl);
        byId.set(m.id, keepPrevAttachment && prev ? { ...m, attachmentUrl: prev.attachmentUrl } : m);
    }
    return Array.from(byId.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

/** Tolerância de relógio aparelho × servidor para confirmar bolha de TEXTO. */
export const OPTIMISTIC_TEXT_WINDOW_MS = 60_000;

/**
 * Bolhas otimistas que o servidor ainda não confirmou.
 *
 * - Texto: mesmo remetente (senderId ou senderKeycloakUserId), mesmo conteúdo e dentro da
 *   janela. Cada mensagem do servidor confirma no máximo UMA bolha.
 * - Anexo: nunca por heurística. Sai só pelo `onSuccess` de `usePostMessage`. Antes, o
 *   primeiro anexo real "confirmava" os seguintes enquanto eles ainda subiam.
 */
export function pendingOptimisticMessages(optimistic: ChatMessage[], server: ChatMessage[]): ChatMessage[] {
    const claimed = new Set<string>();
    const ordered = [...optimistic].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const pending: ChatMessage[] = [];

    for (const opt of ordered) {
        if (opt.attachmentUrl) {
            pending.push(opt);
            continue;
        }
        const match = server.find((s) => {
            if (claimed.has(s.id) || isOptimisticMessage(s) || s.attachmentUrl) return false;
            const sameSender =
                String(s.senderId) === String(opt.senderId) ||
                (!!s.senderKeycloakUserId && String(s.senderKeycloakUserId) === String(opt.senderId));
            if (!sameSender) return false;
            const diff = Math.abs(new Date(s.createdAt).getTime() - new Date(opt.createdAt).getTime());
            return diff < OPTIMISTIC_TEXT_WINDOW_MS && s.content === opt.content;
        });
        if (match) claimed.add(match.id);
        else pending.push(opt);
    }
    return pending;
}
```

Em `ChatContext.tsx`, trocar o import das linhas 6-10 por:

```tsx
import {
    mergeAndSortMessages,
    generateTempId,
    isOptimisticMessage,
    pendingOptimisticMessages,
} from '../utils/messageUtils';
```

e o `getMergedMessages` inteiro (linhas 115-159) por:

```tsx
    // Mescla as mensagens do servidor com as bolhas otimistas ainda não confirmadas.
    // A regra de confirmação mora em `pendingOptimisticMessages` (coberta por teste).
    const getMergedMessages = useCallback(
        (chatId: string, serverMessages: ChatMessage[]): ChatMessage[] => {
            const optimistic = optimisticMessages[chatId] || [];
            return mergeAndSortMessages(serverMessages, pendingOptimisticMessages(optimistic, serverMessages));
        },
        [optimisticMessages]
    );
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/domain/agility/chat/utils/__tests__/messageUtils.test.ts --watchAll=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/agility/chat/utils/messageUtils.ts src/domain/agility/chat/utils/__tests__/messageUtils.test.ts src/domain/agility/chat/context/ChatContext.tsx
git commit -m "fix(chat): bolha de anexo nao some nem duplica por heuristica de confirmacao" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Cache de mensagens e `usePostMessage` determinístico

**Files:**
- Create: `src/domain/agility/chat/useCase/messagesCache.ts`
- Modify: `src/domain/agility/chat/useCase/usePostMessage.ts` (arquivo inteiro)
- Modify: `src/domain/agility/chat/useCase/useGetChatMessages.ts:3,11` (só a chave)
- Test: `src/domain/agility/chat/useCase/__tests__/usePostMessage.test.tsx` (novo)

**Interfaces:**
- Consumes (Task 1): `toChatMessage`, `withDisplayableAttachment`, `upsertServerMessages`.
- Produces:
  ```ts
  // messagesCache.ts
  export function chatMessagesKey(chatId: string): readonly ['chats', string, 'messages']
  export function upsertMessagesInCache(queryClient: QueryClient, chatId: string, incoming: ChatMessage[]): void
  // usePostMessage.ts
  export interface PostMessagePayload {
      chatId: Id; content: string; attachmentUrl?: string; attachmentType?: string;
      senderId?: string; replyToId?: string; tempId?: string;
  }
  export function usePostMessage(senderType?: string) // useMutation<BaseResponse<MessageItem>, Error, PostMessagePayload, { optimisticMessage: ChatMessage | null }>
  ```
  A tela usa `mutateAsync` (Task 5). Quando recebe `tempId`, o hook **não** cria uma segunda bolha: reaproveita a que a tela criou com a URI local.

**Contexto:**
- Bug atual: `[id].tsx:484` cria uma bolha com a URI local, e o `onMutate` cria **outra** com a chave relativa, que aparece como imagem quebrada. A tela remove a primeira no sucesso (`:513`); a segunda só sai se o socket entregar a mensagem real. Sem socket, ela fica até o app fechar, porque o store do zustand é global.
- `postMessageService` recebe o objeto inteiro. O `tempId` precisa sair antes do envio, porque o backend responde 400 para campo desconhecido. O `senderId` **continua** no corpo (C1).

- [ ] **Step 1: Escrever os testes que falham**

```tsx
// src/domain/agility/chat/useCase/__tests__/usePostMessage.test.tsx
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { MessageStatus, ParticipantType, type ChatMessage } from '../../dto/types';
import { useChatStore } from '../../store/useChatStore';
import { chatMessagesKey } from '../messagesCache';
import { usePostMessage } from '../usePostMessage';

const mockPostMessageService = jest.fn();
jest.mock('../../chatService', () => ({
    postMessageService: (...args: unknown[]) => mockPostMessageService(...args),
}));

type Hook = ReturnType<typeof usePostMessage>;

function setup() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    let hook!: Hook;
    function Probe() {
        hook = usePostMessage();
        return null;
    }
    act(() => {
        TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    return { queryClient, getHook: () => hook };
}

function serverMessage(over: Record<string, unknown>) {
    return {
        id: 'srv-1',
        chatId: 'chat-1',
        senderId: 'driver-internal',
        senderKeycloakUserId: 'kc-1',
        senderType: 'DRIVER',
        content: 'oi',
        status: 'SENT',
        createdAt: '2026-09-16T12:00:00.000Z',
        ...over,
    };
}

function cachedIds(queryClient: QueryClient) {
    return queryClient.getQueryData<{ result: ChatMessage[] }>(chatMessagesKey('chat-1'))?.result ?? [];
}

beforeEach(() => {
    mockPostMessageService.mockReset();
    useChatStore.setState({ optimisticMessages: {} });
});

describe('usePostMessage', () => {
    it('nao manda tempId para a API e mantem senderId (contrato C1)', async () => {
        mockPostMessageService.mockResolvedValue({ success: true, result: serverMessage({}) });
        const { getHook } = setup();

        await act(async () => {
            await getHook().mutateAsync({ chatId: 'chat-1', content: 'oi', senderId: 'kc-1', tempId: 'temp-x' });
        });

        const body = mockPostMessageService.mock.calls[0][0];
        expect(body).not.toHaveProperty('tempId');
        expect(body).toMatchObject({ chatId: 'chat-1', content: 'oi', senderId: 'kc-1' });
    });

    it('texto: grava a mensagem real no cache e remove a bolha', async () => {
        mockPostMessageService.mockResolvedValue({ success: true, result: serverMessage({}) });
        const { getHook, queryClient } = setup();

        await act(async () => {
            await getHook().mutateAsync({ chatId: 'chat-1', content: 'oi', senderId: 'kc-1' });
        });

        expect(cachedIds(queryClient).map((m) => m.id)).toEqual(['srv-1']);
        expect(useChatStore.getState().optimisticMessages['chat-1']).toEqual([]);
    });

    it('anexo com tempId: nao cria segunda bolha e troca a chave pela URI local', async () => {
        const local: ChatMessage = {
            id: 'temp-a', chatId: 'chat-1', senderId: 'kc-1', senderType: ParticipantType.DRIVER,
            content: 'Imagem', attachmentUrl: 'file:///foto.jpg', status: MessageStatus.SENT,
            createdAt: '2026-09-16T12:00:00.000Z',
        };
        useChatStore.getState().addOptimisticMessage('chat-1', local);
        let bubblesDuringRequest = -1;
        mockPostMessageService.mockImplementation(async () => {
            bubblesDuringRequest = useChatStore.getState().optimisticMessages['chat-1'].length;
            return {
                success: true,
                result: serverMessage({ attachmentUrl: 'chat/c1/chat-9.jpg', attachmentType: 'image' }),
            };
        });
        const { getHook, queryClient } = setup();

        await act(async () => {
            await getHook().mutateAsync({
                chatId: 'chat-1', content: 'Imagem', senderId: 'kc-1',
                attachmentUrl: 'chat/c1/chat-9.jpg', attachmentType: 'image', tempId: 'temp-a',
            });
        });

        expect(bubblesDuringRequest).toBe(1);
        expect(mockPostMessageService.mock.calls[0][0].attachmentUrl).toBe('chat/c1/chat-9.jpg'); // C5
        expect(cachedIds(queryClient)[0].attachmentUrl).toBe('file:///foto.jpg');
        expect(useChatStore.getState().optimisticMessages['chat-1']).toEqual([]);
    });

    it('erro: remove a bolha e rejeita', async () => {
        mockPostMessageService.mockRejectedValue(new Error('rede'));
        const { getHook } = setup();

        await act(async () => {
            await expect(
                getHook().mutateAsync({ chatId: 'chat-1', content: 'oi', senderId: 'kc-1' }),
            ).rejects.toThrow('rede');
        });

        expect(useChatStore.getState().optimisticMessages['chat-1']).toEqual([]);
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/domain/agility/chat/useCase/__tests__/usePostMessage.test.tsx --watchAll=false`
Expected: FAIL com `Cannot find module '../messagesCache'`.

- [ ] **Step 3: Implementar**

```ts
// src/domain/agility/chat/useCase/messagesCache.ts
import type { QueryClient } from '@tanstack/react-query';

import type { BaseResponse } from '@/api/baseResponse';
import { KEY_CHATS } from '@/domain/queryKeys';

import type { ChatMessage, MessageItem } from '../dto/types';
import { upsertServerMessages } from '../utils/messageUtils';

/** Chave única das mensagens de um chat (a mesma usada por `useGetChatMessages`). */
export function chatMessagesKey(chatId: string) {
    return [KEY_CHATS, chatId, 'messages'] as const;
}

/**
 * Grava mensagens do servidor no cache da conversa. Todas as fontes passam por aqui
 * (resposta do REST e `chat_history` do socket): o cache é a fonte única do que o
 * servidor já confirmou.
 */
export function upsertMessagesInCache(queryClient: QueryClient, chatId: string, incoming: ChatMessage[]): void {
    queryClient.setQueryData<BaseResponse<MessageItem[]>>(chatMessagesKey(chatId), (old) => ({
        ...(old ?? { success: true }),
        result: upsertServerMessages((old?.result ?? []) as ChatMessage[], incoming) as MessageItem[],
    }));
}
```

```ts
// src/domain/agility/chat/useCase/usePostMessage.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { BaseResponse } from '@/api/baseResponse';
import type { Id } from '@/types/base';

import { postMessageService } from '../chatService';
import type { AttachmentType, ChatMessage, MessageItem, SendMessagePayload } from '../dto/types';
import { MessageStatus, ParticipantType } from '../dto/types';
import { useChatStore } from '../store/useChatStore';
import { generateTempId, toChatMessage, withDisplayableAttachment } from '../utils/messageUtils';

import { chatMessagesKey, upsertMessagesInCache } from './messagesCache';

export interface PostMessagePayload {
    chatId: Id;
    content: string;
    attachmentUrl?: string;
    attachmentType?: string;
    /** keycloakUserId do motorista. Continua no corpo (contrato C1: o backend ignora, mas aceita). */
    senderId?: string;
    /** ID of the message being replied to */
    replyToId?: string;
    /** Bolha otimista já criada pela tela (anexo com URI local). NUNCA vai para a API. */
    tempId?: string;
}

interface MutationContext {
    optimisticMessage: ChatMessage | null;
}

export function usePostMessage(senderType: string = 'DRIVER') {
    const queryClient = useQueryClient();

    return useMutation<BaseResponse<MessageItem>, Error, PostMessagePayload, MutationContext>({
        mutationFn: (payload) => {
            // O backend recusa campo desconhecido (forbidNonWhitelisted): o tempId não pode ir.
            const body = { ...payload };
            delete body.tempId;
            return postMessageService(body as unknown as SendMessagePayload, senderType);
        },

        onMutate: async (payload) => {
            const chatId = String(payload.chatId);
            await queryClient.cancelQueries({ queryKey: chatMessagesKey(chatId) });

            if (payload.tempId) {
                const existing =
                    useChatStore.getState().optimisticMessages[chatId]?.find((m) => m.id === payload.tempId) ?? null;
                return { optimisticMessage: existing };
            }

            const optimisticMessage: ChatMessage = {
                id: generateTempId(),
                chatId,
                senderId: payload.senderId || '',
                senderType: senderType === 'DRIVER' ? ParticipantType.DRIVER : ParticipantType.SUPPORT,
                content: payload.content,
                attachmentUrl: payload.attachmentUrl,
                attachmentType: payload.attachmentType as AttachmentType | undefined,
                status: MessageStatus.SENT,
                createdAt: new Date().toISOString(),
            };
            useChatStore.getState().addOptimisticMessage(chatId, optimisticMessage);
            return { optimisticMessage };
        },

        onSuccess: (data, variables, context) => {
            const chatId = String(variables.chatId);
            const raw = data?.result;
            if (raw?.id) {
                // A mensagem real entra no cache ANTES de a bolha sair: nada pisca nem
                // some, com ou sem socket.
                const server = withDisplayableAttachment(
                    toChatMessage(raw, chatId),
                    context?.optimisticMessage?.attachmentUrl,
                );
                upsertMessagesInCache(queryClient, chatId, [server]);
            } else {
                queryClient.invalidateQueries({ queryKey: chatMessagesKey(chatId) });
            }
            if (context?.optimisticMessage) {
                useChatStore.getState().removeOptimisticMessage(chatId, context.optimisticMessage.id);
            }
        },

        onError: (_error, variables, context) => {
            if (context?.optimisticMessage) {
                useChatStore
                    .getState()
                    .removeOptimisticMessage(String(variables.chatId), context.optimisticMessage.id);
            }
        },
    });
}
```

Em `useGetChatMessages.ts`, fazer só o ajuste da chave (o Task 6 reescreve o arquivo):
- trocar `import { KEY_CHATS } from '@/domain/queryKeys'` por `import { chatMessagesKey } from './messagesCache'`;
- trocar `queryKey: [KEY_CHATS, chatId, 'messages'],` por `queryKey: chatMessagesKey(String(chatId ?? '')),`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/domain/agility/chat --watchAll=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/agility/chat/useCase/messagesCache.ts src/domain/agility/chat/useCase/usePostMessage.ts src/domain/agility/chat/useCase/useGetChatMessages.ts src/domain/agility/chat/useCase/__tests__/usePostMessage.test.tsx
git commit -m "fix(chat): envio grava a mensagem real no cache e nao cria bolha dupla de anexo" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Fila de envio (vários anexos, uma mensagem por anexo, sem perder o que falhou)

**Files:**
- Modify: `src/domain/agility/chat/dto/types.ts` (acrescentar ao fim)
- Create: `src/domain/agility/chat/useCase/sendChatBatch.ts`
- Test: `src/domain/agility/chat/useCase/__tests__/sendChatBatch.test.ts` (novo)

**Interfaces:**
- Produces:
  ```ts
  // dto/types.ts
  export interface OutgoingAttachment { uri: string; type: 'image' | 'document'; name?: string; size?: number }
  export interface ChatSendOutcome { unsentText: string; unsentAttachments: OutgoingAttachment[]; error?: unknown }
  // sendChatBatch.ts
  export const MAX_CHAT_ATTACHMENTS = 5
  export interface ChatSendStep { content: string; attachment?: OutgoingAttachment; carriesText: boolean }
  export function attachmentPlaceholder(a: OutgoingAttachment): string   // 'Imagem' | 'Anexo'
  export function planChatSends(text: string, attachments: OutgoingAttachment[]): ChatSendStep[]
  export function runChatSends(text: string, attachments: OutgoingAttachment[], sendStep: (step: ChatSendStep) => Promise<void>): Promise<ChatSendOutcome>
  export function appendAttachments(current: OutgoingAttachment[], selected: OutgoingAttachment[], max?: number): { list: OutgoingAttachment[]; truncated: boolean }
  ```
  Consumidores: `ChatInput` (Task 4) e `[id].tsx` (Task 5).

- [ ] **Step 1: Escrever os testes que falham**

```ts
// src/domain/agility/chat/useCase/__tests__/sendChatBatch.test.ts
import type { OutgoingAttachment } from '../../dto/types';
import { appendAttachments, planChatSends, runChatSends, type ChatSendStep } from '../sendChatBatch';

const foto = (n: number): OutgoingAttachment => ({ uri: `file:///foto${n}.jpg`, type: 'image' });
const pdf: OutgoingAttachment = { uri: 'file:///nota.pdf', type: 'document', name: 'nota.pdf' };

describe('planChatSends', () => {
    it('so texto: um passo com o texto', () => {
        expect(planChatSends('  oi  ', [])).toEqual([{ content: 'oi', carriesText: true }]);
    });

    it('sem texto e sem anexo: nada a enviar', () => {
        expect(planChatSends('   ', [])).toEqual([]);
    });

    it('um passo por anexo; o texto vai no primeiro, os outros levam o rotulo', () => {
        expect(planChatSends('avaria', [foto(1), pdf])).toEqual([
            { content: 'avaria', attachment: foto(1), carriesText: true },
            { content: 'Anexo', attachment: pdf, carriesText: false },
        ]);
    });

    it('anexo sem texto leva o rotulo do tipo', () => {
        expect(planChatSends('', [foto(1)])[0]).toEqual({ content: 'Imagem', attachment: foto(1), carriesText: false });
    });
});

describe('runChatSends', () => {
    it('tudo enviado: nada sobra, na ordem', async () => {
        const sent: ChatSendStep[] = [];
        const out = await runChatSends('oi', [foto(1), foto(2)], async (s) => {
            sent.push(s);
        });
        expect(out).toEqual({ unsentText: '', unsentAttachments: [] });
        expect(sent.map((s) => s.attachment?.uri)).toEqual(['file:///foto1.jpg', 'file:///foto2.jpg']);
    });

    it('falha no primeiro: devolve texto e todos os anexos, e para', async () => {
        const send = jest.fn().mockRejectedValue(new Error('rede'));
        const out = await runChatSends('oi', [foto(1), foto(2)], send);
        expect(send).toHaveBeenCalledTimes(1);
        expect(out.unsentText).toBe('oi');
        expect(out.unsentAttachments).toEqual([foto(1), foto(2)]);
        expect(out.error).toEqual(new Error('rede'));
    });

    it('falha no meio: o texto ja foi, sobram so os anexos nao enviados', async () => {
        const send = jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('x'));
        const out = await runChatSends('oi', [foto(1), foto(2), foto(3)], send);
        expect(send).toHaveBeenCalledTimes(2);
        expect(out.unsentText).toBe('');
        expect(out.unsentAttachments).toEqual([foto(2), foto(3)]);
    });

    it('so texto que falha: devolve o texto', async () => {
        const out = await runChatSends('oi', [], jest.fn().mockRejectedValue(new Error('x')));
        expect(out).toMatchObject({ unsentText: 'oi', unsentAttachments: [] });
    });
});

describe('appendAttachments', () => {
    it('acumula ate o teto e avisa quando corta', () => {
        const atual = [foto(1), foto(2), foto(3), foto(4)];
        expect(appendAttachments(atual, [foto(5), foto(6)])).toEqual({
            list: [foto(1), foto(2), foto(3), foto(4), foto(5)],
            truncated: true,
        });
    });

    it('dentro do teto nao corta', () => {
        expect(appendAttachments([], [foto(1)])).toEqual({ list: [foto(1)], truncated: false });
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/domain/agility/chat/useCase/__tests__/sendChatBatch.test.ts --watchAll=false`
Expected: FAIL com `Cannot find module '../sendChatBatch'`.

- [ ] **Step 3: Implementar**

Ao fim de `dto/types.ts`:

```ts
/** Anexo escolhido no aparelho e ainda não enviado. */
export interface OutgoingAttachment {
  uri: string
  type: 'image' | 'document'
  name?: string
  size?: number
}

/**
 * Resultado de um envio pelo ChatInput: o que NÃO foi enviado volta para o campo.
 * Sucesso total = texto vazio e lista vazia.
 */
export interface ChatSendOutcome {
  unsentText: string
  unsentAttachments: OutgoingAttachment[]
  error?: unknown
}
```

```ts
// src/domain/agility/chat/useCase/sendChatBatch.ts
import type { ChatSendOutcome, OutgoingAttachment } from '../dto/types';

/**
 * Teto de anexos por envio: o mesmo do `FilesInterceptor('files', 5)` do backend.
 * Cada anexo vira UMA mensagem, porque `SendMessageDto` tem um único `attachmentUrl` (contrato C5).
 */
export const MAX_CHAT_ATTACHMENTS = 5;

export interface ChatSendStep {
    content: string;
    attachment?: OutgoingAttachment;
    /** Este passo leva o texto digitado (se falhar, o texto volta para o campo). */
    carriesText: boolean;
}

/** Rótulo que o app já mandava como conteúdo de mensagem só com anexo. */
export function attachmentPlaceholder(a: OutgoingAttachment): string {
    return a.type === 'image' ? 'Imagem' : 'Anexo';
}

export function planChatSends(text: string, attachments: OutgoingAttachment[]): ChatSendStep[] {
    const trimmed = text.trim();
    if (attachments.length === 0) {
        return trimmed ? [{ content: trimmed, carriesText: true }] : [];
    }
    return attachments.map((attachment, i) => {
        const carriesText = i === 0 && !!trimmed;
        return { content: carriesText ? trimmed : attachmentPlaceholder(attachment), attachment, carriesText };
    });
}

/**
 * Envia em sequência e para no primeiro erro. Devolve só o que não foi enviado:
 * o motorista toca em enviar de novo sem duplicar o que já foi.
 */
export async function runChatSends(
    text: string,
    attachments: OutgoingAttachment[],
    sendStep: (step: ChatSendStep) => Promise<void>,
): Promise<ChatSendOutcome> {
    const steps = planChatSends(text, attachments);
    for (let i = 0; i < steps.length; i++) {
        try {
            await sendStep(steps[i]);
        } catch (error) {
            const rest = steps.slice(i);
            return {
                unsentText: rest.some((s) => s.carriesText) ? text.trim() : '',
                unsentAttachments: rest.flatMap((s) => (s.attachment ? [s.attachment] : [])),
                error,
            };
        }
    }
    return { unsentText: '', unsentAttachments: [] };
}

export function appendAttachments(
    current: OutgoingAttachment[],
    selected: OutgoingAttachment[],
    max: number = MAX_CHAT_ATTACHMENTS,
): { list: OutgoingAttachment[]; truncated: boolean } {
    const merged = [...current, ...selected];
    return { list: merged.slice(0, max), truncated: merged.length > max };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/domain/agility/chat/useCase/__tests__/sendChatBatch.test.ts --watchAll=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/agility/chat/dto/types.ts src/domain/agility/chat/useCase/sendChatBatch.ts src/domain/agility/chat/useCase/__tests__/sendChatBatch.test.ts
git commit -m "feat(chat): fila de envio com uma mensagem por anexo e retorno do que falhou" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `ChatInput` só limpa o que foi enviado

Menor do app: "texto perdido no envio falho". O `ChatInput` já faz `await onSendMessage(...)` antes de limpar (`ChatInput.tsx:51-53`), mas a tela devolve `void` síncrono. Resultado: o campo é limpo antes de o envio terminar. O contrato passa a ser `Promise<ChatSendOutcome>`.

**Files:**
- Modify: `src/components/ChatInput/ChatInput.tsx:1-69` (props, `handleSend`, `handleAttachmentsSelected`, `testID` no botão)
- Modify: `src/components/ChatAttachmentButton/ChatAttachmentButton.tsx:12-17` (tipo `Attachment`)
- Test: `src/components/ChatInput/__tests__/ChatInput.test.tsx` (novo)

**Interfaces:**
- Consumes (Task 3): `OutgoingAttachment`, `ChatSendOutcome`, `appendAttachments`, `MAX_CHAT_ATTACHMENTS`.
- Produces:
  ```ts
  interface ChatInputProps {
    onSendMessage: (content: string, attachments?: OutgoingAttachment[]) => Promise<ChatSendOutcome>;
    // demais props iguais
  }
  // testID do botão de enviar: 'chat-input-send'
  ```
  Único chamador vivo depois do Task 9: `menu/suporte/[id].tsx` (Task 5). O `menu/chat` legado ainda chama com a assinatura antiga até ser apagado no Task 9. Se o `tsc` reclamar dele entre os Tasks 4 e 9, é esperado; ele some no Task 9. Não conserte o legado.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/components/ChatInput/__tests__/ChatInput.test.tsx
import React from 'react';
import { TextInput } from 'react-native';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import type { ChatSendOutcome } from '@/domain/agility/chat/dto/types';
import { theme } from '@/theme';

import ChatInput from '../ChatInput';

jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-background-geolocation', () => ({
    __esModule: true,
    default: { ready: jest.fn(), onLocation: jest.fn(), removeListeners: jest.fn() },
}));
// O botão de anexo abre câmera/galeria (módulos nativos). Aqui só importa o campo de texto.
jest.mock('../../ChatAttachmentButton', () => ({ __esModule: true, default: () => null }));
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: jest.fn() }) }));

function render(onSendMessage: (c: string) => Promise<ChatSendOutcome>) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ChatInput onSendMessage={onSendMessage} onTyping={jest.fn()} />
            </ThemeProvider>,
        );
    });
    return tree;
}

async function digitarEEnviar(tree: TestRenderer.ReactTestRenderer, texto: string) {
    act(() => {
        tree.root.findByType(TextInput).props.onChangeText(texto);
    });
    await act(async () => {
        await tree.root.findAllByProps({ testID: 'chat-input-send' })[0].props.onPress();
    });
}

describe('ChatInput', () => {
    it('envio que falha devolve o texto ao campo', async () => {
        const tree = render(async () => ({ unsentText: 'oi', unsentAttachments: [], error: new Error('x') }));
        await digitarEEnviar(tree, 'oi');
        expect(tree.root.findByType(TextInput).props.value).toBe('oi');
    });

    it('envio bem-sucedido limpa o campo', async () => {
        const tree = render(async () => ({ unsentText: '', unsentAttachments: [] }));
        await digitarEEnviar(tree, 'oi');
        expect(tree.root.findByType(TextInput).props.value).toBe('');
    });

    it('erro inesperado (promessa rejeitada) nao apaga o texto', async () => {
        const tree = render(async () => {
            throw new Error('bug');
        });
        await digitarEEnviar(tree, 'oi');
        expect(tree.root.findByType(TextInput).props.value).toBe('oi');
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/ChatInput/__tests__/ChatInput.test.tsx --watchAll=false`
Expected: FAIL. O botão não tem `testID` (`Cannot read properties of undefined (reading 'props')`), e o texto é limpo mesmo quando o envio falha.

- [ ] **Step 3: Implementar**

Em `ChatAttachmentButton.tsx`, trocar a interface local (linhas 12-17) por um alias do tipo do domínio (uma definição só):

```tsx
import type { OutgoingAttachment } from '@/domain/agility/chat/dto/types';

export type Attachment = OutgoingAttachment;
```

Em `ChatInput.tsx`, trocar as linhas 1-69 por:

```tsx
import React, { useState, useCallback, useRef } from 'react';
import { TextInput as TextInputRN, type TextInput as TextInputRef } from 'react-native';
const TextInput = TextInputRN;

import { Box, Text, TouchableOpacityBox } from '@/components';
import type { ChatSendOutcome } from '@/domain/agility/chat/dto/types';
import { appendAttachments, MAX_CHAT_ATTACHMENTS } from '@/domain/agility/chat/useCase/sendChatBatch';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import ChatAttachmentButton, { type Attachment } from '../ChatAttachmentButton';

interface ChatInputProps {
  /**
   * Devolve o que NÃO foi enviado; o campo fica só com isso.
   * Promessa rejeitada = erro inesperado: nada é apagado.
   */
  onSendMessage: (content: string, attachments?: Attachment[]) => Promise<ChatSendOutcome>;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  disableAttachments?: boolean;
  maxLength?: number;
}

const MAX_LENGTH_DEFAULT = 2000;

export default function ChatInput({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = 'Digite uma mensagem...',
  disableAttachments = false,
  maxLength = MAX_LENGTH_DEFAULT,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInputRef>(null);
  const { showToast } = useToastService();

  const hasAttachments = attachments.length > 0;
  const hasContent = message.trim().length > 0 || hasAttachments;
  const isDisabled = disabled || sending;
  const canSend = hasContent && !isDisabled;

  const handleInputChange = useCallback((value: string) => {
    setMessage(value);
    onTyping(value.length > 0);
  }, [onTyping]);

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    setSending(true);
    try {
      const outcome = await onSendMessage(message.trim(), hasAttachments ? attachments : undefined);
      setMessage(outcome.unsentText);
      setAttachments(outcome.unsentAttachments);
      if (!outcome.unsentText && outcome.unsentAttachments.length === 0) {
        onTyping(false);
        inputRef.current?.focus();
      }
    } catch (error) {
      // Erro inesperado: mantém texto e anexos para o motorista tentar de novo.
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  }, [canSend, message, attachments, hasAttachments, onSendMessage, onTyping]);

  const handleAttachmentsSelected = useCallback((selected: Attachment[]) => {
    const { list, truncated } = appendAttachments(attachments, selected);
    setAttachments(list);
    if (truncated) {
      showToast({ message: `Envie no máximo ${MAX_CHAT_ATTACHMENTS} anexos por vez.`, type: 'error' });
    }
  }, [attachments, showToast]);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);
```

No `TouchableOpacityBox` do botão de enviar (hoje na linha 112), acrescentar `testID="chat-input-send"` e `accessibilityLabel="Enviar mensagem"`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/components/ChatInput/__tests__/ChatInput.test.tsx --watchAll=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatInput/ChatInput.tsx src/components/ChatInput/__tests__/ChatInput.test.tsx src/components/ChatAttachmentButton/ChatAttachmentButton.tsx
git commit -m "fix(chat): campo de mensagem so limpa o que foi enviado" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Tela da conversa — envio em fila e documento que abre

Liga os Tasks 1–4 à tela. Resolve o F8, o "texto perdido" e o "documento sem `onPress`".

**Files:**
- Modify: `src/app/(auth)/(tabs)/menu/suporte/[id].tsx` (imports; `convertToChatMessage` sai; `MessageItem`; bloco de envio; `renderItem`; posição de `isChatClosed`)

**Interfaces:**
- Consumes: `toChatMessage`, `isRemoteUrl` (Task 1); `usePostMessage().mutateAsync` com `tempId` (Task 2); `runChatSends`, `ChatSendStep` (Task 3); `OutgoingAttachment`, `ChatSendOutcome`; `ChatInput.onSendMessage: (...) => Promise<ChatSendOutcome>` (Task 4).
- Produces (usados nos Tasks 6, 8 e 12, no mesmo arquivo): `handleSendFailure(error, fallbackMsg?)`, `isChatClosed` definido logo depois dos `useState`, e `queryClient` em uso.

**Sem teste unitário novo:** a tela não tem teste, e a lógica que ela usa foi coberta nos Tasks 1–4. A verificação aqui é `tsc`, lint e o roteiro manual (itens M4–M7).

- [ ] **Step 1: Imports**

Trocar as linhas 1-2 por:

```tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FlatList, Image, Linking } from 'react-native';
```

Trocar as linhas 30-31 por:

```tsx
import { getChatService, markChatReadService } from '@/domain/agility/chat/chatService';
import type { AttachmentType, ChatSendOutcome, OutgoingAttachment } from '@/domain/agility/chat/dto/types';
import { runChatSends, type ChatSendStep } from '@/domain/agility/chat/useCase/sendChatBatch';
import { generateTempId, isRemoteUrl, toChatMessage } from '@/domain/agility/chat/utils/messageUtils';
```

Apagar a função `convertToChatMessage` inteira (linhas 66-81) e, no `useMemo` de `convertedApiMessages` (linha 284), trocar `convertToChatMessage(msg, chatId || '')` por `toChatMessage(msg, chatId || '')`.

- [ ] **Step 2: Documento abre com `Linking`**

Em `MessageItemProps` (linha 85), acrescentar:

```tsx
  onOpenAttachment: (url: string) => void;
```

Na assinatura de `MessageItem` (linha 119), acrescentar `onOpenAttachment` à desestruturação e, logo abaixo de `const isOptimistic = ...` (linha 129):

```tsx
  // Só URL http(s) do servidor abre. URI local (bolha ainda enviando) e chave do storage não.
  const canOpenAttachment = isRemoteUrl(msg.attachmentUrl);
```

No bloco "Anexo - Documento" (linhas 195-211), acrescentar ao `TouchableOpacityBox`:

```tsx
            disabled={!canOpenAttachment}
            onPress={() => {
              if (msg.attachmentUrl) onOpenAttachment(msg.attachmentUrl);
            }}
            accessibilityRole="link"
            accessibilityLabel="Abrir anexo"
            opacity={canOpenAttachment ? 1 : 0.6}
```

Na tela principal, logo depois de `const { showToast } = useToastService();`:

```tsx
  const handleOpenAttachment = useCallback(
    (url: string) => {
      Linking.openURL(url).catch(() => {
        showToast({ message: 'Não foi possível abrir o anexo', type: 'error' });
      });
    },
    [showToast],
  );
```

Em `renderItem` (linhas 612-618), passar `onOpenAttachment={handleOpenAttachment}` ao `<MessageItem>` e acrescentar `handleOpenAttachment` às dependências do `useCallback`.

- [ ] **Step 3: `isChatClosed` sobe**

Apagar a linha 632 (`const isChatClosed = ...`) e recolocá-la logo depois de `const [chatStatus, setChatStatus] = useState<ChatStatus>(ChatStatus.ACTIVE);` (linha 261). É preciso, porque o `handleSendMessage` abaixo passa a usá-la:

```tsx
  const isChatClosed = chatStatus === ChatStatus.CLOSED || chatInfo?.status === ChatStatus.CLOSED;
```

(`chatInfo` é declarado na linha 260, antes desta.)

- [ ] **Step 4: Envio em fila**

Trocar as linhas 316-323 (`usePostMessage` e `useChatAttachmentUpload` com `onError`) por:

```tsx
  const { mutateAsync: postMessage, isPending: isSending } = usePostMessage();
  // Sem onError aqui: o aviso de falha sai uma vez só, pelo resultado da fila.
  const { uploadAttachments, isLoading: uploadingAttachment } = useChatAttachmentUpload();
```

Trocar o bloco inteiro de `handleSendMessage` (linhas 458-553) por:

```tsx
  // Um passo da fila: texto puro, ou um anexo (bolha local -> upload -> mensagem com a chave).
  const sendStep = useCallback(
    async (step: ChatSendStep) => {
      if (!chatId) throw new Error('CHAT_ID_MISSING');
      const senderId = currentUserSenderId ?? undefined;

      if (!step.attachment) {
        await postMessage({ chatId, content: step.content, senderId });
        return;
      }

      const attachment = step.attachment;
      const tempId = generateTempId();
      addOptimisticMessage(chatId, {
        id: tempId,
        chatId,
        senderId: currentUserSenderId || '',
        senderType: ParticipantType.DRIVER,
        content: step.content,
        attachmentUrl: attachment.uri, // URI local: aparece na hora
        attachmentType: attachment.type as unknown as AttachmentType,
        status: MessageStatus.SENT,
        createdAt: new Date().toISOString(),
      });

      try {
        const upload = await uploadAttachments({ files: [attachment.uri], chatId });
        const key = upload.result?.urls?.[0];
        if (!key) throw new Error('UPLOAD_WITHOUT_KEY');
        // Contrato C5: a chave devolvida pelo /chats/upload vai exatamente como veio.
        await postMessage({
          chatId,
          content: step.content,
          senderId,
          attachmentUrl: key,
          attachmentType: attachment.type,
          tempId,
        });
      } catch (error) {
        removeOptimisticMessage(chatId, tempId);
        throw error;
      }
    },
    [chatId, currentUserSenderId, postMessage, uploadAttachments, addOptimisticMessage, removeOptimisticMessage],
  );

  const handleSendMessage = useCallback(
    async (content: string, attachments?: OutgoingAttachment[]): Promise<ChatSendOutcome> => {
      const pending = attachments ?? [];
      if (!chatId || isChatClosed) {
        return { unsentText: content, unsentAttachments: pending };
      }

      const outcome = await runChatSends(content, pending, sendStep);

      if (outcome.error) {
        const sentCount = pending.length - outcome.unsentAttachments.length;
        handleSendFailure(
          outcome.error,
          sentCount > 0
            ? `${outcome.unsentAttachments.length} de ${pending.length} anexos não foram enviados. Toque em enviar para tentar de novo.`
            : undefined,
        );
      }
      return outcome;
    },
    [chatId, isChatClosed, sendStep, handleSendFailure],
  );
```

O `ChatInput` (linha 761) continua recebendo `onSendMessage={handleSendMessage}` e o mesmo `disabled`.

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit 2>&1 | grep -v "menu/chat/index.tsx"`
Expected: nenhum erro fora do legado `menu/chat/index.tsx`, que é apagado no Task 9.

Run: `npx eslint "src/app/(auth)/(tabs)/menu/suporte/[id].tsx"`
Expected: 0 erros; nenhum warning novo (compare com `git stash; npx eslint ...; git stash pop` se tiver dúvida).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(auth)/(tabs)/menu/suporte/[id].tsx"
git commit -m "fix(suporte): envia todos os anexos e abre documento anexado" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: F3 — a resposta do operador aparece ao reabrir, pelo histórico e pelo push

Três causas, três correções:
1. As mensagens ficavam 5 min em cache (default global do `QueryClient` em `src/app/_layout.tsx:157`).
2. O `chat_history` do socket era descartado (`useChatWebSocket.ts:229`).
3. O push não invalidava `KEY_CHATS` (`NotificationContext.tsx:138`).

**Files:**
- Modify: `src/domain/agility/chat/useCase/useGetChatMessages.ts` (arquivo inteiro)
- Modify: `src/domain/queryKeys.ts` (nova constante)
- Modify: `src/services/notification/NotificationContext.tsx:19` (import) e `:127-141` (`invalidateAfterPush`)
- Modify: `src/domain/agility/chat/useCase/useChatWebSocket.ts` (opção `onHistory`)
- Modify: `src/app/(auth)/(tabs)/menu/suporte/[id].tsx` (grava histórico no cache; polling com o socket fora)
- Test: `src/domain/agility/chat/useCase/__tests__/useGetChatMessages.test.ts` (novo)
- Test: `src/domain/__tests__/queryKeys.test.ts` (novo)

**Interfaces:**
- Consumes: `chatMessagesKey`, `upsertMessagesInCache` (Task 2); `toChatMessage` (Task 1).
- Produces:
  ```ts
  // useGetChatMessages.ts
  export const CHAT_OFFLINE_POLL_MS = 15_000
  export function useGetChatMessages(chatId: Id | undefined, options?: { refetchIntervalMs?: number | false })
  // queryKeys.ts
  export const PUSH_INVALIDATED_KEYS: readonly string[]  // routings, notifications, chats, tickets
  // useChatWebSocket.ts (UseChatWebSocketOptions)
  onHistory?: (data: { chatId: string; messages: ChatMessage[] }) => void
  ```
  O Task 7 mexe de novo em `useChatWebSocket.ts`; esta task só acrescenta `onHistory`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// src/domain/agility/chat/useCase/__tests__/useGetChatMessages.test.ts
import { useQuery } from '@tanstack/react-query';

import { CHAT_OFFLINE_POLL_MS, useGetChatMessages } from '../useGetChatMessages';

jest.mock('@tanstack/react-query', () => ({
    useQuery: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false })),
}));
jest.mock('../../chatService', () => ({ getChatMessagesService: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;

function optionsOfLastCall() {
    return mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0];
}

describe('useGetChatMessages', () => {
    beforeEach(() => mockUseQuery.mockClear());

    it('sempre busca de novo ao abrir a conversa (F3)', () => {
        useGetChatMessages('chat-1');
        expect(optionsOfLastCall()).toMatchObject({
            queryKey: ['chats', 'chat-1', 'messages'],
            staleTime: 0,
            refetchOnMount: 'always',
            refetchInterval: false,
        });
    });

    it('repassa o intervalo de polling quando pedido', () => {
        useGetChatMessages('chat-1', { refetchIntervalMs: CHAT_OFFLINE_POLL_MS });
        expect(optionsOfLastCall().refetchInterval).toBe(15_000);
    });

    it('sem chatId nao busca', () => {
        useGetChatMessages(undefined);
        expect(optionsOfLastCall().enabled).toBe(false);
    });
});
```

```ts
// src/domain/__tests__/queryKeys.test.ts
import { KEY_CHATS, KEY_NOTIFICATIONS, KEY_ROUTINGS, KEY_TICKETS, PUSH_INVALIDATED_KEYS } from '../queryKeys';

describe('PUSH_INVALIDATED_KEYS', () => {
    it('push invalida rotas, notificacoes, chats e protocolos', () => {
        // Chats e protocolos entraram por causa do F3: a resposta do operador chega por push,
        // e a conversa aberta pelo toque precisa buscar de novo.
        expect(PUSH_INVALIDATED_KEYS).toEqual(
            expect.arrayContaining([KEY_ROUTINGS, KEY_NOTIFICATIONS, KEY_CHATS, KEY_TICKETS]),
        );
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/domain/agility/chat/useCase/__tests__/useGetChatMessages.test.ts src/domain/__tests__/queryKeys.test.ts --watchAll=false`
Expected: FAIL (`CHAT_OFFLINE_POLL_MS` e `PUSH_INVALIDATED_KEYS` indefinidos; `staleTime` ausente).

- [ ] **Step 3: Implementar**

```ts
// src/domain/agility/chat/useCase/useGetChatMessages.ts
import { useQuery } from '@tanstack/react-query';

import type { Id } from '@/types/base';

import { getChatMessagesService } from '../chatService';

import { chatMessagesKey } from './messagesCache';

/** Intervalo do polling REST enquanto o socket está fora. */
export const CHAT_OFFLINE_POLL_MS = 15_000;

/**
 * Mensagens de uma conversa. `staleTime: 0` + `refetchOnMount: 'always'`: o default
 * global de 5 min servia a conversa antiga ao reabrir, sem a resposta do operador (F3).
 */
export function useGetChatMessages(
    chatId: Id | undefined,
    options: { refetchIntervalMs?: number | false } = {},
) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: chatMessagesKey(String(chatId ?? '')),
        queryFn: () => getChatMessagesService(chatId as Id),
        enabled: !!chatId,
        retry: false,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchInterval: options.refetchIntervalMs ?? false,
    });

    return {
        messages: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    };
}
```

Em `src/domain/queryKeys.ts`, logo depois de `export const KEY_TEAMS = 'teams'`:

```ts
/**
 * Chaves invalidadas a cada push recebido ou tocado (ver `NotificationContext`).
 * Invalidar só refaz as queries com observador ativo, então o custo é baixo.
 */
export const PUSH_INVALIDATED_KEYS: readonly string[] = [KEY_ROUTINGS, KEY_NOTIFICATIONS, KEY_CHATS, KEY_TICKETS]
```

Em `NotificationContext.tsx`, trocar o import da linha 19 por:

```tsx
import { PUSH_INVALIDATED_KEYS } from "@/domain/queryKeys";
```

e o `invalidateAfterPush` (linhas 127-141) por:

```tsx
  /**
   * Marca como desatualizado o que um push pode ter mudado: rotas, notificações,
   * conversas e protocolos (lista em `PUSH_INVALIDATED_KEYS`).
   *
   * Não filtra por `type` de propósito: NÃO existe um tipo "rota atribuída" —
   * a atribuição chega hoje como ROUTE_REPLANNED ou SERVICE_ADDED — e um filtro
   * por tipo quebraria em silêncio no dia em que o backend mandar outro. Com a
   * tela montada, a busca é refeita na hora; fora de tela, a query fica stale e
   * busca de novo quando o motorista voltar. Chats entraram por causa do F3: a
   * resposta do operador chega por push, e a conversa aberta pelo toque (ou já
   * aberta) precisa buscar de novo.
   */
  const invalidateAfterPush = useCallback(() => {
    for (const key of PUSH_INVALIDATED_KEYS) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);
```

Em `useChatWebSocket.ts`:
- em `UseChatWebSocketOptions` (linha 18), acrescentar
  ```ts
      /** Histórico recente que o servidor manda a cada `join_chat` (inclusive depois de reconectar). */
      onHistory?: (data: { chatId: string; messages: ChatMessage[] }) => void;
  ```
- desestruturar `onHistory` junto das outras opções (linha 31);
- criar `const onHistoryRef = useRef(onHistory);`;
- no `useEffect` que atualiza os refs (linhas 64-72), acrescentar `onHistoryRef.current = onHistory;` e `onHistory` às dependências;
- trocar o handler `chat_history` (linhas 229-231) por:
  ```ts
          socket.on('chat_history', (data: { chatId: string; messages: ChatMessage[] }) => {
              console.log('[useChatWebSocket] Chat history received:', data?.chatId, data?.messages?.length, 'messages');
              if (data?.chatId && Array.isArray(data.messages)) {
                  onHistoryRef.current?.(data);
              }
          });
  ```

Em `[id].tsx`:
- imports:
  ```tsx
  import { KEY_CHATS } from '@/domain/queryKeys';
  import { upsertMessagesInCache } from '@/domain/agility/chat/useCase/messagesCache';
  import { CHAT_OFFLINE_POLL_MS } from '@/domain/agility/chat/useCase/useGetChatMessages';
  ```
  (`KEY_CHATS` é usado no Task 8; se o lint reclamar de import sem uso neste commit, importe-o só no Task 8.)
- trocar o bloco `useGetChatMessages(chatId)` (linhas 268-272) por:
  ```tsx
    // O socket da conversa publica o estado no store; enquanto ele está fora, o REST faz polling.
    const socketConnected = useChatStore((s) => s.isConnected);
    const {
      messages: messagesFromAPI,
      isLoading: isLoadingMessages,
      isError: isMessagesError,
      refetch: refetchMessages,
    } = useGetChatMessages(chatId, { refetchIntervalMs: socketConnected ? false : CHAT_OFFLINE_POLL_MS });
  ```
  (`isMessagesError` é usado no Task 12.)
- logo antes de `useChatWebSocket({` (linha 407):
  ```tsx
    // Histórico enviado a cada join (inclusive depois de uma queda): vai para o mesmo cache.
    const handleHistory = useCallback(
      (data: { chatId: string; messages: ChatMessage[] }) => {
        if (!chatId || data.chatId !== chatId) return;
        upsertMessagesInCache(queryClient, chatId, data.messages.map((m) => toChatMessage(m, chatId)));
      },
      [chatId, queryClient],
    );
  ```
- nas opções de `useChatWebSocket`, acrescentar `onHistory: handleHistory,`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/domain --watchAll=false`
Expected: PASS.

Run: `npx tsc --noEmit 2>&1 | grep -v "menu/chat/index.tsx"`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/domain/agility/chat/useCase/useGetChatMessages.ts src/domain/agility/chat/useCase/__tests__/useGetChatMessages.test.ts src/domain/queryKeys.ts src/domain/__tests__/queryKeys.test.ts src/services/notification/NotificationContext.tsx src/domain/agility/chat/useCase/useChatWebSocket.ts "src/app/(auth)/(tabs)/menu/suporte/[id].tsx"
git commit -m "fix(suporte): resposta do operador aparece ao reabrir e ao tocar no push" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: F15 — o socket sobrevive a queda de rede e a token vencido

**Causas conferidas no código:**
- `auth` é um objeto fixo com o token do momento da conexão (`useChatWebSocket.ts:154`). Toda reconexão manda o token velho.
- `reconnectionAttempts: 5` (`:168`): depois de 5 tentativas o socket desiste.
- O backend, com token vencido, faz `client.emit('error', …)` e `client.disconnect()` (`agility-services` `chat.gateway.ts` ~438). Esse `disconnect` tem motivo `io server disconnect`, e nesse caso o socket.io **não** tenta de novo sozinho.
- `leaveChat` confere o estado React `isConnected`, e não o socket. Quando a conexão cai, o cleanup do efeito de join emite `leave_chat` com o socket já desconectado, e o socket.io guarda esse evento em buffer.

**Files:**
- Modify: `src/domain/agility/chat/useCase/useChatWebSocket.ts`
- Create: `src/domain/agility/chat/useCase/useDisconnectedNotice.ts`
- Modify: `src/app/(auth)/(tabs)/menu/suporte/[id].tsx` (aviso visível)
- Test: `src/domain/agility/chat/useCase/__tests__/useChatWebSocket.test.tsx` (novo)
- Test: `src/domain/agility/chat/useCase/__tests__/useDisconnectedNotice.test.tsx` (novo)

**Interfaces:**
- Consumes: `onHistory` (Task 6).
- Produces:
  ```ts
  // useChatWebSocket.ts
  export const CHAT_RECONNECT_DELAY_MAX_MS = 15_000
  export function serverDisconnectRetryDelay(attempt: number): number   // min(30000, 2000 * 2^attempt)
  // useDisconnectedNotice.ts
  export const DISCONNECTED_NOTICE_DELAY_MS = 3_000
  export function useDisconnectedNotice(isConnected: boolean, delayMs?: number): boolean
  ```

- [ ] **Step 1: Escrever os testes que falham**

```tsx
// src/domain/agility/chat/useCase/__tests__/useChatWebSocket.test.tsx
import React from 'react';

import TestRenderer, { act } from 'react-test-renderer';

import { serverDisconnectRetryDelay, useChatWebSocket, type UseChatWebSocketOptions } from '../useChatWebSocket';

type Handler = (...args: unknown[]) => void;
const mockHandlers: Record<string, Handler> = {};
const mockSocket = {
    id: 'sock-1',
    connected: false,
    on: jest.fn((event: string, fn: Handler) => {
        mockHandlers[event] = fn;
    }),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
};
const mockIo = jest.fn((..._args: unknown[]) => mockSocket);
jest.mock('socket.io-client', () => ({ io: (...args: unknown[]) => mockIo(...args) }));

let mockAuth = {
    authCredentials: { accessToken: 'token-1', tenantId: 'tenant-1' },
    userAuth: { id: 'kc-1' },
};
jest.mock('@/services', () => ({ useAuthCredentialsService: () => mockAuth }));
jest.mock('@/config/urls', () => ({ urls: { agilityApi: 'https://api.test' } }));

function Probe(props: UseChatWebSocketOptions) {
    useChatWebSocket(props);
    return null;
}

function render(props: UseChatWebSocketOptions = {}) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(<Probe {...props} />);
    });
    return tree;
}

function ioOptions() {
    return mockIo.mock.calls[0][1] as {
        auth: (cb: (data: Record<string, unknown>) => void) => void;
        reconnectionAttempts: number;
        reconnectionDelayMax: number;
    };
}

beforeEach(() => {
    jest.useFakeTimers();
    mockIo.mockClear();
    mockSocket.connect.mockClear();
    mockSocket.emit.mockClear();
    for (const k of Object.keys(mockHandlers)) delete mockHandlers[k];
    mockAuth = { authCredentials: { accessToken: 'token-1', tenantId: 'tenant-1' }, userAuth: { id: 'kc-1' } };
});

afterEach(() => {
    jest.useRealTimers();
});

describe('serverDisconnectRetryDelay', () => {
    it.each([
        [0, 2000],
        [1, 4000],
        [3, 16000],
        [4, 30000],
        [10, 30000],
    ])('tentativa %i -> %i ms', (attempt, expected) => {
        expect(serverDisconnectRetryDelay(attempt)).toBe(expected);
    });
});

describe('useChatWebSocket — reconexao', () => {
    it('auth e funcao e entrega o token ATUAL a cada tentativa', () => {
        const tree = render();
        const { auth } = ioOptions();
        expect(typeof auth).toBe('function');

        mockAuth = { ...mockAuth, authCredentials: { accessToken: 'token-2', tenantId: 'tenant-1' } };
        act(() => tree.update(<Probe />));

        const cb = jest.fn();
        auth(cb);
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ token: 'token-2', userType: 'DRIVER', userId: 'kc-1' }));
        expect(mockIo).toHaveBeenCalledTimes(1);
    });

    it('nao desiste de reconectar', () => {
        render();
        expect(ioOptions().reconnectionAttempts).toBe(Infinity);
        expect(ioOptions().reconnectionDelayMax).toBe(15_000);
    });

    it('servidor derrubou (token vencido): tenta de novo com backoff', () => {
        render();
        act(() => mockHandlers.disconnect('io server disconnect'));
        act(() => jest.advanceTimersByTime(1999));
        expect(mockSocket.connect).not.toHaveBeenCalled();
        act(() => jest.advanceTimersByTime(1));
        expect(mockSocket.connect).toHaveBeenCalledTimes(1);

        act(() => mockHandlers.disconnect('io server disconnect'));
        act(() => jest.advanceTimersByTime(3999));
        expect(mockSocket.connect).toHaveBeenCalledTimes(1);
        act(() => jest.advanceTimersByTime(1));
        expect(mockSocket.connect).toHaveBeenCalledTimes(2);
    });

    it('conexao confirmada zera o backoff', () => {
        render();
        act(() => mockHandlers.disconnect('io server disconnect'));
        act(() => jest.advanceTimersByTime(2000));
        act(() => mockHandlers.connected({}));
        act(() => mockHandlers.disconnect('io server disconnect'));
        act(() => jest.advanceTimersByTime(2000));
        expect(mockSocket.connect).toHaveBeenCalledTimes(2);
    });

    it('queda de transporte fica com o socket.io (sem connect manual)', () => {
        render();
        act(() => mockHandlers.disconnect('transport close'));
        act(() => jest.advanceTimersByTime(60_000));
        expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('desmontar cancela a tentativa agendada', () => {
        const tree = render();
        act(() => mockHandlers.disconnect('io server disconnect'));
        act(() => tree.unmount());
        act(() => jest.advanceTimersByTime(60_000));
        expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('repassa o chat_history', () => {
        const onHistory = jest.fn();
        render({ onHistory });
        const data = { chatId: 'chat-1', messages: [] };
        act(() => mockHandlers.chat_history(data));
        expect(onHistory).toHaveBeenCalledWith(data);
    });
});
```

```tsx
// src/domain/agility/chat/useCase/__tests__/useDisconnectedNotice.test.tsx
import React from 'react';

import TestRenderer, { act } from 'react-test-renderer';

import { useDisconnectedNotice } from '../useDisconnectedNotice';

let visible = false;
function Probe({ connected }: { connected: boolean }) {
    visible = useDisconnectedNotice(connected, 3000);
    return null;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useDisconnectedNotice', () => {
    it('so mostra depois de 3s desconectado (sem piscar na conexao inicial)', () => {
        act(() => {
            TestRenderer.create(<Probe connected={false} />);
        });
        act(() => jest.advanceTimersByTime(2999));
        expect(visible).toBe(false);
        act(() => jest.advanceTimersByTime(1));
        expect(visible).toBe(true);
    });

    it('some na hora ao reconectar', () => {
        let tree!: TestRenderer.ReactTestRenderer;
        act(() => {
            tree = TestRenderer.create(<Probe connected={false} />);
        });
        act(() => jest.advanceTimersByTime(3000));
        act(() => tree.update(<Probe connected />));
        expect(visible).toBe(false);
    });

    it('reconectar antes do prazo nao mostra nada', () => {
        let tree!: TestRenderer.ReactTestRenderer;
        act(() => {
            tree = TestRenderer.create(<Probe connected={false} />);
        });
        act(() => jest.advanceTimersByTime(1000));
        act(() => tree.update(<Probe connected />));
        act(() => jest.advanceTimersByTime(5000));
        expect(visible).toBe(false);
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/domain/agility/chat/useCase/__tests__/useChatWebSocket.test.tsx src/domain/agility/chat/useCase/__tests__/useDisconnectedNotice.test.tsx --watchAll=false`
Expected: FAIL (`serverDisconnectRetryDelay` e `../useDisconnectedNotice` inexistentes; `auth` é objeto).

- [ ] **Step 3: Implementar**

```ts
// src/domain/agility/chat/useCase/useDisconnectedNotice.ts
import { useEffect, useState } from 'react';

export const DISCONNECTED_NOTICE_DELAY_MS = 3_000;

/**
 * `true` quando o socket está fora há pelo menos `delayMs`. O atraso evita que o
 * aviso pisque na conexão inicial, que leva um instante.
 */
export function useDisconnectedNotice(isConnected: boolean, delayMs: number = DISCONNECTED_NOTICE_DELAY_MS): boolean {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isConnected) {
            setVisible(false);
            return;
        }
        const timer = setTimeout(() => setVisible(true), delayMs);
        return () => clearTimeout(timer);
    }, [isConnected, delayMs]);

    return visible;
}
```

Em `useChatWebSocket.ts`:

1. Depois de `getWebSocketUrl` (linha 16):
   ```ts
   /** Teto do intervalo entre tentativas automáticas do socket.io. */
   export const CHAT_RECONNECT_DELAY_MAX_MS = 15_000;

   /**
    * Espera antes de reconectar quando o SERVIDOR derrubou a conexão (ex.: token vencido).
    * Nesse caso o socket.io não tenta sozinho. Enquanto isso, o polling REST da tela
    * dispara o refresh do token no interceptor do axios, e a próxima tentativa já sai
    * com o token novo.
    */
   export function serverDisconnectRetryDelay(attempt: number): number {
       return Math.min(30_000, 2_000 * 2 ** attempt);
   }
   ```
2. Depois de `const DELIVERED_IDS_MAX = 100;` (linha 49):
   ```ts
       // Token lido a cada tentativa de conexão: o refresh troca `authCredentials` sem recriar o socket.
       const tokenRef = useRef(authCredentials?.accessToken);
       const serverRetryAttemptRef = useRef(0);
       const serverRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

       useEffect(() => {
           tokenRef.current = authCredentials?.accessToken;
       }, [authCredentials?.accessToken]);

       const clearServerRetry = useCallback(() => {
           if (serverRetryTimerRef.current) {
               clearTimeout(serverRetryTimerRef.current);
               serverRetryTimerRef.current = null;
           }
       }, []);
   ```
3. No cleanup do efeito de montagem (linhas 77-89), chamar `clearServerRetry();` como primeira linha do `return () => { ... }` e acrescentar `clearServerRetry` às dependências do efeito (`[clearServerRetry]`).
4. Trocar as opções do `io(...)` (linhas 153-169) por:
   ```ts
           const socket = io(`${wsUrl}/chat`, {
               // Função, não objeto: cada (re)conexão lê o token atual.
               // userType é só dica (contrato C2): o servidor decide pelas roles do JWT.
               auth: (cb) =>
                   cb({
                       token: tokenRef.current,
                       userId,
                       userType,
                       tenantId,
                   }),
               query: {
                   userId,
                   userType,
                   tenantId,
               },
               transports: ['websocket', 'polling'],
               reconnection: true,
               reconnectionDelay: 1000,
               reconnectionDelayMax: CHAT_RECONNECT_DELAY_MAX_MS,
               reconnectionAttempts: Infinity,
           });
   ```
5. No handler `connected` (linhas 176-183), acrescentar como primeira linha: `serverRetryAttemptRef.current = 0;`.
6. Trocar o handler `disconnect` (linhas 298-305) por:
   ```ts
           socket.on('disconnect', (reason) => {
               console.log('[useChatWebSocket] Disconnected:', reason);
               if (isMountedRef.current) {
                   setIsConnected(false);
                   setConnectedRef.current(false);
               }
               joinedChatsRef.current.clear();

               // Queda de rede: o socket.io reconecta sozinho. Derrubada pelo servidor
               // (token vencido/recusado): ele NÃO tenta, então agendamos com backoff.
               if (reason === 'io server disconnect' && isMountedRef.current) {
                   const delay = serverDisconnectRetryDelay(serverRetryAttemptRef.current);
                   serverRetryAttemptRef.current += 1;
                   clearServerRetry();
                   serverRetryTimerRef.current = setTimeout(() => {
                       serverRetryTimerRef.current = null;
                       if (isMountedRef.current && socketRef.current === socket) {
                           socket.connect();
                       }
                   }, delay);
               }
           });
   ```
7. Acrescentar `clearServerRetry` às dependências do `useCallback` de `connect` (linha 316).
8. Em `disconnect` (linhas 318-330), chamar `clearServerRetry();` antes de `socketRef.current.disconnect();` e acrescentar `clearServerRetry` às dependências.
9. Em `leaveChat` (linhas 362-375), trocar a guarda por:
   ```ts
           // Confere o SOCKET, não o estado React: com a conexão caída, o emit iria para o
           // buffer e sairia depois do novo join, tirando o motorista da sala.
           if (!socketRef.current?.connected) {
               console.warn('[useChatWebSocket] Cannot leave chat: not connected');
               return;
           }
   ```
   e as dependências do `useCallback` passam a ser `[]`. O `console.log` da linha 363 que lê `isConnected` perde esse campo.

Em `[id].tsx`:
- import: `import { useDisconnectedNotice } from '@/domain/agility/chat/useCase/useDisconnectedNotice';`
- depois da chamada de `useChatWebSocket`: `const showOfflineNotice = useDisconnectedNotice(isConnected) && !isChatClosed;`
- logo depois do bloco "Typing indicator" (depois da linha 749):
  ```tsx
          {/* Sem tempo real: avisa e segue pelo polling REST */}
          {showOfflineNotice && (
            <Box backgroundColor="gray100" px="x16" py="y8" accessibilityRole="alert">
              <Text preset="text13" color="gray700" textAlign="center">
                Sem conexão em tempo real. Atualizando a cada 15 segundos.
              </Text>
            </Box>
          )}
  ```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/domain/agility/chat --watchAll=false`
Expected: PASS.

Run: `npx tsc --noEmit 2>&1 | grep -v "menu/chat/index.tsx"`
Expected: sem erros. Se o tipo do callback de `auth` não for inferido pela versão instalada do `socket.io-client`, anote o parâmetro como `(cb: (data: object) => void)`.

- [ ] **Step 5: Commit**

```bash
git add src/domain/agility/chat/useCase/useChatWebSocket.ts src/domain/agility/chat/useCase/useDisconnectedNotice.ts src/domain/agility/chat/useCase/__tests__/useChatWebSocket.test.tsx src/domain/agility/chat/useCase/__tests__/useDisconnectedNotice.test.tsx "src/app/(auth)/(tabs)/menu/suporte/[id].tsx"
git commit -m "fix(chat): socket reconecta com token novo e avisa quando esta sem tempo real" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: F4 — "Continuar chamado" não volta ao chat fechado; "Novo atendimento" no aviso de encerrado

**Causa:**
- `suporte/index.tsx:70` confia no `activeChat` do cache (5 min) e navega direto para ele.
- O `chat_closed` em `[id].tsx:397` só muda o estado local.
- A tela de Suporte continua montada embaixo da conversa, e o `refetch` nunca roda quando o motorista volta para ela.

**Correção:**
- **Toda** entrada passa pelo find-or-create do backend (`POST /chats/driver-support`), que devolve o chat ativo com protocolo aberto ou fecha o velho e cria um novo (`chat.service.ts` `_findOrCreateDriverSupportChat`).
- O encerramento invalida `KEY_CHATS` e `KEY_TICKETS`.
- A tela de Suporte refaz a busca ao ganhar foco.

**Files:**
- Create: `src/domain/agility/chat/useCase/openSupportChat.ts`
- Modify: `src/domain/agility/chat/useCase/useFindActiveChatByUser.ts:9-14`
- Modify: `src/domain/agility/chat/useCase/index.ts` (exports)
- Modify: `src/app/(auth)/(tabs)/menu/suporte/index.tsx` (handler, foco, import)
- Modify: `src/app/(auth)/(tabs)/menu/suporte/[id].tsx` (params, voltar com `returnTo`, encerramento, novo atendimento)
- Test: `src/domain/agility/chat/useCase/__tests__/openSupportChat.test.ts` (novo)

**Interfaces:**
- Produces:
  ```ts
  export function supportSubjectForService(serviceId: string): string            // 'Problema no serviço #<id>'
  export function findOrCreateSupportChatId(params: { driverId: string; subject?: string; serviceId?: string }): Promise<string>
  export function supportChatHref(chatId: string, returnTo?: string): {
      pathname: '/(auth)/(tabs)/menu/suporte/[id]';
      params: { id: string; returnTo?: string };
  }
  ```
  Consumidores: `suporte/index.tsx`, `[id].tsx` (este task) e `nao-realizado/index.tsx` (Task 10).
- `[id].tsx` passa a aceitar o param `returnTo` e aplica a mesma regra de voltar de `suporte/index.tsx:129-138`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/domain/agility/chat/useCase/__tests__/openSupportChat.test.ts
import { findOrCreateSupportChatId, supportChatHref, supportSubjectForService } from '../openSupportChat';

const mockCreate = jest.fn();
jest.mock('../../chatService', () => ({
    createDriverSupportChatService: (...args: unknown[]) => mockCreate(...args),
}));

beforeEach(() => mockCreate.mockReset());

describe('findOrCreateSupportChatId', () => {
    it('devolve o id do chat que o backend achou ou criou', async () => {
        mockCreate.mockResolvedValue({ success: true, result: { id: 'chat-7' } });
        await expect(
            findOrCreateSupportChatId({ driverId: 'kc-1', subject: 'Problema', serviceId: 'svc-1' }),
        ).resolves.toBe('chat-7');
        expect(mockCreate).toHaveBeenCalledWith({ driverId: 'kc-1', subject: 'Problema', serviceId: 'svc-1' });
    });

    it('assunto vazio nao vai para a API', async () => {
        mockCreate.mockResolvedValue({ success: true, result: { id: 'chat-7' } });
        await findOrCreateSupportChatId({ driverId: 'kc-1', subject: '' });
        expect(mockCreate).toHaveBeenCalledWith({ driverId: 'kc-1', subject: undefined, serviceId: undefined });
    });

    it('resposta sem id vira erro (a tela mostra toast)', async () => {
        mockCreate.mockResolvedValue({ success: false });
        await expect(findOrCreateSupportChatId({ driverId: 'kc-1' })).rejects.toThrow('SUPPORT_CHAT_NOT_CREATED');
    });
});

describe('supportChatHref', () => {
    it('sem returnTo', () => {
        expect(supportChatHref('chat-7')).toEqual({
            pathname: '/(auth)/(tabs)/menu/suporte/[id]',
            params: { id: 'chat-7' },
        });
    });

    it('com returnTo', () => {
        expect(supportChatHref('chat-7', '/rotas-detalhadas/r1/parada/p1/nao-realizado').params).toEqual({
            id: 'chat-7',
            returnTo: '/rotas-detalhadas/r1/parada/p1/nao-realizado',
        });
    });
});

describe('supportSubjectForService', () => {
    it('mesmo formato da tela de Suporte', () => {
        expect(supportSubjectForService('svc-1')).toBe('Problema no serviço #svc-1');
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/domain/agility/chat/useCase/__tests__/openSupportChat.test.ts --watchAll=false`
Expected: FAIL com `Cannot find module '../openSupportChat'`.

- [ ] **Step 3: Implementar o helper e o hook**

```ts
// src/domain/agility/chat/useCase/openSupportChat.ts
import { createDriverSupportChatService } from '../chatService';

/** Assunto usado quando o suporte é aberto a partir de um serviço (igual à tela de Suporte). */
export function supportSubjectForService(serviceId: string): string {
    return `Problema no serviço #${serviceId}`;
}

/**
 * Entrada ÚNICA para abrir o suporte. O backend é o dono da regra: devolve o chat
 * ativo com protocolo aberto, ou fecha o antigo (protocolo resolvido/fechado) e cria
 * um novo. Não confiar no `activeChat` do cache: era isso que levava o motorista de
 * volta a uma conversa encerrada (F4).
 */
export async function findOrCreateSupportChatId(params: {
    driverId: string;
    subject?: string;
    serviceId?: string;
}): Promise<string> {
    const res = await createDriverSupportChatService({
        driverId: params.driverId,
        subject: params.subject || undefined,
        serviceId: params.serviceId,
    });
    const id = res?.success ? res.result?.id : undefined;
    if (!id) {
        throw new Error('SUPPORT_CHAT_NOT_CREATED');
    }
    return id;
}

/** Rota da conversa. `returnTo` = tela de origem em outra aba (ver suporte/index.tsx). */
export function supportChatHref(chatId: string, returnTo?: string) {
    return {
        pathname: '/(auth)/(tabs)/menu/suporte/[id]' as const,
        params: returnTo ? { id: chatId, returnTo } : { id: chatId },
    };
}
```

Em `useCase/index.ts`, acrescentar:

```ts
export { findOrCreateSupportChatId, supportChatHref, supportSubjectForService } from './openSupportChat';
```

Em `useFindActiveChatByUser.ts`, acrescentar às opções do `useQuery` (depois de `retry: false,`):

```ts
        // Decide entre "Continuar chamado" e "Nova conversa": nunca servir do cache velho.
        staleTime: 0,
        refetchOnMount: 'always',
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/domain/agility/chat/useCase/__tests__/openSupportChat.test.ts --watchAll=false`
Expected: PASS.

- [ ] **Step 5: Tela de Suporte**

Em `suporte/index.tsx`:
- import: trocar `import { useRouter, useLocalSearchParams } from 'expo-router';` por `import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';`
- trocar `import { createDriverSupportChatService } from '@/domain/agility/chat/chatService';` por
  ```tsx
  import { useQueryClient } from '@tanstack/react-query';
  import { findOrCreateSupportChatId, supportChatHref } from '@/domain/agility/chat/useCase/openSupportChat';
  import { KEY_CHATS } from '@/domain/queryKeys';
  ```
  (respeite a ordem de imports do lint: pacotes externos primeiro, depois `@/`)
- depois do bloco `useFindActiveChatByUser(userId)` (linha 39):
  ```tsx
    const queryClient = useQueryClient();

    // A tela fica montada embaixo da conversa: ao voltar, busca de novo para o botão
    // não dizer "Continuar chamado" de um atendimento que já foi encerrado.
    useFocusEffect(
      useCallback(() => {
        refetch();
      }, [refetch]),
    );
  ```
- trocar `handleNovaConversa` inteiro (linhas 67-123) por:
  ```tsx
    async function handleNovaConversa() {
      if (!userAuth?.id) {
        showToast({ message: 'Usuário não identificado', type: 'error' });
        return;
      }

      const hasActive = chatAberto?.status === ChatStatus.ACTIVE;
      let finalSubject = '';
      let serviceId: string | undefined;

      // Com chamado aberto o assunto fica oculto: o backend devolve o chat existente.
      if (!hasActive) {
        if (selectedSubject?.value === 'custom') {
          finalSubject = customSubject.trim();
        } else if (selectedSubject?.value?.startsWith('service:')) {
          serviceId = selectedSubject.value.split(':')[1];
          finalSubject = `Problema no serviço #${serviceId}`;
        } else if (selectedSubject?.value) {
          finalSubject = selectedSubject.value;
        }
      }

      try {
        setIsCreatingChat(true);
        // "Continuar" e "Nova conversa" passam pelo find-or-create: se o chamado foi
        // encerrado, o backend abre outro em vez de devolver o fechado (F4).
        const chatId = await findOrCreateSupportChatId({
          driverId: userAuth.id,
          subject: finalSubject,
          serviceId,
        });
        setSelectedSubject(undefined);
        setCustomSubject('');
        queryClient.invalidateQueries({ queryKey: [KEY_CHATS] });
        router.push(supportChatHref(chatId));
      } catch {
        showToast({ message: 'Não foi possível abrir a conversa de suporte', type: 'error' });
      } finally {
        setIsCreatingChat(false);
      }
    }
  ```
  O `serviceInProgress` do dropdown (linhas 57-62) continua gerando `service:<id>`. Não use `supportSubjectForService` aqui, para não mexer no texto que a tela já grava; os dois formatos são iguais e o teste do Step 1 garante isso.

- [ ] **Step 6: Tela da conversa**

Em `[id].tsx`:
- imports: trocar `import { useLocalSearchParams } from 'expo-router';` por `import { useLocalSearchParams, useRouter } from 'expo-router';`; acrescentar `Button` ao import de `@/components`; acrescentar
  ```tsx
  import { findOrCreateSupportChatId, supportChatHref } from '@/domain/agility/chat/useCase/openSupportChat';
  import { KEY_CHATS, KEY_TICKETS } from '@/domain/queryKeys';
  ```
  (se o Task 6 já importou `KEY_CHATS`, junte os dois no mesmo import).
- trocar as linhas 253-254 por:
  ```tsx
    const { id, returnTo } = useLocalSearchParams<{ id?: string; returnTo?: string }>();
    const chatId = id ? String(id) : undefined;
    const router = useRouter();
  ```
- trocar o efeito de carregar o chat (linhas 326-346) por:
  ```tsx
    const loadChatInfo = useCallback(() => {
      if (!chatId) return;
      getChatService(chatId)
        .then((result) => {
          if (result.success && result.result) {
            const chat = result.result as unknown as ChatWithParticipants;
            setChatInfo(chat);
            setChatStatus(chat.status || ChatStatus.ACTIVE);
          }
        })
        .catch((error) => {
          console.error('[SuporteChatPage] Error loading chat info:', error);
        });
    }, [chatId]);

    // userAuth.id = keycloakUserId (JWT sub). O backend converte para ID interno automaticamente.
    useEffect(() => {
      if (!userAuth?.id) return;
      setCurrentUserSenderId(userAuth.id);
      loadChatInfo();
    }, [userAuth?.id, loadChatInfo]);
  ```
- trocar `handleChatClosed` (linhas 397-405) por:
  ```tsx
    // Encerramento (evento do operador ou envio recusado): além de travar a tela,
    // invalida a lista/chat ativo e os protocolos. Sem isso, "Continuar chamado"
    // levava de volta a esta conversa fechada (F4). Invalidar KEY_CHATS também
    // refaz as mensagens desta conversa.
    const markClosedLocally = useCallback(() => {
      setChatStatus(ChatStatus.CLOSED);
      queryClient.invalidateQueries({ queryKey: [KEY_CHATS] });
      queryClient.invalidateQueries({ queryKey: [KEY_TICKETS] });
    }, [queryClient]);

    const handleChatClosed = useCallback(
      (closedChatId: string) => {
        if (closedChatId === chatId) markClosedLocally();
      },
      [chatId, markClosedLocally],
    );
  ```
  Como `handleSendFailure` (linha 443) passa a usar `markClosedLocally`, que está declarado acima dele, troque dentro dele:
  ```tsx
        if (/encerrad|fechad|closed/i.test(text)) {
          markClosedLocally();
          showToast({ message: 'Este atendimento foi finalizado pelo operador.', type: 'error' });
          return;
        }
  ```
  e as dependências passam a ser `[markClosedLocally, showToast]`.
- logo depois de `handleSendFailure`:
  ```tsx
    const handleBack = useCallback(() => {
      if (returnTo) {
        // Mesma regra de suporte/index.tsx: volta para a tela de origem em outra aba.
        router.navigate(returnTo as never);
        return;
      }
      router.back();
    }, [returnTo, router]);

    const [isStartingNew, setIsStartingNew] = useState(false);

    const handleNovoAtendimento = useCallback(async () => {
      if (!userAuth?.id) {
        showToast({ message: 'Usuário não identificado', type: 'error' });
        return;
      }
      setIsStartingNew(true);
      try {
        const newChatId = await findOrCreateSupportChatId({ driverId: userAuth.id });
        await queryClient.invalidateQueries({ queryKey: [KEY_CHATS] });
        if (newChatId === chatId) {
          // O backend reaproveitou esta conversa (protocolo reaberto): destrava a tela.
          setChatStatus(ChatStatus.ACTIVE);
          loadChatInfo();
          return;
        }
        // replace: a conversa encerrada não fica na pilha; returnTo segue valendo.
        router.replace(supportChatHref(newChatId, returnTo));
      } catch {
        showToast({ message: 'Não foi possível abrir um novo atendimento', type: 'error' });
      } finally {
        setIsStartingNew(false);
      }
    }, [userAuth?.id, chatId, queryClient, loadChatInfo, router, returnTo, showToast]);
  ```
- `ScreenBase` (linha 666): `buttonLeft={<ButtonBack onPress={handleBack} />}`.
- trocar o bloco "Chat finalizado" (linhas 752-758) por:
  ```tsx
          {isChatClosed && (
            <Box backgroundColor="gray100" px="x16" py="y12" alignItems="center" gap="y8">
              <Text preset="text13" color="gray600" textAlign="center">
                Atendimento finalizado pelo operador.
              </Text>
              <Button
                title={isStartingNew ? 'Abrindo...' : 'Novo atendimento'}
                preset="outline"
                onPress={handleNovoAtendimento}
                disabled={isStartingNew}
                width={measure.x300}
              />
            </Box>
          )}
  ```
- apagar a variável `queryClient` das dependências de `handleSendMessage` se o lint apontar como desnecessária (ela saiu da lista no Task 5).

- [ ] **Step 7: Verificar**

Run: `npx jest src/domain/agility/chat --watchAll=false && npx tsc --noEmit 2>&1 | grep -v "menu/chat/index.tsx"`
Expected: testes PASS; nenhum erro de tipo. Se o `tsc` recusar `router.push(supportChatHref(...))` por causa das rotas tipadas, use `router.push(supportChatHref(chatId) as never)`, como `notificationRoutes.ts` já faz com `as any`.

- [ ] **Step 8: Commit**

```bash
git add src/domain/agility/chat/useCase/openSupportChat.ts src/domain/agility/chat/useCase/__tests__/openSupportChat.test.ts src/domain/agility/chat/useCase/useFindActiveChatByUser.ts src/domain/agility/chat/useCase/index.ts "src/app/(auth)/(tabs)/menu/suporte/index.tsx" "src/app/(auth)/(tabs)/menu/suporte/[id].tsx"
git commit -m "fix(suporte): continuar chamado encerrado abre um novo e aviso oferece novo atendimento" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: F7 — botão Chat do card de parada vai para o Suporte; o `menu/chat` legado sai

**Referências conferidas** (`git grep` em `origin/main`, 11/09):
- `menu/chat`: `parada/[pid]/index.tsx:522` (o botão), `types/navigation.ts:15` (tipo) e `notificationRoutes.ts:83` (só comentário; o handler `chat` já leva ao suporte).
- `ChatAttachmentView`: só o próprio componente, `components/index.ts:30-31` e `menu/chat/index.tsx`.
- `menu/_layout.tsx` não declara `chat`.

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/index.tsx:5,46,520-523`
- Delete: `src/app/(auth)/(tabs)/menu/chat/index.tsx`
- Delete: `src/components/ChatAttachmentView/ChatAttachmentView.tsx`, `src/components/ChatAttachmentView/index.ts`
- Modify: `src/components/index.ts:30-31` (apagar as duas linhas)
- Modify: `src/types/navigation.ts:15` (apagar a linha)
- Modify: `src/services/notification/notificationRoutes.ts:83-84` (comentário)

**Interfaces:** nenhuma nova. Mesmo padrão de `EtapaConfirmacao.tsx:120-126` (`pathname: '/(auth)/(tabs)/menu/suporte'`, `params: { returnTo: pathname }`).

**Sem teste unitário:** é remoção e troca de destino. A verificação é o `git grep` com resultado esperado, o `tsc` e o roteiro manual M9.

- [ ] **Step 1: Conferir as referências antes de apagar**

Run: `git grep -n "menu/chat\|ChatAttachmentView\|ChatViewAttachment" -- src`
Expected: exatamente as linhas listadas acima, mais as internas de `menu/chat/index.tsx` e de `components/ChatAttachmentView/`. Se aparecer qualquer outra, pare e trate essa referência antes.

- [ ] **Step 2: Trocar o destino do botão**

No `parada/[pid]/index.tsx`:
- linha 5: `import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';`
- logo depois de `const router = useRouter();` (linha 46): `const pathname = usePathname();`
- trocar o `onPress` do botão de chat (linhas 520-523) por:
  ```tsx
              onPress={() => {
                // Mesmo destino das etapas de confirmação: o suporte real, voltando para esta parada.
                router.push({
                  pathname: '/(auth)/(tabs)/menu/suporte',
                  params: { returnTo: pathname },
                });
              }}
              accessibilityLabel="Falar com o suporte"
  ```

- [ ] **Step 3: Apagar o legado**

```bash
git rm "src/app/(auth)/(tabs)/menu/chat/index.tsx" src/components/ChatAttachmentView/ChatAttachmentView.tsx src/components/ChatAttachmentView/index.ts
```

Em `src/components/index.ts`, apagar:

```ts
export { default as ChatAttachmentView } from './ChatAttachmentView';
export type { Attachment as ChatViewAttachment } from './ChatAttachmentView';
```

Em `src/types/navigation.ts`, apagar a linha `    | '/(auth)/(tabs)/menu/chat'`.

Em `notificationRoutes.ts`, trocar as linhas 83-84 por:

```ts
    // Nome antigo de push de mensagem: a tela `menu/chat` foi removida, e este handler
    // só sobrevive para pushes ainda em trânsito. Leva sempre à conversa de suporte.
```

- [ ] **Step 4: Verificar**

Run: `git grep -n "menu/chat" -- src`
Expected: uma única linha, o comentário em `src/services/notification/notificationRoutes.ts`.

Run: `git grep -n "ChatAttachmentView\|ChatViewAttachment" -- src`
Expected: nenhuma linha.

Run: `npx tsc --noEmit`
Expected: sem erros (o filtro dos tasks anteriores deixa de ser necessário).

- [ ] **Step 5: Commit**

```bash
git add -A "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/index.tsx" "src/app/(auth)/(tabs)/menu/chat" src/components/ChatAttachmentView src/components/index.ts src/types/navigation.ts src/services/notification/notificationRoutes.ts
git commit -m "fix(parada): botao de chat abre o suporte e remove a tela de chat legada" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: "Mensagem para torre" abre a conversa certa, com o serviço

Hoje, em `nao-realizado/index.tsx:41-47`, o chat é criado sem `serviceId` e o app navega para a **lista** de Suporte. O motorista precisa tocar de novo e pode cair num chat de outro assunto. O `handleEnviarMensagemDestinatario` (linhas 59-87) não tem botão e é código morto.

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/nao-realizado/index.tsx:1-87`

**Interfaces:**
- Consumes (Task 8): `findOrCreateSupportChatId`, `supportChatHref`, `supportSubjectForService`. O param `returnTo` da conversa já é tratado em `[id].tsx` (Task 8).

**Sem teste unitário novo:** a lógica é a do helper coberto no Task 8. A verificação é o `tsc` e o roteiro manual M10.

- [ ] **Step 1: Trocar o handler e apagar o código morto**

Imports (linhas 1-12):

```tsx
import { useState } from 'react';
import { Linking, Platform } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';

import { Box, Button, ScreenBase, Text, TouchableOpacityBox, ServiceFlowTheme } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import {
  findOrCreateSupportChatId,
  supportChatHref,
  supportSubjectForService,
} from '@/domain/agility/chat/useCase/openSupportChat';
import { useFindOneService } from '@/domain/agility/service/useCase';
import { KEY_CHATS } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
```

Depois de `const { showToast } = useToastService();`: `const queryClient = useQueryClient();`

Trocar `handleEnviarMensagemTorre` e `handleEnviarMensagemDestinatario` (linhas 32-87) por:

```tsx
  const handleEnviarMensagemTorre = async () => {
    if (!userAuth?.id) {
      showToast({ message: 'Usuário não identificado', type: 'error' });
      return;
    }

    try {
      setLoadingAction('torre');
      // A conversa já nasce ligada a este serviço. Se houver chamado aberto, o backend
      // devolve o mesmo chat (o assunto só vale para chat novo).
      const chatId = await findOrCreateSupportChatId({
        driverId: userAuth.id,
        subject: supportSubjectForService(serviceId),
        serviceId,
      });
      queryClient.invalidateQueries({ queryKey: [KEY_CHATS] });
      // Direto para a conversa; o voltar retorna para esta tela (returnTo).
      router.push(supportChatHref(chatId, pathname));
    } catch (error) {
      console.error('Erro ao abrir chat com a torre:', error);
      showToast({ message: 'Não foi possível abrir o chat com a torre de controle', type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };
```

- [ ] **Step 2: Verificar**

Run: `git grep -n "handleEnviarMensagemDestinatario\|createDriverCustomerChatService" -- "src/app"`
Expected: nenhuma linha.

Run: `npx tsc --noEmit && npx eslint "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/nao-realizado/index.tsx"`
Expected: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/nao-realizado/index.tsx"
git commit -m "fix(nao-realizado): mensagem para torre abre a conversa ligada ao servico" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Badge de não lidas do Menu com polling leve

Decisão 2. Hoje, `CustomTabBar.tsx:16` lê `useTotalUnreadCount()` do store, e só o socket da tela de conversa incrementa esse número (a própria tela o zera). Na prática, o badge fica sempre em 0.

**Files:**
- Create: `src/domain/agility/chat/useCase/useSupportUnreadCount.ts`
- Modify: `src/domain/agility/chat/useCase/index.ts` (export)
- Modify: `src/components/CustomTabBar/CustomTabBar.tsx:8,16`
- Modify: `src/app/(auth)/(tabs)/menu/suporte/[id].tsx` (invalida o contador depois de marcar como lida)
- Test: `src/domain/agility/chat/useCase/__tests__/useSupportUnreadCount.test.tsx` (novo)

**Interfaces:**
- Consumes: `useFindActiveChatByUser` (com `staleTime: 0` desde o Task 8); `getUnreadCountService(chatId, userId)` (já existe em `chatService.ts`; `GET /chats/:chatId/unread/:userId` → `{ unreadCount }`).
- Produces:
  ```ts
  export const SUPPORT_UNREAD_POLL_MS = 60_000
  export function supportUnreadKey(chatId: string | undefined, userId: string | undefined): readonly ['chats', string, 'unread', string]
  export function useSupportUnreadCount(): number
  ```
  A chave começa com `[KEY_CHATS, chatId]`, então o push (Task 6) e o encerramento (Task 8) também atualizam o badge.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/domain/agility/chat/useCase/__tests__/useSupportUnreadCount.test.tsx
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { SUPPORT_UNREAD_POLL_MS, useSupportUnreadCount } from '../useSupportUnreadCount';

const mockUnread = jest.fn();
jest.mock('../../chatService', () => ({
    getUnreadCountService: (...args: unknown[]) => mockUnread(...args),
}));

let mockActiveChat: { id: string } | null = { id: 'chat-1' };
jest.mock('../useFindActiveChatByUser', () => ({
    useFindActiveChatByUser: () => ({ activeChat: mockActiveChat }),
}));

jest.mock('@/services', () => ({ useAuthCredentialsService: () => ({ userAuth: { id: 'kc-1' } }) }));

let count = -1;
function Probe() {
    count = useSupportUnreadCount();
    return null;
}

async function renderAndFlush() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => {
        TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    await act(async () => {
        await Promise.resolve();
    });
    return queryClient;
}

beforeEach(() => {
    mockUnread.mockReset();
    mockActiveChat = { id: 'chat-1' };
    count = -1;
});

describe('useSupportUnreadCount', () => {
    it('conta as nao lidas do chat ativo do motorista', async () => {
        mockUnread.mockResolvedValue({ success: true, result: { unreadCount: 3 } });
        await renderAndFlush();
        expect(mockUnread).toHaveBeenCalledWith('chat-1', 'kc-1');
        expect(count).toBe(3);
    });

    it('sem chat ativo: zero e nenhuma chamada', async () => {
        mockActiveChat = null;
        await renderAndFlush();
        expect(mockUnread).not.toHaveBeenCalled();
        expect(count).toBe(0);
    });

    it('usa polling de 60s', async () => {
        mockUnread.mockResolvedValue({ success: true, result: { unreadCount: 0 } });
        const queryClient = await renderAndFlush();
        const query = queryClient.getQueryCache().find({ queryKey: ['chats', 'chat-1', 'unread', 'kc-1'] });
        expect((query?.observers[0]?.options as { refetchInterval?: number }).refetchInterval).toBe(SUPPORT_UNREAD_POLL_MS);
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/domain/agility/chat/useCase/__tests__/useSupportUnreadCount.test.tsx --watchAll=false`
Expected: FAIL com `Cannot find module '../useSupportUnreadCount'`.

- [ ] **Step 3: Implementar**

```ts
// src/domain/agility/chat/useCase/useSupportUnreadCount.ts
import { useQuery } from '@tanstack/react-query';

import { KEY_CHATS } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { getUnreadCountService } from '../chatService';

import { useFindActiveChatByUser } from './useFindActiveChatByUser';

/**
 * Polling leve do badge do Menu (1 GET/min, só com chat ativo). O socket de chat só
 * existe dentro da conversa, então sem isto o badge nunca acendia. Push e encerramento
 * também invalidam esta chave (prefixo KEY_CHATS).
 */
export const SUPPORT_UNREAD_POLL_MS = 60_000;

export function supportUnreadKey(chatId: string | undefined, userId: string | undefined) {
    return [KEY_CHATS, chatId ?? '', 'unread', userId ?? ''] as const;
}

export function useSupportUnreadCount(): number {
    const { userAuth } = useAuthCredentialsService();
    const userId = userAuth?.id;
    const { activeChat } = useFindActiveChatByUser(userId);
    const chatId = activeChat?.id;

    const { data } = useQuery({
        queryKey: supportUnreadKey(chatId, userId),
        queryFn: () => getUnreadCountService(chatId as string, userId as string),
        enabled: !!chatId && !!userId,
        retry: false,
        staleTime: 0,
        refetchInterval: SUPPORT_UNREAD_POLL_MS,
    });

    return data?.result?.unreadCount ?? 0;
}
```

Em `useCase/index.ts`: `export { useSupportUnreadCount, supportUnreadKey, SUPPORT_UNREAD_POLL_MS } from './useSupportUnreadCount';`

Em `CustomTabBar.tsx`:
- linha 8: `import { useSupportUnreadCount } from '@/domain/agility/chat/useCase/useSupportUnreadCount';`
- linha 16: `const chatUnreadCount = useSupportUnreadCount();`

Em `[id].tsx`, no efeito "Marcar como lida" (linhas 349-354) e em `handleNewMessage` (linhas 384-387), trocar `markChatReadService(chatId, userAuth.id).catch(console.error);` por:

```tsx
        markChatReadService(chatId, userAuth.id)
          .then(() => queryClient.invalidateQueries({ queryKey: supportUnreadKey(chatId, userAuth.id) }))
          .catch(console.error);
```

com o import `import { supportUnreadKey } from '@/domain/agility/chat/useCase/useSupportUnreadCount';` e `queryClient` nas dependências dos dois hooks.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/domain/agility/chat --watchAll=false && npx tsc --noEmit`
Expected: PASS e sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/domain/agility/chat/useCase/useSupportUnreadCount.ts src/domain/agility/chat/useCase/__tests__/useSupportUnreadCount.test.tsx src/domain/agility/chat/useCase/index.ts src/components/CustomTabBar/CustomTabBar.tsx "src/app/(auth)/(tabs)/menu/suporte/[id].tsx"
git commit -m "fix(menu): badge de mensagens do suporte passa a contar de verdade" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Erro ao carregar não aparece como "Nenhuma mensagem"

Hoje, quando `GET /messages` falha, a lista fica vazia e mostra "Nenhuma mensagem ainda. Envie a primeira mensagem!". Além disso, a tela de carregamento (`[id].tsx:653-662`) não tem botão de voltar.

**Files:**
- Create: `src/app/(auth)/(tabs)/menu/suporte/_utils/chatBodyState.ts`
- Modify: `src/app/(auth)/(tabs)/menu/suporte/[id].tsx` (carregamento dentro do `ScreenBase`; `ListEmptyComponent`)
- Test: `src/app/(auth)/(tabs)/menu/suporte/_utils/__tests__/chatBodyState.test.ts` (novo)

(Pastas que começam com `_` não viram rota no Expo Router; o padrão já é usado em `rotas-detalhadas/[id]/_utils`.)

**Interfaces:**
- Consumes (Task 6): `isMessagesError` e `refetchMessages`.
- Produces:
  ```ts
  export type ChatBodyState = 'loading' | 'error' | 'ready'
  export function resolveChatBodyState(input: { isLoading: boolean; isError: boolean; hasMessages: boolean }): ChatBodyState
  ```

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/app/(auth)/(tabs)/menu/suporte/_utils/__tests__/chatBodyState.test.ts
import { resolveChatBodyState } from '../chatBodyState';

describe('resolveChatBodyState', () => {
    it('carregando sem nada em cache', () => {
        expect(resolveChatBodyState({ isLoading: true, isError: false, hasMessages: false })).toBe('loading');
    });

    it('falhou e nao tem nada para mostrar: erro, nao "nenhuma mensagem"', () => {
        expect(resolveChatBodyState({ isLoading: false, isError: true, hasMessages: false })).toBe('error');
    });

    it('falhou no polling mas ja tem mensagens: continua mostrando a conversa', () => {
        expect(resolveChatBodyState({ isLoading: false, isError: true, hasMessages: true })).toBe('ready');
    });

    it('carregou vazio: pronto (lista vazia de verdade)', () => {
        expect(resolveChatBodyState({ isLoading: false, isError: false, hasMessages: false })).toBe('ready');
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest "src/app/(auth)/(tabs)/menu/suporte/_utils" --watchAll=false`
Expected: FAIL com `Cannot find module '../chatBodyState'`.

- [ ] **Step 3: Implementar**

```ts
// src/app/(auth)/(tabs)/menu/suporte/_utils/chatBodyState.ts
export type ChatBodyState = 'loading' | 'error' | 'ready';

/**
 * O que o corpo da conversa mostra. Erro só vira tela de erro quando não há nada
 * para exibir. Com mensagens (inclusive otimistas) e um polling falhando, a conversa
 * continua visível.
 */
export function resolveChatBodyState(input: {
    isLoading: boolean;
    isError: boolean;
    hasMessages: boolean;
}): ChatBodyState {
    if (input.hasMessages) return 'ready';
    if (input.isLoading) return 'loading';
    if (input.isError) return 'error';
    return 'ready';
}
```

Em `[id].tsx`:
- import: `import { resolveChatBodyState } from './_utils/chatBodyState';`
- apagar o `if (isLoadingMessages) { return (...) }` inteiro (linhas 653-662);
- antes do `return (`:
  ```tsx
    const bodyState = resolveChatBodyState({
      isLoading: isLoadingMessages,
      isError: isMessagesError,
      hasMessages: flatData.length > 0,
    });
  ```
- trocar o `ListEmptyComponent` da `FlatList` (linhas 733-739) por:
  ```tsx
            ListEmptyComponent={
              <Box flex={1} py="y32" alignItems="center" justifyContent="center" px="x16">
                {bodyState === 'loading' && (
                  <>
                    <ActivityIndicator />
                    <Text preset="text14" color="gray500" mt="y16">
                      Carregando conversa...
                    </Text>
                  </>
                )}
                {bodyState === 'error' && (
                  <>
                    <Text preset="text14" color="colorTextError" textAlign="center" mb="y16">
                      Não foi possível carregar a conversa. Verifique sua conexão.
                    </Text>
                    <TouchableOpacityBox
                      backgroundColor="primary100"
                      px="x24"
                      py="y12"
                      borderRadius="s8"
                      onPress={() => refetchMessages()}
                      accessibilityRole="button"
                    >
                      <Text preset="text14" fontWeightPreset="bold" color="white">
                        Tentar novamente
                      </Text>
                    </TouchableOpacityBox>
                  </>
                )}
                {bodyState === 'ready' && (
                  <Text preset="text14" color="gray400" textAlign="center">
                    Nenhuma mensagem ainda. Envie a primeira mensagem!
                  </Text>
                )}
              </Box>
            }
  ```
  (o botão copia o estilo de "Tentar novamente" de `suporte/index.tsx:174-184`).

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest "src/app/(auth)/(tabs)/menu/suporte/_utils" --watchAll=false && npx tsc --noEmit`
Expected: PASS e sem erros.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/menu/suporte/_utils" "src/app/(auth)/(tabs)/menu/suporte/[id].tsx"
git commit -m "fix(suporte): falha ao carregar a conversa mostra erro com tentar de novo" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Verificação final, roteiro no aparelho e PR

**Files:** nenhum arquivo de código.

- [ ] **Step 1: Suíte, tipos e lint**

```bash
npx jest --watchAll=false
npx tsc --noEmit
npm run lint
```

Expected: todas as suítes PASS (as novas: `messageUtils`, `usePostMessage`, `sendChatBatch`, `ChatInput`, `useGetChatMessages`, `queryKeys`, `useChatWebSocket`, `useDisconnectedNotice`, `openSupportChat`, `useSupportUnreadCount`, `chatBodyState`); `tsc` sem erros; lint com 0 erros e nenhum warning novo nos arquivos tocados.

- [ ] **Step 2: Conferências por grep**

```bash
git grep -n "menu/chat" -- src                    # 1 linha: comentario em notificationRoutes.ts
git grep -n "ChatAttachmentView" -- src           # nada
git grep -n "reconnectionAttempts" -- src         # so Infinity em useChatWebSocket.ts
git grep -n "tempId" -- src/domain/agility/chat   # usePostMessage (delete antes do envio) e testes
git grep -n "senderId" -- "src/app/(auth)/(tabs)/menu/suporte/[id].tsx"   # senderId continua indo (C1)
```

- [ ] **Step 3: Roteiro manual no aparelho**

Build de desenvolvimento apontando para o dev da Agility, com um motorista e um operador logado no front da plataforma. Para ver os logs `[useChatWebSocket]`, deixe o Metro aberto.

| # | Cenário | Como | Esperado |
|---|---|---|---|
| M1 | F3: reabrir a conversa | Motorista abre o Suporte, manda "oi" e volta para o Menu. O operador responde. O motorista reabre a conversa em até 5 min. | A resposta aparece sem puxar para atualizar. |
| M2 | F3: push | App em segundo plano; o operador responde; o motorista toca no push. | A conversa abre já com a resposta. Com a conversa aberta em primeiro plano, a resposta chega pelo socket. |
| M3 | F4: encerrado | O operador resolve ou fecha o protocolo com a conversa aberta no app. | Aparece o aviso "Atendimento finalizado" com o botão **Novo atendimento** e o campo fica travado. Voltar → a tela de Suporte mostra **Nova conversa** (não "Continuar chamado"). |
| M4 | F4: novo atendimento | No aviso de M3, tocar em **Novo atendimento**. | Abre uma conversa nova, vazia e "Em aberto". Voltar não passa pela conversa fechada. No front do operador aparece um protocolo novo. |
| M5 | F8: vários anexos | Anexar 3 fotos e 1 PDF, digitar "avaria" e enviar. | 4 bolhas, em ordem. A primeira foto leva "avaria". Nenhuma bolha some ou duplica durante o envio. O operador recebe 4 mensagens com anexo. |
| M6 | Teto de anexos | Selecionar 7 fotos na galeria. | Ficam 5 e aparece o toast "Envie no máximo 5 anexos por vez." |
| M7 | Documento | Tocar em "Ver anexo" de um PDF já enviado (inclusive de uma conversa reaberta). | O PDF abre no visualizador do sistema. Numa bolha que ainda está enviando, o toque não faz nada. |
| M8 | Texto em envio falho | Modo avião; digitar "teste" e enviar. | Toast de erro; "teste" continua no campo; nenhuma bolha fica presa. Sair do modo avião e enviar de novo: sai uma mensagem só. |
| M9 | Anexo em envio falho no meio | Selecionar 3 fotos; ativar o modo avião logo depois de a 1ª bolha virar enviada (✓). | Toast "2 de 3 anexos não foram enviados…"; o campo fica com 2 fotos; ao reenviar, saem só essas 2. |
| M10 | Rede cortada (F15) | Conversa aberta; modo avião por ~40 s; nesse tempo o operador manda 2 mensagens; desligar o modo avião. | Em ~3 s aparece "Sem conexão em tempo real…". Ao voltar a rede, as 2 mensagens aparecem em até 15 s e o aviso some. No log: `Disconnected: transport close`, seguido de reconexão, sem desistir depois de 5 tentativas. |
| M11 | Token vencido (F15) | Deixar a conversa aberta, com o app em primeiro plano, por mais tempo que a validade do access token do realm (ver `Access Token Lifespan` no Keycloak do dev); depois ligar e desligar o modo avião. | No log: `Invalid or expired token`, seguido de `Disconnected: io server disconnect` e de uma nova tentativa em 2 s, 4 s… Em até ~30 s o polling REST renova o token e o socket volta ("Conectado" no cabeçalho). Uma mensagem do operador nesse intervalo aparece. |
| M12 | Queda longa | Modo avião por 3 min com a conversa aberta. | Ao voltar, o socket reconecta sozinho (sem sair e voltar na tela). |
| M13 | Erro ao carregar | Modo avião; abrir uma conversa do Histórico que nunca foi aberta nesta sessão. | "Não foi possível carregar a conversa" com **Tentar novamente**. O botão de voltar funciona. Com a rede de volta, "Tentar novamente" carrega a conversa. |
| M14 | Card de parada (F7) | Na parada, aba Local, tocar no ícone de chat. | Abre o Suporte. Voltar → retorna à parada (não à home do Menu). |
| M15 | Torre | Parada → "Não entreguei" → "Enviar mensagem torre de controle". | Abre direto a conversa. Se não havia chamado, o assunto é "Problema no serviço #…" e o operador vê o serviço vinculado. Voltar → retorna à tela de tentativa. |
| M16 | Badge | Motorista na aba Rotas, com chamado aberto; o operador manda uma mensagem. | O badge do Menu acende em até 60 s (na hora, se o push chegar). Abrir a conversa e voltar → o badge zera. |
| M17 | Regressão `returnTo` | Etapa de confirmação (entrega/coleta/serviço) → ícone de chat → Continuar → voltar, voltar. | Volta à etapa de origem, como antes. |

- [ ] **Step 4: Abrir a PR (não fazer push sem o dono pedir)**

Título: `fix(suporte): resposta do operador, novo atendimento, anexos e reconexao do chat`

Corpo:

```markdown
## Contexto
Fase 4 dos planos de chat/protocolo (`agility-services` `project-docs/superpowers/plans/2026-09-16-chat-protocolo-00-indice.md`).
Achados F3, F4, F7, F8, F15 (app) e menores do app da auditoria de 16/09/2026.

## O que muda
- **F3:** a conversa sempre busca de novo ao abrir; o `chat_history` do socket vai para o cache; push invalida chats e protocolos.
- **F4:** "Continuar chamado" e "Nova conversa" passam pelo find-or-create do backend; o encerramento invalida o cache; o aviso de encerrado ganha **Novo atendimento**.
- **F7:** o botão de chat do card de parada abre o Suporte (com `returnTo`); a tela `menu/chat` legada e o `ChatAttachmentView` foram removidos.
- **F8:** cada anexo vira uma mensagem, enviada em sequência (teto de 5); o upload é um arquivo por vez; o que falha continua no campo.
- **F15:** o `auth` do socket é função (token atual a cada tentativa); reconexão sem limite (intervalo máximo de 15 s); nova tentativa com backoff quando o servidor derruba a conexão; polling REST de 15 s enquanto desconectado; aviso visível.
- **Menores:** documento anexado abre; o texto não se perde em envio falho; o badge do Menu conta de verdade (polling de 60 s); a bolha de anexo não duplica nem some; erro de carregamento tem "Tentar novamente"; "Mensagem para torre" abre a conversa ligada ao serviço.

## Contratos
- **C1/C2:** sem mudança no que o app envia (`senderId` e `userType` continuam indo).
- **C5:** `attachmentUrl` = item de `result.urls` do `POST /chats/upload`, sem transformação (coberto em `usePostMessage.test.tsx`).
- **C3, atenção fase 1:** o app passa a chamar `GET /chats/:chatId/unread/:userId` (motorista participante, `userId` = próprio `sub`). Essa rota não pode passar a responder 403 nesse uso.

## Decisões para validar
1. Vários anexos = uma mensagem por anexo (e não limitar a 1).
2. Badge com polling de 60 s (e não remover o badge).
3. "Novo atendimento" cria direto, sem escolher assunto.
4. Bolha de anexo só sai pela resposta do REST (a heurística de 60 s vale só para texto).

## Pendência fora do escopo
- `uploadChatAttachments` decide o MIME pela extensão e manda `application/octet-stream` quando não reconhece; o backend recusa.

## Como testar
`npx jest --watchAll=false`, `npx tsc --noEmit`, `npm run lint` e o roteiro M1–M17 do plano `project-docs/superpowers/plans/2026-09-16-chat-protocolo-04-app-motorista.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Autorrevisão (feita ao escrever o plano)

- **Cobertura:**
  - F3 → Task 6 (+ gravação no cache no Task 2).
  - F4 → Task 8.
  - F7 → Task 9.
  - F8 → Tasks 3, 4 e 5.
  - F15 do app → Task 7, com o polling no Task 6.
  - Menores:
    - documento → Task 5;
    - texto perdido → Tasks 4 e 5;
    - badge → Task 11;
    - bolha de anexo → Tasks 1 e 2;
    - erro de fetch → Task 12;
    - torre e handler morto → Task 10.
- **Nomes conferidos entre tasks:** `chatMessagesKey`, `upsertMessagesInCache`, `toChatMessage`, `isRemoteUrl`, `runChatSends`, `ChatSendStep`, `ChatSendOutcome`, `OutgoingAttachment`, `CHAT_OFFLINE_POLL_MS`, `useDisconnectedNotice`, `findOrCreateSupportChatId`, `supportChatHref`, `supportSubjectForService`, `supportUnreadKey`, `resolveChatBodyState`.
- **Ordem dentro de `[id].tsx`:**
  - `isChatClosed` sobe no Task 5;
  - `markClosedLocally` (Task 8) fica acima de `handleSendFailure`;
  - `isMessagesError` (Task 6) só é usado no Task 12.
- **Risco conhecido:** entre os Tasks 4 e 9, o `tsc` acusa o legado `menu/chat/index.tsx`. Os Tasks 5–8 filtram essa linha; o Task 9 apaga o arquivo.
