/**
 * Route response (partial structure)
 */
export interface RouteResponse {
    id: string
    [key: string]: any
}

/**
 * Vehicle response DTO
 * Maps to VehicleEntity.toJson() from backend
 */
export interface VehicleResponse {
    /** Vehicle unique identifier */
    id: string

    /** Vehicle license plate */
    plate: string

    /** Vehicle model */
    model: string

    /** Vehicle manufacturer */
    manufacturer: string

    /** Manufacturing year */
    year: number

    /** Vehicle type */
    type: string

    /** Fuel type */
    fuelType: string | null

    /** Tank capacity in liters */
    tankCapacity: number | null

    /** Average consumption km/l */
    avgConsumption: number | null

    /** Vehicle length in meters */
    length: number | null

    /** Vehicle width in meters */
    width: number | null

    /** Vehicle height in meters */
    height: number | null

    /** Maximum weight capacity in kg */
    maxWeight: number | null

    /** Empty weight in kg */
    emptyWeight: number | null

    /** Cargo volume in cubic meters */
    cargoVolume: number | null

    /** Minimum number of seats */
    minSeats: number | null

    /** ORS vehicle profile */
    orsProfile: string | null

    /** Vehicle capacity weight (ORS) */
    capacityWeight: number | null

    /** Vehicle capacity volume (ORS) */
    capacityVolume: number | null

    /** Vehicle capacity items (ORS) */
    capacityItems: number | null

    /** Fixed cost (ORS) */
    costFixed: number | null

    /** Cost per km (ORS) */
    costPerKm: number | null

    /** Initial mileage in km */
    mileageStart: number | null

    /** Current mileage in km */
    mileageCurrent: number | null

    /** Total mileage */
    totalMileage: number | null

    /** Registration date */
    registrationDate: Date | string | null

    /** Maintenance status */
    maintenanceStatus: string | null

    /** Whether tracker is installed */
    trackerInstalled: boolean | null

    /** Insurance policy number */
    insurancePolicy: string | null

    /** Additional notes */
    notes: string | null

    /** Calculated range */
    range: number | null

    /** Available cargo weight */
    availableCargoWeight: number | null

    /** Routes associated with this vehicle */
    routes: RouteResponse[]

    /** Creation timestamp */
    createdAt: Date | string

    /** Last update timestamp */
    updatedAt: Date | string
}



