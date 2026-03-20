# Fluxo de Navegação - Rotas Detalhadas

## Visão Geral

Este documento mapeia o fluxo de navegação completo das telas em `rotas-detalhadas`, identificando todos os pontos de navegação e problemas encontrados.

---

## Diagrama de Fluxo ASCII

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ENTRADA PRINCIPAL                                   │
│                         rotas (lista) → [id]/index.tsx                           │
│                           Tela: Detalhes da Rota                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ router.push - Clique em parada
                                        │ Params: { id: rotaId, pid: serviceId }
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    [id]/parada/[pid]/index.tsx                                   │
│                    Tela: Detalhes da Parada                                      │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐    │
│   │                    REDIRECIONAMENTOS AUTOMÁTICOS                         │    │
│   │                                                                          │    │
│   │  serviceType === DELIVERY ──► [id]/parada/[pid]/entrega                  │    │
│   │                                                                          │    │
│   │  status === IN_PROGRESS ────► [id]/parada/[pid]/dados-servico            │    │
│   │                                                                          │    │
│   └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            │                           │                           │
            │                           │                           │
            ▼                           ▼                           ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│  dados-servico/       │  │  entrega/             │  │  nao-realizado/       │
│  index.tsx            │  │  index.tsx            │  │  index.tsx            │
│  Tela: Dados Serviço  │  │  Tela: Entrega        │  │  Tela: Tentativa      │
│                       │  │  (usa ParadaContext)  │  │                        │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
            │                           │                           │
            │                           │                           │
            │                           │                           ▼
            │                           │             ┌───────────────────────────┐
            │                           │             │  ❌ ERRO: falha/          │
            │                           │             │  Rota NÃO EXISTE          │
            │                           │             │  Deveria ser: insucesso/  │
            │                           │             └───────────────────────────┘
            │                           │
            │                           ▼
            │             ┌───────────────────────────┐
            │             │  dados-entrega/           │
            │             │  index.tsx                │
            │             │  Tela: Dados Entrega      │
            │             │  (fluxo 5 etapas)         │
            │             └───────────────────────────┘
            │                           │
            │                           │ "Não entreguei"
            │                           ▼
            │             ┌───────────────────────────┐
            │             │  ❌ ERRO: tentativa-entrega│
            │             │  Rota NÃO EXISTE          │
            │             │  Deveria ser: nao-realizado│
            │             └───────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          insucesso/index.tsx                                     │
│                          Tela: Registrar Insucesso                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Arquivos

```
src/app/(auth)/(tabs)/rotas-detalhadas/
├── _layout.tsx                              # Layout Stack (INCOMPLETO)
├── [id]/
│   ├── index.tsx                            # Tela: Detalhes da Rota
│   └── parada/
│       └── [pid]/
│           ├── index.tsx                    # Tela: Detalhes da Parada
│           ├── _components/                 # Componentes auxiliares
│           ├── _context/
│           │   └── ParadaContext.tsx        # Context para estado da entrega
│           ├── _hooks/
│           │   ├── useParadaNavigation.ts   # Hook de navegação
│           │   └── ...
│           ├── entrega/
│           │   └── index.tsx                # Tela: Entrega (orquestrador)
│           ├── dados-entrega/
│           │   └── index.tsx                # Tela: Dados da Entrega
│           ├── dados-servico/
│           │   └── index.tsx                # Tela: Dados do Serviço
│           ├── insucesso/
│           │   └── index.tsx                # Tela: Registrar Insucesso
│           └── nao-realizado/
│               └── index.tsx                # Tela: Tentativa de Entrega
```

---

## Tabela Detalhada de Navegação

### Tela: Detalhes da Rota (`[id]/index.tsx`)

| Linha   | Tipo            | Destino             | Condição                       | Parâmetros                       |
| ------- | --------------- | ------------------- | ------------------------------ | -------------------------------- |
| 100     | `router.back()` | Tela anterior       | Após concluir rota com sucesso | -                                |
| 184     | `router.back()` | Tela anterior       | Clique no botão voltar (←)     | -                                |
| 256-259 | `router.push()` | `[id]/parada/[pid]` | Clique na próxima parada       | `{ id: rotaId, pid: serviceId }` |
| 306-309 | `router.push()` | `[id]/parada/[pid]` | Clique em outras paradas       | `{ id: rotaId, pid: serviceId }` |

---

### Tela: Detalhes da Parada (`[id]/parada/[pid]/index.tsx`)

