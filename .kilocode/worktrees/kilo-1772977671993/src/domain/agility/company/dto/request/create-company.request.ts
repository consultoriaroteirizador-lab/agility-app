import type {
    RoutingProfile,
    BusinessSegment,
    OptimizationMethod,
    Owner,
} from '../types'

/**
 * DTO for creating a new company
 * Maps to CreateCompanyDto from backend
 */
export interface CreateCompanyRequest {
    /** Company name (min 3 characters) - required */
    name: string

    /** Main contact name - required */
    contactName: string

    /** Main contact email - required */
    contactEmail: string

    /** Main contact phone - required */
    contactPhone: string

    /** Company document number (CNPJ) - required */
    documentNumber: string

    /** Subscription plan - optional */
    subscriptionPlan?: string

    /** Email domain - optional */
    domain?: string

    /** Owner data (admin user). If not provided, uses contact data - optional */
    owner?: Owner

    /** If true, sends email for owner to set password. If false, doesn't create owner user - optional, default true */
    createOwnerUser?: boolean

    /** Business segment - optional */
    businessSegment?: BusinessSegment

    /** Enabled routing profiles - optional */
    routingProfiles?: RoutingProfile[]

    /** Default optimization method - optional */
    defaultOptimization?: OptimizationMethod

    /** Enabled features (e.g., { "ors": true, "broadcast": true }) - optional */
    featuresEnabled?: Record<string, boolean>

    /** OpenRouteService API Key (company's own) - optional */
    orsApiKey?: string

    /** Maximum drivers limit - optional */
    maxDrivers?: number

    /** Maximum vehicles limit - optional */
    maxVehicles?: number

    /** Maximum routings per day limit - optional */
    maxRoutingsPerDay?: number

    /** Maximum services per routing limit - optional */
    maxServicesPerRouting?: number
}

