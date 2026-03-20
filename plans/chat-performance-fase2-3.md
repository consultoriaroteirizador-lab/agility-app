# Plano de Otimizações de Chat - Fase 2 e 3

## 📊 Status Atual (Fase 1 Concluída)

### ✅ Otimizações Implementadas

| Tarefa                               | Status       | Impacto                             |
| ------------------------------------ | ------------ | ----------------------------------- |
| Cache de IDs no backend              | ✅ Concluído | Reduz 3-5s para <100ms por mensagem |
| Remover delays artificiais (lab-app) | ✅ Concluído | Economia de 600ms                   |
| Paralelizar chamadas REST (platform) | ✅ Concluído | Reduz 8-15s para 3-5s               |
| Integrar cache no ChatGateway        | ✅ Concluído | Conversões paralelas                |

---

## 🔜 Fase 2 - Otimizações de Arquitetura

### 2.1 Simplificar Broadcast no ChatGateway

**Problema Atual:**

```typescript
// Broadcast triplo atual:
1. this.server.to(`chat:${chatId}`).emit('new_message', messageJson);  // Sala
2. participantSockets.forEach(socketId => {
     this.server.to(socketId).emit('new_message', messageJson);        // Sockets individuais
   });
3. participantSockets.forEach(socketId => {
     this.server.to(socketId).emit('notification', {...});             // Notificação
   });
```

**Solução Proposta:**

```typescript
// Broadcast único para a sala (Socket.IO já entrega para todos)
this.server.to(`chat:${chatId}`).emit('new_message', messageJson);

// Notificação apenas para usuários NÃO na sala (offline ou em outra tela)
for (const keycloakUserId of participantKeycloakIds) {
    const participantSockets = this.userSockets.get(keycloakUserId);
    const isInRoom = participantSockets?.some(socketId => {
        const socket = this.server.sockets.sockets.get(socketId);
        return socket?.rooms.has(`chat:${chatId}`);
    });

    if (!isInRoom && participantSockets) {
        // Enviar notificação apenas para quem não está na sala
        participantSockets.forEach(socketId => {
            this.server.to(socketId).emit('notification', {...});
        });
    }
}
```

**Arquivos:**

- `agility-services/src/chat/gateway/chat.gateway.ts`

**Impacto:** Reduz processamento e evita mensagens duplicadas

---

### 2.2 Cache de Validação de Tenant

**Problema Atual:**

```typescript
// Validação de tenant no DB a cada conexão WebSocket
const company = await this.prismaService.client.company.findUnique({
  where: {id: tenantId},
});
```

**Solução Proposta:**

```typescript
// Criar TenantCacheService
@Injectable()
export class TenantCacheService {
  private cache: Map<
    string,
    {
      company: {id: string; keycloakRealmName: string};
      expiresAt: number;
    }
  > = new Map();

  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutos

  async getTenant(
    tenantId: string,
    prisma: PrismaService
  ): Promise<{
    id: string;
    keycloakRealmName: string;
  } | null> {
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.company;
    }

    const company = await prisma.client.company.findUnique({
      where: {id: tenantId},
      select: {id: true, keycloakRealmName: true},
    });

    if (company) {
      this.cache.set(tenantId, {
        company,
        expiresAt: Date.now() + this.TTL_MS,
      });
    }
    return company;
  }

  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
  }
}
```

**Arquivos:**

- `agility-services/src/chat/service/tenant-cache.service.ts` (novo)
- `agility-services/src/chat/gateway/chat.gateway.ts` (modificar)
- `agility-services/src/chat/chat.module.ts` (registrar serviço)

**Impacto:** Reduz 1-2s por conexão WebSocket

---

### 2.3 Paginar Lista de Chats Disponíveis

**Problema Atual:**

- Carrega TODOS os chats disponíveis de uma vez
- Pode ser lento com muitos chats

**Solução Proposta:**

**Backend:**