| Linha   | Tipo               | Destino                           | Condição                                       | Parâmetros                        |
| ------- | ------------------ | --------------------------------- | ---------------------------------------------- | --------------------------------- |
| 98-101  | `router.replace()` | `[id]/parada/[pid]/entrega`       | `serviceType === DELIVERY`                     | `{ id: routeId, pid: serviceId }` |
| 106-109 | `router.replace()` | `[id]/parada/[pid]/dados-servico` | `status === IN_PROGRESS` ou `startDate` existe | `{ id: routeId, pid: serviceId }` |
| 128-131 | `router.push()`    | `[id]/parada/[pid]/dados-servico` | Botão "Serviço concluído"                      | `{ id: routeId, pid: serviceId }` |
| 136-139 | `router.push()`    | `[id]/parada/[pid]/nao-realizado` | Botão "Serviço não concluído"                  | `{ id: routeId, pid: serviceId }` |
| 217     | `router.back()`    | Tela anterior                     | Parâmetros não encontrados                     | -                                 |
| 237     | `router.back()`    | Tela anterior                     | Erro ao carregar parada                        | -                                 |
| 282     | `router.push()`    | `/(auth)/(tabs)/menu/chat`        | Clique no botão de chat                        | -                                 |

---

### Tela: Entrega (`[id]/parada/[pid]/entrega/index.tsx`)

| Linha | Tipo            | Destino                                     | Condição                            | Parâmetros |
| ----- | --------------- | ------------------------------------------- | ----------------------------------- | ---------- |
| 34    | `router.push()` | `/(auth)/(tabs)/rotas-detalhadas/${rotaId}` | Após sucesso (`showSuccess = true`) | -          |

**Nota:** Esta tela usa `ParadaContext` para gerenciar estado e orquestra 5 etapas através de componentes:

- `EtapaInicial` → `EtapaConfirmacao` → `EtapaRecebedor` → `EtapaDados` → `EtapaFinalizacao`

---

### Tela: Dados Entrega (`[id]/parada/[pid]/dados-entrega/index.tsx`)

| Linha   | Tipo            | Destino                                     | Condição                                   | Parâmetros                       |
| ------- | --------------- | ------------------------------------------- | ------------------------------------------ | -------------------------------- |
| 86      | `router.push()` | `/(auth)/(tabs)/rotas-detalhadas/${rotaId}` | Após sucesso no completeServiceWithDetails | -                                |
| 472     | `router.push()` | `/(auth)/(tabs)/rotas-detalhadas/${rotaId}` | Botão "Indo pra lá"                        | -                                |
| 665-668 | `router.push()` | **❌ ERRO: `tentativa-entrega`**            | Botão "Não entreguei"                      | `{ id: rotaId, pid: serviceId }` |

---

### Tela: Dados Serviço (`[id]/parada/[pid]/dados-servico/index.tsx`)

| Linha | Tipo            | Destino                                     | Condição                                   | Parâmetros |
| ----- | --------------- | ------------------------------------------- | ------------------------------------------ | ---------- |
| 63    | `router.push()` | `/(auth)/(tabs)/rotas-detalhadas/${rotaId}` | Após sucesso no completeServiceWithDetails | -          |
| 308   | `router.back()` | Tela anterior                               | Botão voltar na etapa 1                    | -          |

---

### Tela: Insucesso (`[id]/parada/[pid]/insucesso/index.tsx`)

| Linha | Tipo            | Destino                                     | Condição                    | Parâmetros |
| ----- | --------------- | ------------------------------------------- | --------------------------- | ---------- |
| 50    | `router.push()` | `/(auth)/(tabs)/rotas-detalhadas/${rotaId}` | Após sucesso no failService | -          |
| 171   | `router.back()` | Tela anterior                               | Botão voltar (←)            | -          |

---

### Tela: Não Realizado (`[id]/parada/[pid]/nao-realizado/index.tsx`)

| Linha   | Tipo            | Destino                       | Condição                          | Parâmetros                       |
| ------- | --------------- | ----------------------------- | --------------------------------- | -------------------------------- |
| 43      | `router.push()` | `/(auth)/(tabs)/menu/suporte` | Enviar mensagem torre de controle | -                                |
| 73      | `router.push()` | `/(auth)/(tabs)/menu/suporte` | Enviar mensagem destinatário      | -                                |
| 111-114 | `router.push()` | **❌ ERRO: `falha`**          | Botão "Tentei de tudo"            | `{ id: rotaId, pid: serviceId }` |
| 130     | `router.back()` | Tela anterior                 | Botão voltar (←)                  | -                                |

