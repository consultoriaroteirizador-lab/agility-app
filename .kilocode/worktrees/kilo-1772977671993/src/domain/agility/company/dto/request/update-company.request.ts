/**
 * DTO for updating a company
 * Maps to UpdateCompanyDto from backend
 * All fields are optional for PATCH operations
 */
export interface UpdateCompanyRequest {
    /** Company name (min 3 characters) - optional */
    name?: string

    /** Main contact name - optional */
    contactName?: string

    /** Main contact email - optional */
    contactEmail?: string

    /** Main contact phone - optional */
    contactPhone?: string

    /** Subscription plan - optional */
    subscriptionPlan?: string
}

