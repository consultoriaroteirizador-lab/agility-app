# Plano de Correção de Erros - Análise de Logs

## Resumo Executivo

Foram identificados **3 tipos de erros** nos logs de produção:

| # | Erro | Severidade | Origem | Status |
|---|------|------------|--------|--------|
| 1 | BGGeolocation HTTP Timeouts | Média | Frontend | Corrigível |
| 2 | expo-image-picker Deprecation | Baixa | Frontend | Corrigível |
| 3 | Prisma Connection Pool Exhaustion | **Crítica** | Backend | Requer ação no backend |

---

## 1. Erro Crítico: Prisma Connection Pool Exhaustion

### Log do Erro
```
ERROR: Invalid `prisma.$executeRawUnsafe()` invocation:
Timed out fetching a new connection from the connection pool.
(Current connection pool timeout: 30, connection limit: 20)
```

### Análise
- **Causa Raiz**: O backend está esgotando o pool de conexões do Prisma
- **Impacto**: Falha ao completar serviços (HTTP 500)
- **Origem**: Endpoint `/services/{id}/completion-details`

### Solução (BACKEND - Não é correção de frontend)

Este erro **não pode ser corrigido no frontend**. Requer alterações no backend:

#### Opção A: Aumentar Pool de Conexões (Prisma Schema)
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}

// Adicionar ao DATABASE_URL ou configurar separadamente:
// ?connection_limit=50&pool_timeout=60
```

#### Opção B: Configurar PgBouncer (Recomendado para Produção)
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true"
```

#### Opção C: Revisar Transações de Longa Duração
- Verificar se há transações não commitadas
- Adicionar timeout em queries complexas
- Implementar connection pooling adequado

### Ações Frontend (Mitigação)

Enquanto o backend não é corrigido, podemos implementar:

1. **Retry com Backoff Exponencial**
2. **Indicador de progresso para operações críticas**
3. **Queue de operações offline**

---

## 2. Erro: BGGeolocation HTTP Timeouts

### Logs do Erro
```
[BGGeolocation] onHttp: {"responseText": "timeout", "status": 0}
[BGGeolocation] onHttp: {"responseText": "Read timed out", "status": 0}
```

### Análise
- **Causa**: Servidor demorando mais que 60s para responder
- **Frequência**: Múltiplos timeouts consecutivos
- **Impacto**: Localizações não sincronizadas (ficam armazenadas localmente)

### Configuração Atual
```typescript
// src/services/location/backgroundLocationService.ts
http: {
  url: `${urls.agilityApi}/tracking/locations`,
  autoSync: true,
  autoSyncThreshold: 5,      // Sincroniza a cada 5 localizações
  batchSync: true,
  maxBatchSize: 50,          // Até 50 localizações por request
  httpTimeout: 60000,        // 60 segundos
}
```

### Solução Proposta

#### Ajuste 1: Reduzir Batch Size
```typescript
http: {
  autoSyncThreshold: 3,      // Reduzir de 5 para 3
  maxBatchSize: 25,          // Reduzir de 50 para 25
}
```

#### Ajuste 2: Aumentar Timeout com Fallback
```typescript
http: {
  httpTimeout: 90000,        // Aumentar para 90 segundos
}
```

#### Ajuste 3: Adicionar Error Handler com Retry Manual
```typescript
function onHttpHandler(event: HttpEvent) {
  if (event.status === 0) {
    // Timeout ou erro de rede
    console.warn('[BGGeolocation] HTTP falhou, tentando sync manual em 30s');
    setTimeout(() => {
      BackgroundGeolocation.syncNow();
    }, 30000);
  }
}
```

---

## 3. Warning: expo-image-picker Deprecation

### Log do Warning
```
WARN [expo-image-picker] `ImagePicker.MediaTypeOptions` have been deprecated.
Use `ImagePicker.MediaType` or an array of `ImagePicker.MediaType` instead.
```

