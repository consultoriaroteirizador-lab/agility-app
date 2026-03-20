# Análise da Tela de Suporte - agility-frontend-app

## 1. Visão Geral da Arquitetura

### Estrutura de Arquivos

```
agility-frontend-app/
├── app/inicio-app/menu/suporte/
│   ├── page.tsx                 # Lista de chats de suporte
│   ├── [id]/page.tsx            # Página de chat individual
│   └── historico/page.tsx       # Histórico de chamados
├── context/
│   ├── UserContext.tsx          # Contexto com funções de chat
│   └── auth/AuthProvider.tsx    # Contexto de autenticação
├── domain/agility/
│   ├── chat/
│   │   ├── chatAPI.ts           # Chamadas HTTP diretas
│   │   ├── chatService.ts       # Wrapper dos serviços
│   │   └── useCase/
│   │       ├── useChatWebSocket.ts  # Hook WebSocket
│   │       └── useFindChatsByUser.ts
│   └── ticket/
│       ├── ticketAPI.ts         # Chamadas HTTP de tickets
│       └── ticketService.ts     # Wrapper dos serviços
├── lib/
│   ├── apiClient.ts             # Cliente HTTP (Axios)
│   ├── auth.ts                  # Funções de autenticação
│   └── jwt.ts                   # Decodificação JWT
└── components/
    ├── HeaderBase.tsx           # Header padrão
    ├── BottomNav.tsx            # Navegação inferior
    └── suporte/SuporteCard.tsx  # Card de chat na lista
```

---

## 2. Layout da Página (page.tsx)

### Estrutura Visual

```
┌─────────────────────────────────────┐
│  [←]      Suporte          [☰]     │  ← HeaderBase
├─────────────────────────────────────┤
│  [Nova conversa]  [Histórico]       │  ← Botões de ação
├─────────────────────────────────────┤
│  [🔍] Buscar chamado        [⚙]     │  ← Barra de busca
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ Rota X • Serviço #Y         │   │
│  │ Última mensagem...          │   │  ← SuporteCard
│  │ [Em aberto]         (1)     │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Protocolo: 12345            │   │
│  │ ...                         │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  [Rotas] [Ofertas] [Notificações] [Menu] │  ← BottomNav
└─────────────────────────────────────┘
```

### Componentes de Layout

1. **HeaderBase**: Header reutilizável com botão voltar, título e menu dropdown
2. **BottomNav**: Navegação inferior fixa com 4 abas (Rotas, Ofertas, Notificações, Menu)
3. **SuporteCard**: Card individual mostrando preview do chat

---

## 3. Contexto (UserContext)

### Estado de Chat

```typescript
// Estados principais
const [chats, setChats] = useState<ChatHistoryItem[]>([]);
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [currentChat, setCurrentChat] = useState<{
  routeId: string;
  chatId: string;
  serviceId: string;
  status: string;
  unread: string;
  ticketNumber?: string;
} | null>(null);
```

### Funções Principais

#### `startChat(userId: string)`

- **Objetivo**: Criar novo chat de suporte driver-support
- **Fluxo**:
  1. Extrai `keycloakUserId` do token JWT
  2. Chama `createDriverSupportChatService(keycloakUserId)`
  3. Busca ticket associado via `getTicketByChatIdService(chatId)`
  4. Retorna `{ chatId, ticketNumber }`

#### `loadChatHistory()`

- **Objetivo**: Carregar lista de chats do usuário
- **Fluxo**:
  1. Extrai `userId` do token JWT
  2. Chama `listChatsByUserService(userId, 'DRIVER')`
  3. Para cada chat, busca ticket via `getTicketByChatIdService(chatId)`
  4. Mapeia resposta para `ChatHistoryItem[]`
  5. Atualiza estado `chats`

#### `loadChatMessages(chatId: string)`

