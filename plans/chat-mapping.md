# Mapeamento de Componentes do Chat

> Documento de referência para todos os componentes, serviços e arquivos relacionados ao sistema de chat.

---

## 📁 Backend (agility-services)

### Estrutura de Diretórios

```
agility-services/src/chat/
├── chat.module.ts
├── controller/
│   ├── chat.controller.ts
│   └── ticket.controller.ts
├── dto/
│   ├── chat-events.dto.ts
│   ├── create-chat.dto.ts
│   ├── create-ticket.dto.ts
│   ├── send-message.dto.ts
│   └── update-ticket.dto.ts
├── entities/
│   ├── chat.entity.ts
│   ├── chat-participant.entity.ts
│   ├── message.entity.ts
│   └── ticket.entity.ts
├── enum/
│   ├── chat.enum.ts
│   └── ticket.enum.ts
├── gateway/
│   └── chat.gateway.ts
├── mapper/
│   ├── chat.mapper.ts
│   └── ticket.mapper.ts
├── repository/
│   ├── chat.repository.ts
│   ├── ticket.repository.ts
│   └── impl/
│       ├── prisma-chat.repository.ts
│       └── prisma-ticket.repository.ts
└── service/
    ├── chat.service.ts
    ├── chat.service.spec.ts
    ├── tenant-cache.service.ts
    ├── ticket.service.ts
    └── user-id-cache.service.ts
```

### Gateway (WebSocket)

| Arquivo                   | Descrição                   | Responsabilidades                                                                                                                               |
| ------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway/chat.gateway.ts` | Gateway principal WebSocket | - Gerencia conexões WebSocket<br>- Autenticação de sockets<br>- Join/Leave de salas<br>- Broadcast de mensagens<br>- Notificações em tempo real |

### Controllers (REST API)

| Arquivo                           | Descrição                   | Endpoints Principais                                                                                                         |
| --------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `controller/chat.controller.ts`   | Endpoints REST para chat    | - GET /chat (listar)<br>- GET /chat/:id (detalhes)<br>- POST /chat (criar)<br>- GET /chat/:id/messages (histórico)           |
| `controller/ticket.controller.ts` | Endpoints REST para tickets | - GET /ticket (listar)<br>- POST /ticket (criar)<br>- PATCH /ticket/:id (atualizar)<br>- POST /ticket/:id/resolve (resolver) |

### Services

| Arquivo                            | Descrição                       | Métodos Principais                                                                                  |
| ---------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `service/chat.service.ts`          | Lógica de negócio do chat       | - createChat()<br>- findChatById()<br>- findChatsByUser()<br>- sendMessage()<br>- getChatMessages() |
| `service/ticket.service.ts`        | Lógica de negócio de tickets    | - createTicket()<br>- updateTicket()<br>- resolveTicket()<br>- transferTicket()                     |
| `service/user-id-cache.service.ts` | Cache de IDs Keycloak → usuário | - getUserId()<br>- cacheUser()<br>- invalidate()                                                    |
| `service/tenant-cache.service.ts`  | Cache de validação de tenant    | - getTenant()<br>- invalidate()                                                                     |

### Repositories

| Arquivo                                       | Descrição                          | Interface                                                           |
| --------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| `repository/chat.repository.ts`               | Interface do repositório de chat   | Contrato para operações de chat                                     |
| `repository/ticket.repository.ts`             | Interface do repositório de ticket | Contrato para operações de ticket                                   |
| `repository/impl/prisma-chat.repository.ts`   | Implementação Prisma               | - CRUD de chats<br>- CRUD de mensagens<br>- Gestão de participantes |
| `repository/impl/prisma-ticket.repository.ts` | Implementação Prisma               | - CRUD de tickets<br>- Associações com chat                         |

### Entities

| Arquivo                               | Descrição                | Campos Principais                                  |
| ------------------------------------- | ------------------------ | -------------------------------------------------- |
| `entities/chat.entity.ts`             | Entidade Chat            | id, type, status, createdAt, updatedAt             |
| `entities/chat-participant.entity.ts` | Entidade ChatParticipant | chatId, userId, role, joinedAt                     |
| `entities/message.entity.ts`          | Entidade Message         | id, chatId, senderId, content, type, createdAt     |
| `entities/ticket.entity.ts`           | Entidade Ticket          | id, chatId, status, priority, assignedTo, category |

### DTOs

| Arquivo                    | Descrição                   | Uso                                                       |
| -------------------------- | --------------------------- | --------------------------------------------------------- |
| `dto/chat-events.dto.ts`   | DTOs para eventos WebSocket | Eventos: new_message, user_typing, user_joined, user_left |
| `dto/create-chat.dto.ts`   | DTO para criar chat         | type, participantIds, initialMessage                      |
| `dto/create-ticket.dto.ts` | DTO para criar ticket       | category, priority, description                           |
| `dto/send-message.dto.ts`  | DTO para enviar mensagem    | chatId, content, type, attachments                        |
| `dto/update-ticket.dto.ts` | DTO para atualizar ticket   | status, priority, assignedTo                              |

### Mappers

| Arquivo                   | Descrição                                |
| ------------------------- | ---------------------------------------- |
| `mapper/chat.mapper.ts`   | Transforma entidades em DTOs de resposta |
| `mapper/ticket.mapper.ts` | Transforma entidades de ticket em DTOs   |

### Enums

| Arquivo               | Valores                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `enum/chat.enum.ts`   | ChatType (SUPPORT, DIRECT, GROUP), ChatStatus (ACTIVE, CLOSED, ARCHIVED)                       |
| `enum/ticket.enum.ts` | TicketStatus (OPEN, IN_PROGRESS, RESOLVED, CLOSED), TicketPriority (LOW, MEDIUM, HIGH, URGENT) |

---

## 📁 Frontend Web (agility-frontend-platform)

### Estrutura de Diretórios

```
agility-frontend-platform/src/app/chat/
├── ChatPage.tsx
├── page.tsx
└── components/
    ├── ChatInput.tsx
    ├── ChatList.tsx
    ├── ChatMessages.tsx
    ├── FinishTicketModal.tsx
    ├── NewChatModal.tsx
    ├── ProtocolsOfRequesterModal.tsx
    ├── ResolveTicketModal.tsx
    └── TransferTicketModal.tsx