### Arquivos Afetados (4 arquivos, 8 ocorrências)

| Arquivo | Linhas |
|---------|--------|
| `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/insucesso/index.tsx` | 78 |
| `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/useServiceUpload.ts` | 101, 127 |
| `src/components/MultiPhotoPicker/MultiPhotoPicker.tsx` | 58, 80 |
| `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/dados-servico/index.tsx` | 121, 147 |

### Solução

**Antes (deprecated):**
```typescript
mediaTypes: ImagePicker.MediaTypeOptions.Images,
```

**Depois (novo):**
```typescript
mediaTypes: ['images'],
```

---

## 4. Implementação: Retry com Backoff Exponencial

### Criar Hook de Retry

**Novo arquivo: `src/hooks/useRetryMutation.ts`**

```typescript
import { useMutation, UseMutationOptions } from '@tanstack/react-query';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableErrors: [
    'INTERNAL_ERROR',
    'NETWORK_ERROR',
    'TIMEOUT',
    'ECONNRESET',
    'ETIMEDOUT',
  ],
};

export function useRetryMutation<TData, TError, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables> & {
    retryConfig?: Partial<RetryConfig>;
  }
) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
  let retryCount = 0;

  return useMutation({
    mutationFn,
    retry: (failureCount, error: any) => {
      const errorCode = error?.code || error?.error?.code;
      const isRetryable = config.retryableErrors.includes(errorCode);
      
      if (isRetryable && failureCount < config.maxRetries) {
        retryCount = failureCount;
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => {
      // Backoff exponencial: 1s, 2s, 4s, 8s... (max 10s)
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attemptIndex),
        config.maxDelay
      );
      console.log(`[Retry] Tentativa ${attemptIndex + 1}, aguardando ${delay}ms`);
      return delay;
    },
    ...options,
  });
}
```

### Uso no Mutation de Completar Serviço

```typescript
// src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/dados-servico/index.tsx

const completeMutation = useRetryMutation(
  completeServiceWithDetails,
  {
    retryConfig: {
      maxRetries: 3,
      retryableErrors: ['INTERNAL_ERROR', 'NETWORK_ERROR'],
    },
    onSuccess: (data) => {
      // Handle success
    },
    onError: (error) => {
      // Show user-friendly error after all retries failed
      showToast({ 
        message: 'Não foi possível completar o serviço. Tente novamente.',
        type: 'error' 
      });
    },
  }
);
```

---

## Plano de Execução

### Fase 1: Correções Rápidas (Frontend)
- [ ] Atualizar `MediaTypeOptions` → `['images']` (4 arquivos)
- [ ] Ajustar configuração do BGGeolocation (batch size)
- [ ] Melhorar error handler do BGGeolocation

### Fase 2: Melhorias de Resiliência (Frontend)
- [ ] Implementar hook `useRetryMutation`
- [ ] Aplicar retry nas mutations críticas
- [ ] Adicionar indicador de "salvando..." com retry

### Fase 3: Correção Backend (Urgente)
- [ ] Investigar transações de longa duração
- [ ] Aumentar pool de conexões Prisma
- [ ] Implementar PgBouncer (produção)
- [ ] Adicionar health check de conexões

---

## Priorização

| Prioridade | Ação | Responsável |
|------------|------|-------------|
| 🔴 P0 | Corrigir Prisma connection pool | Backend |
| 🟠 P1 | Implementar retry com backoff | Frontend |
| 🟡 P2 | Corrigir depreciação image-picker | Frontend |
| 🟢 P3 | Ajustar BGGeolocation config | Frontend |

---

## Próximos Passos

1. **Imediato**: Notificar equipe de backend sobre o erro de Prisma
2. **Frontend**: Implementar retry nas mutations críticas
3. **Frontend**: Aplicar correções de depreciação
4. **Monitoramento**: Adicionar logs estruturados para detectar recorrência
