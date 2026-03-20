/**
 * Service material DTO
 */
export interface ServiceMaterialRequest {
    /** Serial number - optional */
    serialNumber?: string

    /** Material name - required */
    material: string

    /** Quantity - required */
    quantity: string
}



