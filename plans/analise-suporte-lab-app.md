# Análise da Tela de Suporte - lab-app

## 1. Visão Geral

### Status Atual: ✅ IMPLEMENTADO

O **lab-app já possui a funcionalidade de suporte implementada** de forma muito similar ao agility-frontend-app.

---

## 2. Estrutura de Arquivos do lab-app

```
lab-app/
├── src/app/(auth)/(tabs)/menu/
│   ├── suporte/
│   │   ├── _layout.tsx           # Layout da navegação
│   │   ├── index.tsx             # Lista de chats de suporte
│   │   └── [id].tsx              # Página de chat individual
│   └── protocolos/
│       └── index.tsx             # Histórico de protocolos/tickets
├── src/domain/agility/
│   ├── chat/
│   │   ├── chatAPI.ts            # Chamadas HTTP diretas
│   │   ├── chatService.ts        # Wrapper dos serviços
│   │   ├── index.ts              # Exports
│   │   ├── context/
│   │   │   ├── ChatContext.tsx   # Contexto de chat
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   └── types.ts          # Tipos TypeScript
│   │   ├── store/
│   │   │   ├── useChatStore.ts   # Zustand store
│   │   │   └── index.ts
│   │   ├── useCase/
│   │   │   ├── index.ts
│   │   │   ├── useChatWebSocket.ts    # Hook WebSocket
│   │   │   ├── useFindChatsByUser.ts  # Listar chats
│   │   │   ├── useGetChatMessages.ts  # Buscar mensagens
│   │   │   ├── usePostMessage.ts      # Enviar mensagem
│   │   │   └── useChatAttachmentUpload.ts
│   │   └── utils/
│   │       └── messageUtils.ts
│   └── ticket/
│       ├── ticketAPI.ts           # Chamadas HTTP de tickets
│       ├── ticketService.ts       # Wrapper dos serviços
│       ├── dto/
│       └── useCase/
│           ├── index.ts
│           ├── useFindTicketsByDriver.ts
│           ├── useGetTicketByChatId.ts
│           ├── useGetTicket.ts
│           └── useTicketActions.ts
└── src/services/
    └── authCredentials/         # Autenticação
```

---

## 3. Comparação com agility-frontend-app

### ✅ Funcionalidades Implementadas

| Funcionalidade          | agility-frontend-app | lab-app              | Status |
| ----------------------- | -------------------- | -------------------- | ------ |
| Lista de chats          | page.tsx             | index.tsx            | ✅     |
| Chat individual         | [id]/page.tsx        | [id].tsx             | ✅     |
| Histórico de protocolos | historico/page.tsx   | protocolos/index.tsx | ✅     |
| WebSocket tempo real    | useChatWebSocket     | useChatWebSocket     | ✅     |
| Indicador de digitação  | Sim                  | Sim                  | ✅     |
| Upload de anexos        | Sim                  | Sim                  | ✅     |
| Marcar como lido        | Sim                  | Sim                  | ✅     |
| Tickets associados      | Sim                  | Sim                  | ✅     |
| Busca de chats          | Sim                  | Sim                  | ✅     |
| Busca de protocolos     | Sim                  | Sim                  | ✅     |

### 🔄 Diferenças de Arquitetura

| Aspecto       | agility-frontend-app     | lab-app                         |
| ------------- | ------------------------ | ------------------------------- |
| Framework     | Next.js (Web)            | React Native + Expo             |
| Navegação     | next/navigation          | expo-router                     |
| Estilos       | Tailwind CSS             | Restyle / StyleSheet            |
| Contexto      | UserContext centralizado | Hooks individuais + ChatContext |
| Estado Global | useState no contexto     | Zustand store                   |

---

## 4. Endpoints HTTP (chatAPI.ts) - ✅ COMPLETO