- **Objetivo**: Carregar mensagens de um chat
- **Fluxo**:
  1. Busca chat e mensagens em paralelo: `getChatService(chatId)` + `getChatMessagesService(chatId)`
  2. Ordena mensagens por data (mais antigas primeiro)
  3. Mapeia para formato `ChatMessage[]`
  4. Busca ticket para obter `ticketNumber`
  5. Atualiza `currentChat` e `messages`

#### `sendMessage(chatId, msgs)`

- **Objetivo**: Enviar mensagem
- **Fluxo**:
  1. Para cada mensagem no array:
     - Converte formato frontend → backend
     - Chama `postMessageService(payload, 'DRIVER')`
  2. Recarrega mensagens atualizadas
  3. Atualiza estado `messages`

---

## 4. Endpoints HTTP (chatAPI.ts)

### Base URL

```
https://dev.agilitylabs.com.br (ou NEXT_PUBLIC_API_BASE_URL)
```

### Endpoints de Chat

| Função                 | Método | Endpoint                                             | Descrição               |
| ---------------------- | ------ | ---------------------------------------------------- | ----------------------- |
| `create`               | POST   | `/chats`                                             | Criar chat genérico     |
| `findOne`              | GET    | `/chats/{id}`                                        | Buscar chat por ID      |
| `findByUser`           | GET    | `/chats/user/{userId}?userType=DRIVER`               | Listar chats do usuário |
| `getMessages`          | GET    | `/chats/{chatId}/messages`                           | Buscar mensagens        |
| `sendMessage`          | POST   | `/chats/message?senderType=DRIVER`                   | Enviar mensagem         |
| `close`                | PATCH  | `/chats/{id}/close`                                  | Fechar chat             |
| `markRead`             | PATCH  | `/chats/{chatId}/read/{userId}`                      | Marcar como lido        |
| `markDelivered`        | PATCH  | `/chats/messages/delivered`                          | Marcar como entregue    |
| `unreadCount`          | GET    | `/chats/{chatId}/unread/{userId}`                    | Contar não lidas        |
| `createDriverSupport`  | POST   | `/chats/driver-support?driverId=xxx`                 | Criar chat de suporte   |
| `createDriverCustomer` | POST   | `/chats/driver-customer?driverId=xxx&customerId=yyy` | Chat driver-cliente     |
| `uploadChatAttachment` | POST   | `/chats/upload`                                      | Upload de anexo         |

### Endpoints de Ticket

| Função                | Método | Endpoint                         | Descrição            |
| --------------------- | ------ | -------------------------------- | -------------------- |
| `createTicket`        | POST   | `/tickets`                       | Criar ticket         |
| `findTicketById`      | GET    | `/tickets/{id}`                  | Buscar por ID        |
| `findTicketByNumber`  | GET    | `/tickets/number/{ticketNumber}` | Buscar por número    |
| `findTicketByChatId`  | GET    | `/tickets/chat/{chatId}`         | Buscar por chat ID   |
| `findTicketsByDriver` | GET    | `/tickets/driver/{driverId}`     | Tickets do motorista |
| `assignTicket`        | PATCH  | `/tickets/{id}/assign`           | Atribuir ticket      |
| `startTicket`         | PATCH  | `/tickets/{id}/start`            | Iniciar atendimento  |
| `resolveTicket`       | PATCH  | `/tickets/{id}/resolve`          | Resolver ticket      |
| `closeTicket`         | PATCH  | `/tickets/{id}/close`            | Fechar ticket        |
| `reopenTicket`        | PATCH  | `/tickets/{id}/reopen`           | Reabrir ticket       |

---

## 5. WebSocket (useChatWebSocket.ts)

### Conexão

```typescript
// URL: wss://dev.agilitylabs.com.br/chat
const socket = io(`${wsUrl}/chat`, {
  auth: {userId, userType, tenantId},
  query: {userId, userType, tenantId},
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
```

### Eventos

