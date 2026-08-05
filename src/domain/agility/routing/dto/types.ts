/**
 * Enums and types shared between request and response DTOs
 */

export enum RoutingStatus {
    DRAFT = 'DRAFT',
    OPTIMIZED = 'OPTIMIZED',
    PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',
    BROADCASTING = 'BROADCASTING',
    ASSIGNED = 'ASSIGNED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum OfferType {
    PROXIMITY = 'PROXIMITY',
    ALL = 'ALL',
}

/**
 * LEGADO. Só é gravado quando o chamador manda — nunca é derivado — e o backend
 * não lê este campo para decisão nenhuma. No banco de dev (04/08/2026), 262 de
 * 310 rotas estão com ele nulo, e o último registro data de 19/06.
 *
 * Para saber o que a rota é, use `RoutingProfile`. Mantido aqui apenas como
 * fallback de rotas antigas, do mesmo jeito que a plataforma do operador faz.
 */
export enum RoutingType {
    SERVICE = 'SERVICE', // Roteirização de serviços
    PRODUCT = 'PRODUCT', // Roteirização de produtos
}

/**
 * O que a rota é, de verdade. O fluxo de roteirização obriga a escolher o perfil
 * e o envia em todos os caminhos de criação — diferente de `RoutingType`, que
 * ficou pelo caminho.
 */
export enum RoutingProfile {
    LAST_MILE = 'LAST_MILE', // CD → clientes finais (entregas)
    FIELD_SERVICE = 'FIELD_SERVICE', // Múltiplos técnicos/atendimentos
    PICKUP_DELIVERY = 'PICKUP_DELIVERY', // Coleta → Entrega
}