```

### Páginas

| Arquivo        | Descrição                  | Funcionalidades                                                                                                                                              |
| -------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ChatPage.tsx` | Página principal do chat   | - Conexão WebSocket<br>- Lista de chats disponíveis<br>- Visualização de mensagens<br>- Envio de mensagens<br>- Indicadores de conexão<br>- Retry automático |
| `page.tsx`     | Export da página (Next.js) | Rota /chat                                                                                                                                                   |

### Componentes

| Arquivo                                    | Descrição                   | Props Principais                     |
| ------------------------------------------ | --------------------------- | ------------------------------------ |
| `components/ChatInput.tsx`                 | Input para enviar mensagens | onSendMessage, disabled, placeholder |
| `components/ChatList.tsx`                  | Lista de conversas          | chats, selectedChatId, onSelectChat  |
| `components/ChatMessages.tsx`              | Lista de mensagens          | messages, currentUserId, isLoading   |
| `components/FinishTicketModal.tsx`         | Modal finalizar ticket      | ticketId, onFinish, onCancel         |
| `components/NewChatModal.tsx`              | Modal criar novo chat       | onCreate, onCancel                   |
| `components/ProtocolsOfRequesterModal.tsx` | Modal ver protocolos        | requesterId, onClose                 |
| `components/ResolveTicketModal.tsx`        | Modal resolver ticket       | ticketId, onResolve, onCancel        |
| `components/TransferTicketModal.tsx`       | Modal transferir ticket     | ticketId, onTransfer, onCancel       |

