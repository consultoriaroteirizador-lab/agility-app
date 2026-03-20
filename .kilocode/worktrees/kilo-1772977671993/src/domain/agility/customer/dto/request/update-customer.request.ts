/**
 * DTO for updating a customer
 * Maps to UpdateCustomerDto from backend
 * All fields are optional for PATCH operations
 */
export interface UpdateCustomerRequest {
    /** First name - optional */
    firstName?: string

    /** Last name - optional */
    lastName?: string

    /** Phone number - optional */
    phone?: string

    /** Document number (CPF/CNPJ) - optional */
    documentNumber?: string

    /** Company name (if legal entity) - optional */
    companyName?: string

    /** Business segment - optional */
    segment?: string

    /** Custom fields - optional */
    customFields?: Record<string, any>
}

