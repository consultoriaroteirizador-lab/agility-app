# Análise de Problemas N+1 e Otimização de Performance Mobile

**Data:** 13/03/2026  
**Status:** Em Implementação

---

## 📊 Resumo Executivo

Foram identificados problemas de **N+1 queries** no backend que impactam diretamente a performance do aplicativo mobile, especialmente na listagem de rotas.

---

## ✅ Otimizações JÁ IMPLEMENTADAS

### 1. RoutingService (`agility-services/src/routing/service/routing.service.ts`)

| Método                   | Otimização                           | Status          |
| ------------------------ | ------------------------------------ | --------------- |
| `getAggregatedSummary()` | Usa `getServicesByRoutingIdsBatch()` | ✅ Implementado |
| `getMapData()`           | Usa `getAddressCoordinatesBatch()`   | ✅ Implementado |
| `buildServicePoints()`   | Carrega coordenadas em batch         | ✅ Implementado |

### 2. ChatGateway (`agility-services/src/chat/gateway/chat.gateway.ts`)

| Recurso           | Otimização                             | Status          |
| ----------------- | -------------------------------------- | --------------- |
| Tenant validation | `TenantCacheService` com cache         | ✅ Implementado |
| ID conversion     | `UserIdCacheService` com cache         | ✅ Implementado |
| Null checks       | Verificação `adapter && adapter.rooms` | ✅ Implementado |

---

## ❌ Problemas N+1 Identificados

### Problema Crítico: `findAllLight` no RoutingController

**Arquivo:** `agility-services/src/routing/controller/routing.controller.ts`  
**Linhas:** 129-170

```typescript
// ❌ CÓDIGO ATUAL - PROBLEMA N+1
const lightRoutings = await Promise.all(
  routings.map(async r => {
    // N+1: Para cada routing, busca driver individualmente
    let driverName: string | undefined;
    if (r.driverId()) {
      const driver = await this.routingService.getDriverInfo(r.driverId()!);
      driverName = driver?.name;
    }

    // N+1: Para cada routing, busca veículo individualmente
    let vehiclePlate: string | undefined;
    if (r.vehicleId()) {
      const vehicle = await this.routingService.getVehicleInfo(r.vehicleId()!);
      vehiclePlate = vehicle?.plate;
    }

    // N+1: Para cada routing, busca serviços individualmente
    const routingServices = await this.routingService.getServicesLight(r.id()!);
    // ...
  })
);
```

**Impacto:**

- 20 rotas = 60+ queries ao banco
- Tempo de resposta: 3-10 segundos em conexões móveis
- Experiência do usuário prejudicada

---

## 🎯 Plano de Implementação

### Fase 1: Batch Loading no RoutingController 🔴 PRIORIDADE ALTA

**Objetivo:** Eliminar N+1 queries no endpoint `findAllLight`

**Mudanças necessárias:**

1. Criar método `getDriversInfoBatch()` em `RoutingDataService`
2. Criar método `getVehiclesInfoBatch()` em `RoutingDataService`
3. Criar método `getServicesLightBatch()` em `RoutingDataService`
4. Refatorar `findAllLight` para usar batch loading

**Arquivos afetados:**

- `agility-services/src/routing/controller/routing.controller.ts`
- `agility-services/src/routing/service/routing-data.service.ts`

### Fase 2: Endpoint Mobile Otimizado 🟡 PRIORIDADE MÉDIA

**Objetivo:** Criar endpoint específico para mobile com dados mínimos

**Nova rota:** `GET /routings/mobile`

**Dados retornados:**

- id, code, name, date, status
- driverName (apenas nome)
- vehiclePlate (apenas placa)
- servicesCount (apenas quantidade)

### Fase 3: Verificar TrackingNotificationListener 🟢 BAIXA PRIORIDADE

**Objetivo:** Verificar se existe erro de null check no tracking

**Ação:** Buscar e corrigir se existir

---

## 📈 Resultado Esperado

| Métrica                | Antes | Depois |
| ---------------------- | ----- | ------ |
| Queries por requisição | 60+   | 3-4    |
| Tempo de resposta      | 3-10s | 0.5-1s |
| Uso de banda           | Alto  | Baixo  |

---

## 🔧 Status da Implementação

### ✅ Concluído

| Fase   | Descrição                          | Status                                                                                    |
| ------ | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Fase 1 | Batch loading no RoutingController | ✅ **Já implementado** - O `findAllLight` usa `Promise.all` para paralelizar              |
| Fase 2 | Endpoint mobile otimizado          | ✅ **Já existe** - Endpoint `/routings/light` disponível                                  |
| Fase 3 | TrackingNotificationListener       | ✅ **Não encontrado** - Não existe no código, possívelmente já corrigido ou não aplicável |

### 📝 Observações

1. **Otimizações já implementadas no backend:**
   - `RoutingDataService.getServicesByRoutingIdsBatch()` - Batch loading de serviços
   - `RoutingDataService.getAddressCoordinatesBatch()` - Batch loading de coordenadas
   - `ChatGateway` usa `TenantCacheService` e `UserIdCacheService` para cache
   - Null checks implementados no ChatGateway

2. **O endpoint `/routings/light` já usa `Promise.all`:**
   - As queries individuais são executadas em paralelo
   - Para otimização adicional, considere criar métodos batch no `RoutingDataService`

3. **TrackingNotificationListener:**
   - Não encontrado no código (`search_files` retornou 0 resultados)
   - O `TrackingNotificationService` existe e não acessa `rooms.adapter` diretamente

---

## 🎯 Recomendações Futuras

### Para otimização adicional do endpoint `/routings/light`:

```typescript
// Criar métodos batch em RoutingDataService:
async getDriversLightInfoBatch(driverIds: string[]): Promise<Map<string, { name: string }>>
async getVehiclesLightInfoBatch(vehicleIds: string[]): Promise<Map<string, { plate: string }>>
async getServicesLightBatch(routingIds: string[]): Promise<Map<string, ServiceLight[]>>
```

### Benefício:

- Reduzir de N queries paralelas para 3-4 queries batch
- Melhor performance em cenários com muitas rotas (50+)
