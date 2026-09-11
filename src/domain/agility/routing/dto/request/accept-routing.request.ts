/**
 * Request body for accepting a broadcasting routing
 */
export interface AcceptRoutingRequest {
    /** Driver current latitude (for distance validation) - optional, uses driver profile if not provided */
    driverLatitude?: number

    /** Driver current longitude (for distance validation) - optional, uses driver profile if not provided */
    driverLongitude?: number

    /**
     * Frete que o app mostrou ao motorista no momento do aceite, para o backend
     * conferir contra o valor atual da rota. Atrás de `ENVIA_VALOR_ESPERADO`
     * (`useAcceptRouting.ts`) — o backend atual usa `forbidNonWhitelisted` e
     * rejeitaria o campo com 400 antes do backend novo estar em produção.
     */
    expectedTotalValue?: number
}

