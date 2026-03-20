# Anlise e Corrigão: Tenant ID no WebSocket do Chat

## Proble

O erro ocorre no backend:

```
Error: Company ID is required in tenant context
```

Isso indica que o tenant ID (company id) não está sendo passado corretamente no WebSocket do chat no O backend espera esse informações para estabe a conex e atualizar do status online do usuário.

## Causa Raiz

O código atual em [`useChatWebSocket.ts`](src/domain/agility/chat/useCase/useChatWebSocket.ts) o `tenantId` é extraído apenas do token JWT:

mas **não do token JWT** O `tenantId` está disponível. O backend espera receber o `tenantId` no header `x-tenant-id`.

### Análise

código atual em [`useChatWebSocket.ts`](src/domain/agility/chat/useCase/useChatWebSocket.ts):

```typescript
// Extrai userId do token JWT ou usa userAuth.id
let userId: string | null = userAuth?.id || null;
let tenantId: string | null = null;

try {
  const payload = jwtDecode<any>(authCredentials.accessToken);
  userId = payload.sub || payload.userId || userAuth?.id || null;
  tenantId = payload.tenantId || payload.tenant_id || null;
} catch (error) {
  console.error('[useChatWebSocket] Failed to decode token:', error);
  if (!userId && userAuth?.id) {
    userId = userAuth.id;
  }
}
```

No código atual, `tenantId` do `authCredentials` (que é a fonte principal), não do token JWT). Isso é que, log:

`[useChatWebSocket] Using authCredentials.tenantId directly');
console.log('[useChatWebSocket] Using tenantId from authCredentials:', authCredentials?.tenantId);
});

            // Adiciona tenantId se disponível
            if (tenantId) {
                socketConfig.auth.tenantId = tenantId;
                socketConfig.query = { userId, userType, tenantId };
            } else {
                socketConfig.query = { userId, userType };
            }
        }

        const socket = io(`${wsUrl}/chat`, socketConfig);
        // ... rest of the code

```

O problema é que o `tenantId` é extraído do token JWT, o `tenantId` do `authCredentials`. (que está disponível no `authCredentials`).

A solução é modificar o trechos de código para:

 seguinte:

1. Primeiro, tente usar `authCredentials.tenantId` diret ( pois do token JWT)
2. Adicionar log para depuração
 caso o tenant ID não não este extraído
 JWT.
3. Garant que o log seja mais claro.

V. Atualização do todo list:Vamos verificar se os outros WebSockets também precisam da mesma correação:Vou criar o plano detalhado: markdown: write_to_file e path: plans/correcao-tenant-id-chat-websocket.md, content: string, `# anlise e corrigão: Tenant id no WebSocket do chat

## Proble

 erro ocorre no backend:
```

error: Company ID is required in tenant context

````

Isso indica que o tenant id (company id) não está sendo passado corretamente no WebSocket do chat no o backend espera essas informações para estabe a conex e atualizar o status online do usuário.

## Causa raiz



O código atual em [`useChatWebSocket.ts`](src/domain/agility/chat/useCase/useChatWebSocket.ts` o `tenantId` é extraído apenas do token JWT:

 mas **não do token JWT** o `tenantId` está disponível. O backend espera receber o `tenantId` no header `x-tenant-id`.

```typescript
// extrai userId do token JWT ou usa userAuth.id
let userId: string | null = userAuth?.id || null;
let tenantId: string | null = null;

    try {
        const payload = jwtDecode<any>(authCredentials.accessToken);
        userId = payload.sub || payload.userId || userAuth?.id || null;
        tenantId = payload.tenantId || payload.tenant_id || null;
    } catch (error) {
        console.error('[useChatWebSocket] Failed to decode token:', error);
        if (!userId && userAuth?.id) {
            userId = userAuth.id;
        }
    }

    // PROblema: se o tenantId não estiver no token JWT, ele `authCredentials.tenantId` não está disponível
 conexão falha.
    console.warn('[useChatWebSocket] Missing tenantId, cannot connect');
    connectingRef.current = false;
    return;
}

 }

        // CORreção: usar authCredentials.tenantId directly as fonte principal
        const tenantId = authCredentials?.tenantId || null;

        if (!tenantId) {
            console.warn('[useChatWebSocket] Missing tenantId, cannot connect');
            connectingRef.current = false;
            return;
        }
        // ... rest of the code remains the same
````

A solução é modificar o trechos de código para:

seguinte:

1. Primeiro, tente usar `authCredentials.tenantId` directly (instead of extracting from JWT)
2. Add log for debugging when tenant ID is not available
3. Ensure tenant ID is always passed in both `auth` and `query` objects of the socket configuration

4. Garant that the log is consistent with other WebSocket implementations

5. Atualizar the other Websockets to use the same approach.

V. Atualizar the todo list:vamos criar o plano detalhado em markdown: vou atualizar a todo list e o progresso e acompan o usuário na aprova do plano. Vou então solicitar a troagem para o modo "Code" para implementação. as alterações precisam ser feitas cirúrgicas..

A código em arquivos que que são simples localizadas e fá corre o código. mais eficiente..
