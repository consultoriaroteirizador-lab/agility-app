// Contrato da API de abastecimento do motorista (agility-services #906, spec 4A §5.1).

export type FuelType = 'DIESEL' | 'GASOLINE' | 'ETHANOL';
export type FuelPayer = 'COMPANY' | 'DRIVER';

/** GET /fuel-entries/me/context */
export interface FuelEntryContext {
    vehicleId: string;
    plate: string;
    /** Nulo para veículo flex ou sem combustível cadastrado: o motorista escolhe. */
    defaultFuelType: FuelType | null;
    lastOdometerKm: number | null;
    rechargeOnly: boolean;
}

/** Subconjunto do FuelEntryView que o app lê. */
export interface FuelEntry {
    id: string;
    vehiclePlate: string | null;
    filledAt: string;
    fuelType: FuelType;
    liters: number;
    totalValue: number;
    odometerKm: number | null;
    previousOdometerKm: number | null;
    odometerInconsistent: boolean;
    paidBy: FuelPayer;
    status: 'ACTIVE' | 'VOIDED';
    voidReason: string | null;
}

/** A foto como o ImagePicker devolve (só o que o app usa). */
export interface ReceiptPhoto {
    uri: string;
    width: number;
    height: number;
}
