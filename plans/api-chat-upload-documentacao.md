# Documentação da API de Chat - Upload de Arquivos

## Visão Geral

Este documento descreve como o sistema de chat do backend Agility Services gerencia o envio de arquivos (anexos). O sistema suporta dois métodos de comunicação:

1. **REST API** - Para operações síncronas como upload de arquivos
2. **WebSocket** - Para comunicação em tempo real (mensagens, eventos)

---

## Fluxo Completo de Upload e Envio de Mensagens

### 1. Upload do Arquivo (REST)

**Endpoint:** `POST /chats/upload`

**Headers obrigatórios:**

```
Authorization: Bearer <token_jwt>
x-tenant-id: <tenant_uuid>
```

**Configurações do upload:**

- Campo do formulário: `files` (multipart/form-data)
- Máximo de arquivos: **5 arquivos por requisição**
- Tamanho máximo por arquivo: **10MB**
- Armazenamento: **S3/MinIO** (obrigatório)

**Tipos de arquivo permitidos (MIME types):**
| Categoria | MIME Types |
|-----------|------------|
| Imagens | `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif` |
| Documentos | `application/pdf` |
| Word | `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |

**Exemplo de requisição:**

```typescript
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);

const response = await fetch('/chats/upload', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  },
  body: formData,
});
```

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "result": {
    "urls": [
      "https://s3.example.com/chat/company-uuid/chat-1234567890-image.jpg",
      "https://s3.example.com/chat/company-uuid/chat-1234567891-doc.pdf"
    ],
    "count": 2
  }
}
```

**Resposta de erro (400):**

```json
{
  "statusCode": 400,
  "message": "Invalid file type. Allowed: images (JPEG, PNG, WebP, GIF), PDF, Word.",
  "error": "Bad Request"
}
```

**Resposta de erro - S3 não configurado (400):**

```json
{
  "statusCode": 400,
  "message": "S3 storage is required for chat attachments. Configure S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET_CHAT (and S3_PUBLIC_URL_CHAT for public URLs).",
  "error": "Bad Request"
}
```

---

### 2. Envio da Mensagem com Anexo

Após o upload, você pode enviar a mensagem com a URL do anexo via **REST** ou **WebSocket**.

#### Opção A: Via REST

**Endpoint:** `POST /chats/message`

**Headers obrigatórios:**

```
Authorization: Bearer <token_jwt>
x-tenant-id: <tenant_uuid>
```

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `senderType` | enum | Sim | Tipo do remetente: `DRIVER`, `COLLABORATOR`, `SUPPORT`, `CUSTOMER` |

**Body (SendMessageDto):**

```json
{
  "chatId": "uuid-do-chat",
  "senderId": "uuid-do-remetente",
  "content": "Mensagem de texto (obrigatório, máx 4000 chars)",
  "attachmentUrl": "https://s3.example.com/chat/.../arquivo.jpg",
  "attachmentType": "image"
}
```

| Campo            | Tipo   | Obrigatório | Descrição                                      |
| ---------------- | ------ | ----------- | ---------------------------------------------- |
| `chatId`         | UUID   | Sim         | ID do chat                                     |
| `senderId`       | UUID   | Sim         | ID do remetente (keycloakUserId ou ID interno) |
| `content`        | string | Sim         | Conteúdo da mensagem (máx 4000 caracteres)     |
| `attachmentUrl`  | string | Não         | URL do arquivo retornado no upload             |
| `attachmentType` | string | Não         | Tipo do anexo: `image`, `document`, `audio`    |

**Resposta de sucesso (201):**

```json
{
  "id": "uuid-da-mensagem",
  "chatId": "uuid-do-chat",
  "senderId": "uuid-do-remetente",
  "senderType": "DRIVER",
  "content": "Mensagem de texto",
  "attachmentUrl": "https://s3.example.com/chat/.../arquivo.jpg",
  "attachmentType": "image",
  "status": "SENT",
  "readAt": null,
  "deliveredAt": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Opção B: Via WebSocket

**Evento:** `send_message`

**Payload (SendMessagePayload):**

```json
{
  "chatId": "uuid-do-chat",
  "content": "Mensagem de texto",
  "attachmentUrl": "https://s3.example.com/chat/.../arquivo.jpg",
  "attachmentType": "image"
}
```

**Nota:** O `senderId` e `senderType` são obtidos automaticamente da conexão WebSocket autenticada.

---

## Conexão WebSocket

### URL de Conexão

```
ws://<host>/chat
```

### Parâmetros de Autenticação (handshake)

| Parâmetro     | Local         | Obrigatório | Descrição                                             |
| ------------- | ------------- | ----------- | ----------------------------------------------------- |
| `userId`      | auth ou query | Sim         | keycloakUserId do usuário                             |
| `userType`    | auth ou query | Sim         | Tipo: `DRIVER`, `COLLABORATOR`, `SUPPORT`, `CUSTOMER` |
| `x-tenant-id` | header        | Sim         | UUID do tenant                                        |

**Exemplo de conexão:**

```typescript
import {io} from 'socket.io-client';

