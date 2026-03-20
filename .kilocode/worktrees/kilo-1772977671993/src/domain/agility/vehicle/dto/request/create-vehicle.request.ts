/**
 * DTO for creating a new vehicle
 * Maps to CreateVehicleDto from backend
 */
export interface CreateVehicleRequest {
    /** Vehicle license plate - required */
    plate: string

    /** Vehicle model - required */
    model: string

    /** Vehicle manufacturer - required */
    manufacturer: string

    /** Manufacturing year - required, minimum 1900 */
    year: number

    /** Vehicle type - required */
    type: string

    /** Fuel type - optional */
    fuelType?: string

    /** Tank capacity in liters - optional, minimum 0 */
    tankCapacity?: number

    /** Average consumption km/l - optional, minimum 0 */
    avgConsumption?: number

    /** Vehicle length in meters - optional, minimum 0 */
    length?: number

    /** Vehicle width in meters - optional, minimum 0 */
    width?: number

    /** Vehicle height in meters - optional, minimum 0 */
    height?: number

    /** Maximum weight capacity in kg - optional, minimum 0 */
    maxWeight?: number

    /** Empty weight in kg - optional, minimum 0 */
    emptyWeight?: number

    /** Cargo volume in cubic meters - optional, minimum 0 */
    cargoVolume?: number

    /** Minimum number of seats - optional, minimum 0 */
    minSeats?: number

    /** ORS vehicle profile - optional */
    orsProfile?: string

    /** Vehicle capacity weight (ORS) - optional, minimum 0 */
    capacityWeight?: number

    /** Vehicle capacity volume (ORS) - optional, minimum 0 */
    capacityVolume?: number

    /** Vehicle capacity items (ORS) - optional, minimum 0 */
    capacityItems?: number

    /** Fixed cost (ORS) - optional, minimum 0 */
    costFixed?: number

    /** Cost per km (ORS) - optional, minimum 0 */
    costPerKm?: number

    /** Initial mileage in km - optional, minimum 0 */
    mileageStart?: number

    /** Registration date - optional */
    registrationDate?: string | Date

    /** Maintenance status - optional */
    maintenanceStatus?: string

    /** Whether tracker is installed - optional */
    trackerInstalled?: boolean

    /** Insurance policy number - optional */
    insurancePolicy?: string

    /** Additional notes - optional */
    notes?: string
}