---

### Hook: useParadaNavigation (`_hooks/useParadaNavigation.ts`)

| Função                   | Linha | Tipo            | Destino                                     |
| ------------------------ | ----- | --------------- | ------------------------------------------- |
| `goToRota()`             | 19    | `router.push()` | `/(auth)/(tabs)/rotas-detalhadas/${rotaId}` |
| `goBack()`               | 24    | `router.back()` | Tela anterior                               |
| `goToTentativaEntrega()` | 29-32 | `router.push()` | `[id]/parada/[pid]/nao-realizado`           |

---

## Problemas Identificados

### 🔴 CRÍTICO: Rotas Inexistentes

| #   | Arquivo                   | Linha   | Rota Incorreta                                          | Rota Correta                                        |
| --- | ------------------------- | ------- | ------------------------------------------------------- | --------------------------------------------------- |
| 1   | `dados-entrega/index.tsx` | 665-668 | `/rotas-detalhadas/[id]/parada/[pid]/tentativa-entrega` | `/rotas-detalhadas/[id]/parada/[pid]/nao-realizado` |
| 2   | `nao-realizado/index.tsx` | 111-114 | `/rotas-detalhadas/[id]/parada/[pid]/falha`             | `/rotas-detalhadas/[id]/parada/[pid]/insucesso`     |

### 🟡 MÉDIO: Layout Incompleto

O arquivo `_layout.tsx` registra apenas 3 telas no Stack:

```tsx
// ATUAL (INCOMPLETO)
<Stack.Screen name="[id]/index" />
<Stack.Screen name="[id]/parada/[pid]/index" />
<Stack.Screen name="[id]/parada/[pid]/dados-servico" />
```

**Telas Faltando:**

- `[id]/parada/[pid]/entrega`
- `[id]/parada/[pid]/dados-entrega`
- `[id]/parada/[pid]/insucesso`
- `[id]/parada/[pid]/nao-realizado`

---

## Fluxo Correto Esperado

```
[id]/index (Detalhes Rota)
    │
    ▼
[id]/parada/[pid]/index (Detalhes Parada)
    │
    ├── Se DELIVERY ──► [id]/parada/[pid]/entrega
    │                        │
    │                        ├── Sucesso ──► [id]/index
    │                        └── Não entreguei ──► [id]/parada/[pid]/nao-realizado
    │
    ├── Se IN_PROGRESS ──► [id]/parada/[pid]/dados-servico
    │                              │
    │                              └── Sucesso ──► [id]/index
    │
    ├── Serviço concluído ──► [id]/parada/[pid]/dados-servico
    │
    └── Serviço não concluído ──► [id]/parada/[pid]/nao-realizado
                                        │
                                        ├── Mensagem torre/destinatário ──► /menu/suporte
                                        └── Tentei de tudo ──► [id]/parada/[pid]/insucesso
                                                                    │
                                                                    └── Sucesso ──► [id]/index
```

---

## Recomendações

1. **Corrigir rotas inexistentes:**
   - Em `dados-entrega/index.tsx` linha 665-668: trocar `tentativa-entrega` por `nao-realizado`
   - Em `nao-realizado/index.tsx` linha 111-114: trocar `falha` por `insucesso`

2. **Completar o \_layout.tsx:**

   ```tsx
   export default function RotasDetalhadasLayout() {
     return (
       <Stack screenOptions={{headerShown: false}}>
         <Stack.Screen name="[id]/index" />
         <Stack.Screen name="[id]/parada/[pid]/index" />
         <Stack.Screen name="[id]/parada/[pid]/entrega" />
         <Stack.Screen name="[id]/parada/[pid]/dados-entrega" />
         <Stack.Screen name="[id]/parada/[pid]/dados-servico" />
         <Stack.Screen name="[id]/parada/[pid]/insucesso" />
         <Stack.Screen name="[id]/parada/[pid]/nao-realizado" />
       </Stack>
     );
   }
   ```

3. **Consolidar telas duplicadas:**
   - `dados-entrega/index.tsx` e `entrega/index.tsx` parecem ter funcionalidades sobrepostas
   - Considerar usar apenas uma abordagem (com ou sem ParadaContext)