const socket = io('ws://localhost:3000/chat', {
  auth: {
    userId: 'keycloak-user-uuid',
    userType: 'DRIVER',
  },
  extraHeaders: {
    'x-tenant-id': 'tenant-uuid',
  },
});

socket.on('connect', () => {
  console.log('Conectado ao chat');
});

socket.on('connected', data => {
  console.log('Autenticado:', data);
  // { userId, userType, socketId }
});

socket.on('error', error => {
  console.error('Erro:', error);
});
```

---

## Eventos WebSocket

### Eventos de Entrada (Cliente → Servidor)

#### `join_chat`

Entrar em uma sala de chat para receber mensagens.

```typescript
socket.emit('join_chat', {
  chatId: 'uuid-do-chat',
  userId: 'uuid-do-usuario',
});
```

**Resposta:**

```json
{"success": true, "chatId": "uuid-do-chat"}
```

**Eventos recebidos após join:**

- `chat_history`: Histórico de mensagens
- `user_joined`: Notificação de outro usuário entrando

---

#### `send_message`

Enviar mensagem (com ou sem anexo).

```typescript
socket.emit('send_message', {
  chatId: 'uuid-do-chat',
  content: 'Texto da mensagem',
  attachmentUrl: 'https://...', // opcional
  attachmentType: 'image', // opcional
});
```

---

#### `leave_chat`

Sair da sala de chat.

```typescript
socket.emit('leave_chat', {
  chatId: 'uuid-do-chat',
  userId: 'uuid-do-usuario',
});
```

---

#### `typing`

Indicar que está digitando.

```typescript
socket.emit('typing', {
  chatId: 'uuid-do-chat',
  isTyping: true,
});
```

---

#### `mark_as_read`

Marcar mensagens como lidas.

```typescript
socket.emit('mark_as_read', {
  chatId: 'uuid-do-chat',
  messageId: 'uuid-da-ultima-mensagem',
});
```

---

### Eventos de Saída (Servidor → Cliente)

| Evento               | Descrição                                | Payload                                              |
| -------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `connected`          | Conexão autenticada                      | `{ userId, userType, socketId }`                     |
| `chat_history`       | Histórico de mensagens ao entrar no chat | `{ chatId, messages: Message[] }`                    |
| `new_message`        | Nova mensagem recebida                   | `Message`                                            |
| `user_joined`        | Usuário entrou no chat                   | `{ chatId, userId, userType }`                       |
| `user_left`          | Usuário saiu do chat                     | `{ chatId, userId }`                                 |
| `messages_delivered` | Mensagens entregues                      | `{ chatId, messageIds[], deliveredTo, deliveredAt }` |
| `typing`             | Usuário está digitando                   | `{ chatId, userId, isTyping }`                       |
| `chat_error`         | Erro no chat                             | `{ type, message, chatId? }`                         |
| `error`              | Erro geral                               | `{ message }`                                        |

---

## Estrutura de Dados

### Message (Mensagem)

```typescript
interface Message {
  id: string; // UUID
  chatId: string; // UUID do chat
  senderId: string; // UUID do remetente (ID interno)
  senderType: ParticipantType;
  content: string; // Texto da mensagem
  attachmentUrl?: string; // URL do anexo (S3/MinIO)
  attachmentType?: string; // 'image', 'document', 'audio'
  status: MessageStatus; // 'SENT', 'DELIVERED', 'READ'
  readAt?: Date; // Data de leitura
  deliveredAt?: Date; // Data de entrega
  createdAt: Date;
  updatedAt: Date;
}
```

### Enums

```typescript
enum ParticipantType {
  DRIVER = 'DRIVER',
  CUSTOMER = 'CUSTOMER',
  SUPPORT = 'SUPPORT',
  COLLABORATOR = 'COLLABORATOR',
}

enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

enum ChatType {
  DRIVER_SUPPORT = 'DRIVER_SUPPORT', // Motorista <-> Atendimento
  DRIVER_CUSTOMER = 'DRIVER_CUSTOMER', // Motorista <-> Cliente
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT', // Cliente <-> Atendimento
}

enum ChatStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}
```

---

## Outros Endpoints REST

### Criar/Obter Chat de Suporte do Motorista

**Endpoint:** `POST /chats/driver-support`

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `driverId` | UUID | Não | Se não informado, usa o usuário atual |
| `supportId` | UUID | Não | ID do agente de suporte |

---

### Criar/Obter Chat Operador-Motorista

**Endpoint:** `POST /chats/operator-driver`

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `driverId` | UUID | Sim | ID do motorista |

---

### Listar Chats do Usuário

**Endpoint:** `GET /chats/user/:userId`

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `userType` | enum | Não | Tipo: `DRIVER`, `COLLABORATOR`, etc. |

---

### Obter Mensagens de um Chat

**Endpoint:** `GET /chats/:id/messages`

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `limit` | number | Não | Máximo de mensagens (padrão: 50) |
| `offset` | number | Não | Offset para paginação (padrão: 0) |

---

### Marcar Mensagens como Lidas

**Endpoint:** `PATCH /chats/:chatId/read/:userId`

---

### Obter Contagem de Não Lidas

**Endpoint:** `GET /chats/:chatId/unread/:userId`

**Resposta:**

```json
{"unreadCount": 5}
```

---

### Fechar Chat

**Endpoint:** `PATCH /chats/:id/close`

**Nota:** Ao fechar o chat, todos os anexos são removidos do S3/MinIO.

---

## Fluxo Recomendado para o Frontend

### Enviar mensagem com anexo:

```typescript
// 1. Fazer upload do arquivo
const uploadResponse = await fetch('/chats/upload', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  },
  body: formData, // files no campo 'files'
});