| Evento         | Direção  | Descrição              |
| -------------- | -------- | ---------------------- |
| `connect`      | Recebido | Conexão estabelecida   |
| `connected`    | Recebido | Confirmação de conexão |
| `new_message`  | Recebido | Nova mensagem recebida |
| `chat_history` | Recebido | Histórico do chat      |
| `notification` | Recebido | Notificações gerais    |
| `chat_closed`  | Recebido | Operador fechou o chat |
| `error`        | Recebido | Erro de conexão        |
| `disconnect`   | Recebido | Desconectado           |
| `join_chat`    | Enviado  | Entrar em um chat      |
| `leave_chat`   | Enviado  | Sair de um chat        |
| `send_message` | Enviado  | Enviar mensagem        |
| `mark_read`    | Enviado  | Marcar como lido       |

### Fluxo de Mensagem em Tempo Real

1. Componente monta → `useChatWebSocket` conecta
2. `join_chat` é emitido com `{ chatId, userId }`
3. Quando `new_message` chega:
   - Verifica se `chatId` corresponde ao chat atual
   - Converte formato → `ChatMessage`
   - Adiciona ao estado (com deduplicação)
4. Scroll automático para última mensagem

---

## 6. Fluxo Completo: Iniciar Novo Chat de Suporte

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. Usuário clica "Nova conversa"                                 │
│    → handleNovaConversa() em page.tsx                            │
├──────────────────────────────────────────────────────────────────┤
│ 2. UserContext.startChat("")                                     │
│    → getUserIdFromToken() extrai keycloakUserId do JWT           │
├──────────────────────────────────────────────────────────────────┤
│ 3. chatService.createDriverSupportChatService(keycloakUserId)    │
│    → chatAPI.createDriverSupport(driverId)                       │
│    → POST /chats/driver-support?driverId=xxx                     │
├──────────────────────────────────────────────────────────────────┤
│ 4. Backend cria:                                                 │
│    - Chat com chatType = "DRIVER_SUPPORT"                        │
│    - Ticket automaticamente associado                            │
│    - Retorna: { id: chatId, ... }                                │
├──────────────────────────────────────────────────────────────────┤
│ 5. ticketService.getTicketByChatIdService(chatId)                │
│    → ticketAPI.findTicketByChatId(chatId)                        │
│    → GET /tickets/chat/{chatId}                                  │
│    → Retorna: { ticketNumber, status, priority, ... }            │
├──────────────────────────────────────────────────────────────────┤
│ 6. Retorna { chatId, ticketNumber }                              │
│    → router.push(`/inicio-app/menu/suporte/${chatId}`)           │
├──────────────────────────────────────────────────────────────────┤
│ 7. Página [id]/page.tsx carrega:                                 │
│    → loadChatMessages(chatId)                                    │
│    → useChatWebSocket conecta e faz join_chat                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Fluxo Completo: Carregar Histórico de Chats

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. page.tsx monta                                                │
│    → useEffect com [canLoadChats, loadChatHistory]               │
├──────────────────────────────────────────────────────────────────┤
│ 2. canLoadChats = isOnListPage && authReady && authenticated     │
│    → Aguarda autenticação estar pronta                           │
├──────────────────────────────────────────────────────────────────┤
│ 3. UserContext.loadChatHistory()                                 │
│    → getUserIdFromToken()                                        │
├──────────────────────────────────────────────────────────────────┤
│ 4. chatService.listChatsByUserService(userId, 'DRIVER')          │
│    → chatAPI.findByUser(userId, 'DRIVER')                        │
│    → GET /chats/user/{userId}?userType=DRIVER                    │
├──────────────────────────────────────────────────────────────────┤
│ 5. Para cada chat retornado:                                     │
│    → getTicketByChatIdService(chat.id)                           │
│    → GET /tickets/chat/{chatId}                                  │
│    → Mapeia para ChatHistoryItem com ticketNumber                │
├──────────────────────────────────────────────────────────────────┤
│ 6. setChats(historyItems)                                        │
│    → Lista atualizada na UI                                      │
├──────────────────────────────────────────────────────────────────┤
│ 7. Listeners adicionais:                                         │
│    → window.addEventListener("focus", refresh)                   │
│    → document.addEventListener("visibilitychange", ...)          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Autenticação

