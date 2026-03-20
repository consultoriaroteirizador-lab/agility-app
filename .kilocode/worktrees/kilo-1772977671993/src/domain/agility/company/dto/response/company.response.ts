import type {
    RoutingProfile,
    BusinessSegment,
    OptimizationMethod,
    CompanyLimits,
} from '../types'

/**
 * Company response DTO
 * Maps to CompanyEntity.toJson() from backend
 */
export interface CompanyResponse {
    /** Company unique identifier */
    id: string

    /** Company name */
    name: string

    /** Company slug */
    slug: string

    /** Email domain */
    domain: string | null

    /** Main contact name */
    contactName: string

    /** Main contact email */
    contactEmail: string

    /** Main contact phone */
    contactPhone: string

    /** Company document number (CNPJ) */
    documentNumber: string

    /** Keycloak realm name */
    keycloakRealmName: string

    /** Keycloak client ID */
    keycloakClientId: string

    /** Keycloak web client ID */
    keycloakWebClientId: string | null

    /** Company status */
    status: string

    /** Subscription plan */
    subscriptionPlan: string | null

    /** Is active */
    isActive: boolean

    /** Is suspended */
    isSuspended: boolean

    /** Business segment */
    businessSegment: BusinessSegment | null

    /** Routing profiles */
    routingProfiles: RoutingProfile[]

    /** Default optimization method */
    defaultOptimization: OptimizationMethod | null

    /** Enabled features */
    featuresEnabled: Record<string, boolean> | null

    /** Has OpenRouteService access */
    hasOrsAccess: boolean

    /** Company limits */
    limits: CompanyLimits

    /** Creation timestamp */
    createdAt: Date | string

    /** Last update timestamp */
    updatedAt: Date | string
}

/**
 * Discovery response for tenant discovery by email
 */
export interface CompanyDiscoveryResponse {
    found: boolean
    tenantId?: string
    slug?: string
    realm?: string
    clientId?: string
    webClientId?: string
    appClientId?: string
    company?: CompanyResponse
}