| Função                  | Método | Endpoint                               | Status |
| ----------------------- | ------ | -------------------------------------- | ------ |
| `create`                | POST   | `/chats`                               | ✅     |
| `findOne`               | GET    | `/chats/{id}`                          | ✅     |
| `findByUser`            | GET    | `/chats/user/{userId}?userType=DRIVER` | ✅     |
| `getMessages`           | GET    | `/chats/{chatId}/messages`             | ✅     |
| `sendMessage`           | POST   | `/chats/message?senderType=DRIVER`     | ✅     |
| `close`                 | PATCH  | `/chats/{id}/close`                    | ✅     |
| `markRead`              | PATCH  | `/chats/{chatId}/read/{userId}`        | ✅     |
| `markDelivered`         | PATCH  | `/chats/messages/delivered`            | ✅     |
| `unreadCount`           | GET    | `/chats/{chatId}/unread/{userId}`      | ✅     |
| `createDriverSupport`   | POST   | `/chats/driver-support?driverId=xxx`   | ✅     |
| `createDriverCustomer`  | POST   | `/chats/driver-customer`               | ✅     |
| `createCustomerSupport` | POST   | `/chats/customer-support`              | ✅     |
| `uploadChatAttachment`  | POST   | `/chats/upload`                        | ✅     |

---

## 5. Endpoints de Ticket (ticketAPI.ts) - ✅ COMPLETO

| Função           | Método | Endpoint                         | Status |
| ---------------- | ------ | -------------------------------- | ------ |
| `create`         | POST   | `/tickets`                       | ✅     |
| `findOne`        | GET    | `/tickets/{id}`                  | ✅     |
| `findByNumber`   | GET    | `/tickets/number/{ticketNumber}` | ✅     |
| `findByChatId`   | GET    | `/tickets/chat/{chatId}`         | ✅     |
| `findByDriver`   | GET    | `/tickets/driver/{driverId}`     | ✅     |
| `findByCustomer` | GET    | `/tickets/customer/{customerId}` | ✅     |
| `assign`         | PATCH  | `/tickets/{id}/assign`           | ✅     |
| `start`          | PATCH  | `/tickets/{id}/start`            | ✅     |
| `resolve`        | PATCH  | `/tickets/{id}/resolve`          | ✅     |
| `close`          | PATCH  | `/tickets/{id}/close`            | ✅     |
| `reopen`         | PATCH  | `/tickets/{id}/reopen`           | ✅     |

---

## 6. WebSocket (useChatWebSocket.ts) - ✅ COMPLETO

### Eventos Implementados

| Evento         | Direção  | Status |
| -------------- | -------- | ------ |
| `connect`      | Recebido | ✅     |
| `connected`    | Recebido | ✅     |
| `new_message`  | Recebido | ✅     |
| `chat_history` | Recebido | ✅     |
| `notification` | Recebido | ✅     |
| `chat_closed`  | Recebido | ✅     |
| `typing_start` | Recebido | ✅     |
| `typing_stop`  | Recebido | ✅     |
| `error`        | Recebido | ✅     |
| `disconnect`   | Recebido | ✅     |
| `join_chat`    | Enviado  | ✅     |
| `leave_chat`   | Enviado  | ✅     |
| `send_message` | Enviado  | ✅     |
| `mark_read`    | Enviado  | ✅     |
| `typing_start` | Enviado  | ✅     |
| `typing_stop`  | Enviado  | ✅     |

---

## 7. Fluxo de Navegação

```
Menu → Suporte (index.tsx)
         │
         ├── [Nova conversa] → Cria chat → Navega para [id].tsx
         │
         ├── [Histórico] → Navega para protocolos/index.tsx
         │
         └── [Card de chat] → Navega para [id].tsx
```

---

## 8. Possíveis Melhorias (Opcionais)

### 8.1. Criar UserContext Centralizado

- Atualmente: Hooks individuais (useFindChatsByUser, usePostMessage, etc.)
- Melhoria: Criar contexto centralizado como no agility-frontend-app
- **Prioridade**: Baixa (arquitetura atual funciona bem)

### 8.2. Adicionar Refresh ao Focar na Janela

- Adicionar listener para `AppState.addEventListener('change')`
- Recarregar chats quando app volta para foreground
- **Prioridade**: Baixa

### 8.3. Reorganizar Estrutura de Pastas

- Mover `protocolos/` para `suporte/historico/`
- Manter estrutura idêntica ao agility-frontend-app
- **Prioridade**: Baixa (questão organizacional)

---

## 9. Conclusão

✅ **O lab-app está com a funcionalidade de suporte completa e funcional.**

A arquitetura é ligeiramente diferente (hooks individuais vs contexto centralizado), mas ambas são válidas e a funcionalidade é equivalente ao agility-frontend-app.

### Não são necessárias mudanças urgentes.

Se desejar alinhar a arquitetura exatamente com o agility-frontend-app, as melhorias listadas na seção 8 podem ser implementadas.