### AuthProvider

- Usa **Keycloak** para autenticação
- Estados: `ready`, `authenticated`, `token`, `roles`, `driverId`
- Obtém `driverId` via `getDriverIdFromUser()` após login

### Headers HTTP

```typescript
{
  'Authorization': `Bearer ${token}`,
  'x-tenant-id': tenantId,
  'Content-Type': 'application/json'
}
```

### Extração de User ID do Token

```typescript
function getUserIdFromToken(): string | null {
  const token = getToken();
  const payload = decodeJwtPayload(token);
  return payload.sub || payload.userId || payload.id || null;
}
```

---

## 9. Tipos de Dados

### ChatHistoryItem

```typescript
interface ChatHistoryItem {
  routeId: string;
  chatId: string;
  serviceId: string;
  status: 'open' | 'closed';
  unread: string;
  ticketNumber?: string;
  ticketStatus?: string;
  priority?: string;
  lastMessage: {
    messageId: string;
    date: string;
    from: 'support' | 'userId' | 'driver';
    hour: string;
    messageType: 'text' | 'image' | 'document';
    message: string;
  };
}
```

### ChatMessage

```typescript
interface ChatMessage {
  messageId: string;
  from: 'support' | 'userId' | 'driver';
  date: string;
  hour: string;
  messageType: 'text' | 'image' | 'document';
  unread: boolean;
  message: string;
  senderId?: string;
  attachmentUrl?: string;
  attachmentType?: string;
}
```

---

## 10. Diferenças para Considerar no lab-app

### Tecnologias

| agility-frontend-app | lab-app                    |
| -------------------- | -------------------------- |
| Next.js (Web)        | React Native + Expo        |
| next/navigation      | expo-router                |
| Tailwind CSS         | Restyle / StyleSheet       |
| localStorage         | AsyncStorage / SecureStore |
| HTML input           | React Native componentes   |

### Pontos de Atenção

1. **Navegação**: `router.push()` → `router.navigate()` ou similar
2. **Storage**: Token/tenantId em AsyncStorage
3. **WebSocket**: Pode precisar de polyfill ou configuração específica
4. **Upload de arquivos**: Usar expo-image-picker / expo-document-picker
5. **Estilos**: Converter Tailwind para Restyle/StyleSheet

### O que pode ser reutilizado

- **Lógica de contexto** (UserContext)
- **Serviços** (chatService, ticketService)
- **Tipos** (ChatHistoryItem, ChatMessage)
- **Hook WebSocket** (com adaptações menores)
- **apiClient** (já usa Axios, compatível)

---

## 11. Resumo da Cadeia de Chamadas

### Novo Chat

```
page.tsx → UserContext.startChat()
         → chatService.createDriverSupportChatService()
         → chatAPI.createDriverSupport()
         → POST /chats/driver-support

         → ticketService.getTicketByChatIdService()
         → ticketAPI.findTicketByChatId()
         → GET /tickets/chat/{chatId}
```

### Carregar Lista

```
page.tsx → UserContext.loadChatHistory()
         → chatService.listChatsByUserService()
         → chatAPI.findByUser()
         → GET /chats/user/{userId}

         → (para cada chat) ticketService.getTicketByChatIdService()
         → GET /tickets/chat/{chatId}
```

### Enviar Mensagem

```
[id]/page.tsx → useChatWebSocket.sendMessage() [WebSocket]
              ou
              UserContext.sendMessage()
              → chatService.postMessageService()
              → chatAPI.sendMessage()
              → POST /chats/message
```

### Receber Mensagem

```
WebSocket → new_message event
         → handleNewMessage()
         → setMessages() atualiza UI
```
