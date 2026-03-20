# Análise Completa do Sistema de Chat - Problemas de Performance e Tempo Real

## 🔍 Arquitetura do Sistema

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   lab-app       │────▶│  agility-services│◀────│  frontend-platform│
│  (Motorista)    │     │    (Backend)     │     │   (Operador)     │
│  React Native   │     │  NestJS + Socket │     │    Next.js       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## ❌ Problemas Identificados

### Problema 1: Mensagens NÃO Chegam em Tempo Real

**Causas:**

| #   | Causa                                           | Local                           | Impacto           |
| --- | ----------------------------------------------- | ------------------------------- | ----------------- |
| 1   | **Conversões de ID síncronas** no gateway       | `chat.gateway.ts`               | 3-5s por mensagem |
| 2   | Broadcast triplo (sala + sockets + notificação) | `chat.gateway.ts`               | Duplicação/delay  |
| 3   | Validação de tenant no DB a cada conexão        | `chat.gateway.ts`               | 1-2s por conexão  |
| 4   | Delays artificiais (500ms + 100ms)              | `useChatWebSocket.ts` (lab-app) | 600ms fixo        |
| 5   | Rooms vazias - motorista removido erroneamente  | `chat.gateway.ts`               | Mensagem perdida  |

**Código problemático (backend):**

```typescript
// Para CADA mensagem, faz múltiplas queries sequenciais:
for (const participant of participants) {
    if (participantType === ParticipantType.DRIVER) {
        const driver = await this.driverService.findOne(...);      // Query 1
        const collaborator = await this.collaboratorService.findOne(...); // Query 2
    }
    // ... mais queries para cada participante
}
```

---

### Problema 2: Lentidão para Iniciar/Continuar Chat (~25 segundos)

**Causas:**

| #   | Causa                                      | Local                | Impacto  |
| --- | ------------------------------------------ | -------------------- | -------- |
| 1   | **Cascata de chamadas REST sequenciais**   | `ChatPage.tsx`       | 8-15s    |
| 2   | Conversões de ID em cada endpoint          | `chat.controller.ts` | 3-5s     |
| 3   | Refetches com debounce de 2s               | `ChatPage.tsx`       | 2s       |
| 4   | Carregamento de TODOS os chats disponíveis | `ChatPage.tsx`       | Variável |

**Fluxo atual (sequencial):**

```
handleSelectChat()
  ├── joinSupportChatService()        ~2s
  ├── refetchChatsImmediate()         ~3s
  ├── findByChatId()                  ~1s
  ├── assignMutation.mutateAsync()    ~2s
  ├── refetchTicket()                 ~1s
  └── getChatMessagesService()        ~2s
  Total: ~11-15s (com latência de rede pode chegar a 25s)
```

---

## 📋 Plano de Correção

### Fase 1: Otimizações Críticas (Alto Impacto Imediato)

**1.1 Cache de Mapeamento de IDs (Backend)**

- Criar serviço de cache para `keycloakUserId ↔ internalId`
- TTL de 5-10 minutos
- Reduz 3-5s para <100ms por mensagem

**1.2 Remover Delays Artificiais (Frontend)**

- Remover 500ms de delay antes de conectar
- Remover 100ms após 'connected'
- Economia: 600ms

**1.3 Paralelizar Chamadas REST (Platform)**

- Usar `Promise.all()` para chamadas independentes
- Reduz 8-15s para 3-5s

### Fase 2: Otimizações de Arquitetura

**2.1 Simplificar Broadcast (Backend)**

- Emitir apenas uma vez para a sala
- Remover emissões individuais duplicadas

**2.2 Cache de Validação de Tenant (Backend)**

- Cachear validação de company/tenant
- Reduz tempo de conexão

**2.3 Otimizar Carregamento de Chats (Platform)**

- Paginar lista de chats disponíveis
- Carregar apenas quando necessário

### Fase 3: Melhorias de UX

**3.1 Mensagens Otimistas**

- Já existe, mas pode ser melhorado
- Garantir que mensagem apareça instantaneamente

**3.2 Indicador de Conexão**

- Mostrar status de WebSocket claramente
- Permitir reconexão manual

---

## 🎯 Priorização

| Prioridade | Tarefa                     | Impacto | Esforço |
| ---------- | -------------------------- | ------- | ------- |
| 🔴 P0      | Cache de IDs no backend    | Alto    | Médio   |
| 🔴 P0      | Remover delays artificiais | Alto    | Baixo   |
| 🟠 P1      | Paralelizar chamadas REST  | Alto    | Baixo   |
| 🟠 P1      | Simplificar broadcast      | Médio   | Médio   |
| 🟡 P2      | Cache de tenant            | Médio   | Baixo   |
| 🟢 P3      | Paginar chats disponíveis  | Baixo   | Baixo   |

---

## 📁 Arquivos Envolvidos

### Backend (agility-services)

- `src/chat/gateway/chat.gateway.ts` - WebSocket Gateway
- `src/chat/service/chat.service.ts` - Lógica de negócio
- `src/chat/controller/chat.controller.ts` - REST endpoints
- `src/chat/repository/impl/prisma-chat.repository.ts` - Persistência