---

## 📁 Mobile App (lab-app)

### Estrutura de Diretórios

```
lab-app/src/domain/agility/chat/
├── chatAPI.ts
├── chatService.ts
├── index.ts
├── context/
│   ├── ChatContext.tsx
│   └── index.ts
├── dto/
│   └── types.ts
├── store/
│   ├── index.ts
│   └── useChatStore.ts
├── useCase/
│   ├── index.ts
│   ├── useChatAttachmentUpload.ts
│   ├── useChatWebSocket.ts
│   ├── useFindChatsByUser.ts
│   ├── useGetChatMessages.ts
│   └── usePostMessage.ts
└── utils/
    ├── index.ts
    └── messageUtils.ts
```

### API e Services

| Arquivo          | Descrição                   | Métodos                                                                               |
| ---------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| `chatAPI.ts`     | Configuração da API de chat | Axios instance com interceptors                                                       |
| `chatService.ts` | Serviços REST para chat     | - findChatsByUser()<br>- getChatMessages()<br>- postMessage()<br>- uploadAttachment() |

### Context e Store (Estado Global)

| Arquivo                   | Descrição               | Estado Gerenciado                                                            |
| ------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `context/ChatContext.tsx` | Context React para chat | - chats<br>- messages<br>- selectedChat<br>- connectionStatus                |
| `store/useChatStore.ts`   | Store Zustand           | - Estado persistente<br>- Actions para manipulação<br>- Seletores otimizados |

### Use Cases (Hooks)

| Arquivo                              | Descrição               | Retorno                                           |
| ------------------------------------ | ----------------------- | ------------------------------------------------- |
| `useCase/useChatWebSocket.ts`        | Conexão WebSocket       | { isConnected, messages, sendMessage, reconnect } |
| `useCase/useChatAttachmentUpload.ts` | Upload de anexos        | { upload, progress, isUploading }                 |
| `useCase/useFindChatsByUser.ts`      | Buscar chats do usuário | { chats, isLoading, refetch }                     |
| `useCase/useGetChatMessages.ts`      | Buscar mensagens        | { messages, isLoading, fetchMore }                |
| `useCase/usePostMessage.ts`          | Enviar mensagens        | { sendMessage, isSending, error }                 |

### DTOs e Utils

| Arquivo                 | Descrição               | Tipos/Utilitários                                                          |
| ----------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `dto/types.ts`          | Tipos TypeScript        | Chat, Message, ChatParticipant, Attachment                                 |
| `utils/messageUtils.ts` | Utilitários de mensagem | - formatMessage()<br>- sortByDate()<br>- groupByDate()<br>- isOptimistic() |

---

## 🔄 Fluxo de Comunicação

### Diagrama de Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │   Web Platform  │     │    Backend      │
│    (lab-app)    │     │ (agility-front) │     │ (agility-serv)  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ useChatWebSocket      │ ChatPage.tsx          │
         │ (socket.io-client)    │ (socket.io-client)    │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │    ChatGateway         │
                    │  (WebSocket Server)    │
                    │                        │
                    │  - handleConnection    │
                    │  - handleMessage       │
                    │  - handleJoinRoom      │
                    │  - broadcast           │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │    ChatService         │
                    │                        │
                    │  - createChat()        │
                    │  - sendMessage()       │
                    │  - getMessages()       │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  ChatRepository        │
                    │  (Prisma)              │
                    │                        │
                    │  - CRUD operations     │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │    PostgreSQL          │
                    │   (Database)           │
                    └────────────────────────┘