const {result} = await uploadResponse.json();
const attachmentUrl = result.urls[0];

// 2. Determinar tipo de anexo
const attachmentType = getAttachmentType(file.type); // 'image', 'document', etc.

// 3. Enviar mensagem via WebSocket (recomendado para tempo real)
socket.emit('send_message', {
  chatId: currentChatId,
  content: messageText,
  attachmentUrl,
  attachmentType,
});

// OU via REST
await fetch('/chats/message?senderType=DRIVER', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    chatId: currentChatId,
    senderId: userId,
    content: messageText,
    attachmentUrl,
    attachmentType,
  }),
});
```

### Receber mensagens:

```typescript
socket.on('new_message', (message: Message) => {
  // Adicionar mensagem à lista
  if (message.attachmentUrl) {
    // Exibir anexo (imagem, PDF, etc.)
  }
});
```

---

## Tratamento de Erros

| Código | Erro                                 | Solução                                       |
| ------ | ------------------------------------ | --------------------------------------------- |
| 400    | Invalid file type                    | Usar apenas JPEG, PNG, WebP, GIF, PDF ou Word |
| 400    | No files uploaded                    | Enviar pelo menos um arquivo no campo `files` |
| 400    | S3 storage is required               | Backend precisa configurar S3/MinIO           |
| 400    | Company ID not found                 | Header `x-tenant-id` não está sendo enviado   |
| 404    | Chat not found                       | Chat ID inválido ou não existe                |
| 400    | Cannot send message to a closed chat | Chat foi fechado, criar novo                  |

---

## Notas Importantes

1. **Autenticação**: Todas as requisições requerem JWT válido e header `x-tenant-id`
2. **Conversão de IDs**: O backend converte automaticamente `keycloakUserId` para IDs internos
3. **Limite de arquivos**: Máximo 5 arquivos por upload, 10MB cada
4. **Armazenamento**: S3/MinIO é obrigatório para anexos de chat
5. **Limpeza**: Anexos são removidos quando o chat é fechado
6. **Tempo real**: Use WebSocket para melhor experiência do usuário
7. **Fallback REST**: Mensagens enviadas via REST também são transmitidas via WebSocket

---

## Exemplo Completo (React Native / Expo)

```typescript
import * as ImagePicker from 'expo-image-picker';
import {io, Socket} from 'socket.io-client';

// 1. Selecionar imagem
const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (!result.canceled) {
    return result.assets[0];
  }
  return null;
};

// 2. Upload da imagem
const uploadFile = async (uri: string, token: string, tenantId: string) => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('files', {
    uri,
    name: filename,
    type,
  } as any);

  const response = await fetch('https://api.example.com/chats/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId,
    },
    body: formData,
  });

  const data = await response.json();
  return data.result.urls[0];
};

// 3. Conectar WebSocket
const connectSocket = (userId: string, userType: string, tenantId: string) => {
  const socket = io('wss://api.example.com/chat', {
    auth: {userId, userType},
    extraHeaders: {'x-tenant-id': tenantId},
  });

  socket.on('connect', () => console.log('Conectado'));
  socket.on('new_message', msg => console.log('Nova mensagem:', msg));

  return socket;
};

// 4. Enviar mensagem com anexo
const sendMessageWithAttachment = async (
  socket: Socket,
  chatId: string,
  content: string,
  attachmentUrl: string
) => {
  socket.emit('send_message', {
    chatId,
    content,
    attachmentUrl,
    attachmentType: 'image',
  });
};
```

---

## Resumo dos Endpoints

| Método | Endpoint                        | Descrição                                |
| ------ | ------------------------------- | ---------------------------------------- |
| POST   | `/chats/upload`                 | Upload de arquivos                       |
| POST   | `/chats/message`                | Enviar mensagem via REST                 |
| POST   | `/chats`                        | Criar novo chat                          |
| POST   | `/chats/driver-support`         | Criar/obter chat de suporte do motorista |
| POST   | `/chats/operator-driver`        | Criar/obter chat operador-motorista      |
| GET    | `/chats/:id`                    | Obter chat por ID                        |
| GET    | `/chats/user/:userId`           | Listar chats do usuário                  |
| GET    | `/chats/:id/messages`           | Listar mensagens do chat                 |
| PATCH  | `/chats/:id/close`              | Fechar chat                              |
| PATCH  | `/chats/:chatId/read/:userId`   | Marcar como lido                         |
| GET    | `/chats/:chatId/unread/:userId` | Contagem de não lidas                    |
| PATCH  | `/chats/messages/delivered`     | Marcar como entregue                     |