### Frontend Motorista (lab-app)

- `src/domain/agility/chat/useCase/useChatWebSocket.ts` - WebSocket hook
- `src/domain/agility/chat/useCase/usePostMessage.ts` - Envio de mensagens
- `src/domain/agility/chat/useCase/useGetChatMessages.ts` - Busca de mensagens
- `src/app/(auth)/(tabs)/menu/suporte/[id].tsx` - Tela de chat

### Frontend Operador (agility-frontend-platform)

- `src/hooks/useChatWebSocket.ts` - WebSocket hook
- `src/app/chat/ChatPage.tsx` - Tela de chat
- `src/domain/agility/chat/chatService.ts` - Serviços de chat

---

## 🔧 Detalhes Técnicos

### 1. Conversões de ID no Backend

**Localização:** `chat.gateway.ts` linhas 180-250

**Problema:** Para cada mensagem enviada via WebSocket:

1. O `senderId` (keycloakUserId) precisa ser convertido para ID interno
2. Para cada participante, o ID interno precisa ser convertido de volta para keycloakUserId
3. Isso envolve múltiplas queries ao banco de dados

**Solução Proposta:**

```typescript
// Criar serviço de cache
@Injectable()
export class UserIdCacheService {
  private cache: Map<string, {internalId: string; expiresAt: number}> =
    new Map();

  async getInternalId(
    keycloakUserId: string,
    type: ParticipantType
  ): Promise<string> {
    const cached = this.cache.get(keycloakUserId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.internalId;
    }
    // Buscar e cachear
    const internalId = await this.resolveInternalId(keycloakUserId, type);
    this.cache.set(keycloakUserId, {
      internalId,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos
    });
    return internalId;
  }
}
```

### 2. Delays Artificiais no Frontend

**Localização:** `useChatWebSocket.ts` (lab-app)

**Problema:**

```typescript
// Delay antes de conectar
const timeoutId = setTimeout(() => {
  if (isMountedRef.current && enabled && !socketRef.current?.connected) {
    connect();
  }
}, 500); // 500ms de delay

// Delay após 'connected'
setTimeout(() => {
  if (isMountedRef.current && socketRef.current?.connected) {
    setIsConnected(true);
    setConnectedRef.current(true);
  }
}, 100); // 100ms de delay
```

**Solução:** Remover ou reduzir significativamente esses delays.

### 3. Chamadas Sequenciais no Platform

**Localização:** `ChatPage.tsx` função `handleSelectChat`

**Problema:** Chamadas são feitas sequencialmente quando poderiam ser paralelas.

**Solução:**

```typescript
// Antes (sequencial)
await joinSupportChatService(chatId);
await refetchChatsImmediate();
const ticket = await findByChatId(chatId);
await assignMutation.mutateAsync(ticket.id);
await refetchTicket();

// Depois (paralelo onde possível)
const [joinResult] = await Promise.all([
  joinSupportChatService(chatId),
  refetchChatsImmediate(),
]);
// Depois chamadas que dependem do resultado anterior
const ticket = await findByChatId(chatId);
await Promise.all([assignMutation.mutateAsync(ticket.id), refetchTicket()]);
```

---

## 📊 Métricas Esperadas

| Métrica                     | Antes  | Depois (Estimado) |
| --------------------------- | ------ | ----------------- |
| Tempo para enviar mensagem  | 3-5s   | <500ms            |
| Tempo para receber mensagem | 2-4s   | <200ms            |
| Tempo para iniciar chat     | 15-25s | 5-8s              |
| Conexão WebSocket           | 1-2s   | <500ms            |

---

## ✅ Checklist de Implementação

### Fase 1

- [ ] Criar `UserIdCacheService` no backend
- [ ] Integrar cache no `ChatGateway`
- [ ] Remover delays no `useChatWebSocket.ts` (lab-app)
- [ ] Remover delays no `useChatWebSocket.ts` (platform)
- [ ] Paralelizar chamadas em `ChatPage.tsx`
- [ ] Paralelizar chamadas em `suporte/[id].tsx`

### Fase 2

- [ ] Simplificar broadcast no `ChatGateway`
- [ ] Implementar cache de validação de tenant
- [ ] Paginar lista de chats disponíveis

### Fase 3

- [ ] Melhorar mensagens otimistas
- [ ] Adicionar indicador de conexão mais visível
- [ ] Implementar retry automático de mensagens

---

## 🧪 Testes

Após implementação, testar:

1. **Tempo Real**
   - Motorista envia mensagem → Operador recebe em <1s
   - Operador envia mensagem → Motorista recebe em <1s

2. **Performance**
   - Iniciar novo chat: <8s
   - Continuar chat existente: <5s

3. **Cenários de Erro**
   - Reconexão automática funciona
   - Mensagens não são perdidas
   - Cache invalida corretamente

---

_Documento gerado em: 10/03/2026_
_Autor: Análise automatizada_