```

### Fluxo de Envio de Mensagem

```
1. Usuário digita mensagem
   └─► ChatInput.tsx (Web) / usePostMessage.ts (Mobile)
        └─► Validação local
             └─► Mensagem otimista adicionada à UI
                  └─► WebSocket: emit('send_message', { chatId, content })
                       └─► ChatGateway.handleSendMessage()
                            └─► Validação de autenticação
                                 └─► ChatService.sendMessage()
                                      └─► ChatRepository.createMessage()
                                           └─► Salvar no banco
                                                └─► Retornar mensagem criada
                                                     └─► ChatGateway: broadcast('new_message')
                                                          └─► Todos os clientes na sala recebem
                                                               └─► Mensagem otimista substituída pela real
```

### Fluxo de Conexão WebSocket

```
1. Cliente inicia conexão
   └─► socket.connect({ auth: { token, tenantId } })
        └─► ChatGateway.handleConnection()
             └─► Validar token JWT
                  └─► Validar tenant (TenantCacheService)
                       └─► Mapear Keycloak ID → User ID (UserIdCacheService)
                            └─► Registrar socket em userSockets Map
                                 └─► Cliente conectado
                                      └─► Join automático em salas de chats ativos
```

---

## 📊 Caches de Performance

### UserIdCacheService

- **Propósito:** Mapear Keycloak User ID → Internal User ID
- **TTL:** 30 minutos
- **Localização:** `agility-services/src/chat/service/user-id-cache.service.ts`

### TenantCacheService

- **Propósito:** Cache de validação de tenant
- **TTL:** 10 minutos
- **Localização:** `agility-services/src/chat/service/tenant-cache.service.ts`

---

## 🔌 Eventos WebSocket

### Eventos de Cliente → Servidor

| Evento         | Payload                                  | Descrição                  |
| -------------- | ---------------------------------------- | -------------------------- |
| `connection`   | `{ token, tenantId }`                    | Iniciar conexão            |
| `join_chat`    | `{ chatId }`                             | Entrar em uma sala de chat |
| `leave_chat`   | `{ chatId }`                             | Sair de uma sala de chat   |
| `send_message` | `{ chatId, content, type, attachments }` | Enviar mensagem            |
| `typing_start` | `{ chatId }`                             | Indicar que está digitando |
| `typing_stop`  | `{ chatId }`                             | Parar de indicar digitação |
| `mark_as_read` | `{ chatId, messageId }`                  | Marcar mensagem como lida  |

### Eventos de Servidor → Cliente

| Evento          | Payload                          | Descrição              |
| --------------- | -------------------------------- | ---------------------- |
| `new_message`   | `Message`                        | Nova mensagem recebida |
| `user_typing`   | `{ userId, chatId }`             | Usuário está digitando |
| `user_joined`   | `{ userId, chatId }`             | Usuário entrou no chat |
| `user_left`     | `{ userId, chatId }`             | Usuário saiu do chat   |
| `notification`  | `{ type, data }`                 | Notificação genérica   |
| `error`         | `{ code, message }`              | Erro de WebSocket      |
| `messages_read` | `{ chatId, userId, messageIds }` | Mensagens lidas        |

---

## 📝 Notas para Desenvolvimento

### Adicionando Novo Tipo de Mensagem

1. Atualizar `enum/chat.enum.ts` no backend
2. Atualizar `dto/types.ts` no mobile
3. Atualizar processamento em `ChatGateway`
4. Atualizar renderização em `ChatMessages.tsx` (Web) e `messageUtils.ts` (Mobile)

### Adicionando Novo Evento WebSocket

1. Definir DTO em `dto/chat-events.dto.ts`
2. Adicionar handler em `ChatGateway`
3. Implementar emissão no cliente (Web/Mobile)
4. Documentar neste arquivo

### Otimizações Futuras

- [ ] Paginar lista de chats disponíveis
- [ ] Implementar mensagens otimistas no mobile
- [ ] Adicionar indicador de "lido" (read receipts)
- [ ] Implementar resposta rápida (quick replies)
- [ ] Adicionar suporte a mensagens de voz

---

_Documento criado em: 10/03/2026_
_Última atualização: 10/03/2026_