```typescript
// chat.controller.ts
@Get('available')
async listAvailableSupportChats(
  @Query('page') page: string = '1',
  @Query('limit') limit: string = '20',
) {
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 50); // Max 50

  return this.chatService.findAvailableSupportChatsPaginated(pageNum, limitNum);
}
```

**Frontend (platform):**

```typescript
// ChatPage.tsx - usar paginação infinita
const {
  data: availableChats,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['available-chats'],
  queryFn: ({pageParam = 1}) => listAvailableSupportChatsService(pageParam, 20),
  getNextPageParam: lastPage => lastPage.nextPage ?? undefined,
});
```

**Arquivos:**

- `agility-services/src/chat/controller/chat.controller.ts`
- `agility-services/src/chat/service/chat.service.ts`
- `agility-frontend-platform/src/app/chat/ChatPage.tsx`

**Impacto:** Carregamento inicial mais rápido

---

## 🎨 Fase 3 - Melhorias de UX

### 3.1 Melhorar Mensagens Otimistas

**Problema Atual:**

- Mensagem otimista pode não ser substituída corretamente
- Timeout de 10s pode ser longo demais

**Solução Proposta:**

```typescript
// Melhorar matching de mensagens otimistas
const matchingRealMessage = wsMessages.find(msg => {
  // Matching por conteúdo E tempo E remetente
  const contentMatches = tempMsg.content === msg.content;
  const senderMatches = tempMsg.senderId === msg.senderId;
  const timeMatches =
    Math.abs(
      new Date(tempMsg.createdAt).getTime() - new Date(msg.createdAt).getTime()
    ) < 5000; // Reduzir para 5s

  return contentMatches && senderMatches && timeMatches;
});

// Adicionar ID temporário ao enviar via WebSocket
sendMessage({
  chatId: selectedChatId,
  content,
  tempId: tempId, // Backend pode retornar no new_message
});
```

**Adicionar indicador de status:**

```typescript
// Mostrar status visual na mensagem otimista
{message.id.startsWith('temp-') && (
  <span className="text-xs text-gray-400">Enviando...</span>
)}
```

**Arquivos:**

- `agility-frontend-platform/src/app/chat/ChatPage.tsx`
- `lab-app/src/domain/agility/chat/useCase/usePostMessage.ts`

**Impacto:** UX mais fluida e confiável

---

### 3.2 Indicador de Conexão Mais Visível

**Solução Proposta:**

```typescript
// Componente de status de conexão
const ConnectionStatus = ({ isConnected, reconnect }: {
  isConnected: boolean;
  reconnect: () => void
}) => {
  if (isConnected) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-500 text-white py-2 px-4 text-center text-sm z-50">
      <span className="animate-pulse">●</span> Conexão perdida
      <button
        onClick={reconnect}
        className="ml-2 underline hover:no-underline"
      >
        Reconectar
      </button>
    </div>
  );
};

// Toast/Banner quando reconecta
const [showReconnected, setShowReconnected] = useState(false);

useEffect(() => {
  if (isConnected && wasDisconnectedRef.current) {
    setShowReconnected(true);
    setTimeout(() => setShowReconnected(false), 3000);
  }
  wasDisconnectedRef.current = !isConnected;
}, [isConnected]);
```

**Arquivos:**

- `agility-frontend-platform/src/app/chat/ChatPage.tsx`
- `lab-app/src/app/(auth)/(tabs)/menu/suporte/[id].tsx`

**Impacto:** Usuário sempre sabe o estado da conexão

---

### 3.3 Retry Automático de Mensagens

**Solução Proposta:**

