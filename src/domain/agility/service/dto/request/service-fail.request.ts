/**
 * Enum for service failure reasons
 */
export enum FailureReason {
    RECIPIENT_ABSENT = 'RECIPIENT_ABSENT',       // Destinatário ausente
    WRONG_ADDRESS = 'WRONG_ADDRESS',             // Endereço incorreto/não encontrado
    ACCESS_DENIED = 'ACCESS_DENIED',             // Acesso negado (condomínio, portaria, etc)
    RECIPIENT_REFUSED = 'RECIPIENT_REFUSED',     // Destinatário recusou receber
    VEHICLE_ISSUE = 'VEHICLE_ISSUE',             // Problema com veículo
    WEATHER_CONDITIONS = 'WEATHER_CONDITIONS',   // Condições climáticas adversas
    TIME_EXCEEDED = 'TIME_EXCEEDED',             // Tempo de espera excedido
    OTHER = 'OTHER',                             // Outro motivo
}

/**
 * DTO for reporting a service failure (e.g., recipient absent, wrong address, etc.)
 */
export interface ServiceFailRequest {
    /** Reason for the failure */
    reason: FailureReason

    /** Additional notes about the failure - optional */
    notes?: string

    /** Photo proof of the attempt (URLs from POST /services/upload-photos) - optional, max 10 photos */
    photoProof?: string[]
}