```typescript
// Fila de mensagens pendentes
interface PendingMessage {
  id: string;
  chatId: string;
  content: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: number;
}

const pendingMessagesRef = useRef<PendingMessage[]>([]);

// Quando mensagem falha, adicionar à fila
const addToRetryQueue = (message: PendingMessage) => {
  pendingMessagesRef.current.push({
    ...message,
    attempts: 0,
    maxAttempts: 3,
    nextAttemptAt: Date.now() + 2000, // 2s
  });
};

// Worker de retry
useEffect(() => {
  const interval = setInterval(() => {
    if (!isConnected) return;

    const now = Date.now();
    const toRetry = pendingMessagesRef.current.filter(
      m => m.attempts < m.maxAttempts && m.nextAttemptAt <= now
    );

    toRetry.forEach(msg => {
      msg.attempts++;
      msg.nextAttemptAt = Date.now() + msg.attempts * 2000; // Backoff exponencial

      sendMessage({
        chatId: msg.chatId,
        content: msg.content,
      });
    });

    // Remover mensagens que excederam tentativas
    pendingMessagesRef.current = pendingMessagesRef.current.filter(
      m => m.attempts < m.maxAttempts
    );
  }, 1000);

  return () => clearInterval(interval);
}, [isConnected]);
```

**Arquivos:**

- `agility-frontend-platform/src/app/chat/ChatPage.tsx`
- `lab-app/src/domain/agility/chat/useCase/usePostMessage.ts`

**Impacto:** Mensagens nunca são perdidas

---

## 📋 Checklist de Implementação

### Fase 2

- [ ] 2.1 Simplificar broadcast no ChatGateway
  - [ ] Remover emissões duplicadas
  - [ ] Notificar apenas quem não está na sala
  - [ ] Testar delivery de mensagens

- [ ] 2.2 Implementar cache de validação de tenant
  - [ ] Criar TenantCacheService
  - [ ] Integrar no ChatGateway
  - [ ] Testar invalidação de cache

- [ ] 2.3 Paginar lista de chats disponíveis
  - [ ] Modificar endpoint backend
  - [ ] Implementar paginação infinita no frontend
  - [ ] Testar scroll infinito

### Fase 3

- [ ] 3.1 Melhorar mensagens otimistas
  - [ ] Melhorar matching de mensagens
  - [ ] Adicionar indicador de status
  - [ ] Reduzir timeout

- [ ] 3.2 Indicador de conexão mais visível
  - [ ] Criar componente de status
  - [ ] Adicionar banner de reconexão
  - [ ] Testar cenários de desconexão

- [ ] 3.3 Retry automático de mensagens
  - [ ] Implementar fila de retry
  - [ ] Adicionar backoff exponencial
  - [ ] Mostrar indicador de retry na UI

---

## 🎯 Priorização Atualizada

| Prioridade | Tarefa                       | Impacto | Esforço | Status    |
| ---------- | ---------------------------- | ------- | ------- | --------- |
| ✅ P0      | Cache de IDs no backend      | Alto    | Médio   | Concluído |
| ✅ P0      | Remover delays artificiais   | Alto    | Baixo   | Concluído |
| ✅ P1      | Paralelizar chamadas REST    | Alto    | Baixo   | Concluído |
| 🟠 P1      | Simplificar broadcast        | Médio   | Médio   | Pendente  |
| 🟡 P2      | Cache de tenant              | Médio   | Baixo   | Pendente  |
| 🟡 P2      | Retry automático             | Médio   | Médio   | Pendente  |
| 🟢 P3      | Indicador de conexão         | Baixo   | Baixo   | Pendente  |
| 🟢 P3      | Paginar chats                | Baixo   | Baixo   | Pendente  |
| 🟢 P3      | Melhorar mensagens otimistas | Baixo   | Baixo   | Pendente  |

---

## 📊 Métricas Esperadas (Após Fase 2 e 3)

| Métrica                     | Antes (Original) | Fase 1 | Fase 2+3 |
| --------------------------- | ---------------- | ------ | -------- |
| Tempo para enviar mensagem  | 3-5s             | <500ms | <300ms   |
| Tempo para receber mensagem | 2-4s             | <200ms | <100ms   |
| Tempo para iniciar chat     | 15-25s           | 5-8s   | 3-5s     |
| Conexão WebSocket           | 1-2s             | <500ms | <200ms   |
| Mensagens perdidas          | Ocasional        | Raro   | Nunca    |

---

_Documento atualizado em: 10/03/2026_
