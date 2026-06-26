/**
 * Address response DTO
 * Maps to AddressEntity.toJson() from backend
 */
export interface AddressResponse {
    /** Address unique identifier */
    id: string;

    /** Street name */
    street: string;

    /** Street number */
    number: string;

    /** Address complement */
    complement: string | null;

    /** District (Distrito) */
    district: string | null;

    /** Neighborhood (Bairro) */
    neighborhood: string | null;

    /** City name */
    city: string;

    /** State code (2 uppercase letters) */
    state: string;

    /** Postal code (CEP) */
    postalCode: string;

    /** Country code */
    country: string | null;

    /** Latitude coordinate */
    latitude: number;

    /** Longitude coordinate */
    longitude: number;

    /** Formatted full address string */
    formattedAddress: string;

    /** Creation timestamp */
    createdAt: Date | string;

    /** Last update timestamp */
    updatedAt: Date | string;
}


export function formatAddress(address: AddressResponse | null | undefined): string {
    if (!address) {
        return 'Endereço não informado';
    }

    if (address.formattedAddress) {
        return address.formattedAddress;
    }


    const streetAndNumber = [address.street, address.number]
        .filter(Boolean)
        .join(', ');

    const neighborhoodLine = [address.neighborhood, address.complement]
        .filter(Boolean)
        .join(' - ');

    const cityState = [address.city, address.state]
        .filter(Boolean)
        .join(' - ');

    const parts = [
        streetAndNumber,
        neighborhoodLine,
        cityState
    ];

    return parts
        .filter(Boolean)
        .join('. ')
        .trim();
}

/**
 * Formata o endereço completo SEMPRE a partir dos campos individuais — incluindo
 * o bairro — em vez de confiar no `formattedAddress` do backend (que pode vir sem
 * o bairro). Campos ausentes são omitidos.
 *
 * @example
 * // { street: 'Rua das Flores', number: '123', complement: 'Apto 4',
 * //   neighborhood: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01234-567' }
 * formatAddressFull(address);
 * // "Rua das Flores, 123 - Apto 4 - Centro - São Paulo/SP - CEP 01234-567"
 */
export function formatAddressFull(address: AddressResponse | null | undefined): string {
    if (!address) {
        return 'Endereço não informado';
    }

    const streetAndNumber = [address.street, address.number].filter(Boolean).join(', ');
    const cityState = [address.city, address.state].filter(Boolean).join('/');

    const parts = [
        streetAndNumber,
        address.complement,
        address.neighborhood,
        cityState,
        address.postalCode ? `CEP ${address.postalCode}` : '',
    ].filter(Boolean);

    return parts.join(' - ').trim() || 'Endereço não informado';
}

/**
 * Formata a primeira linha do endereço: Rua, Número
 * @param address - Objeto de endereço
 * @returns String formatada "Rua, Número" ou string vazia se não houver dados
 * 
 * @example
 * const address = { street: 'Rua das Flores', number: '123', ... };
 * formatAddressStreetNumber(address); // Returns: "Rua das Flores, 123"
 */
export function formatAddressStreetNumber(address: AddressResponse | null | undefined): string {
    if (!address) {
        return '';
    }

    const parts = [address.street, address.number].filter(Boolean);

    if (parts.length === 0) {
        return '';
    }

    return parts.join(', ');
}

/**
 * Formata a segunda linha do endereço: Complemento - Bairro - Cidade
 * @param address - Objeto de endereço
 * @returns String formatada "Complemento - Bairro - Cidade" ou string vazia se não houver dados
 * 
 * @example
 * const address = { complement: 'Apto 101', neighborhood: 'Centro', city: 'São Paulo', ... };
 * formatAddressComplement(address); // Returns: "Apto 101 - Centro - São Paulo"
 */
export function formatAddressComplement(address: AddressResponse | null | undefined): string {
    if (!address) {
        return '';
    }

    // Ordem: Complemento, Bairro, Cidade
    const parts = [
        address.complement,
        address.neighborhood,
        address.city
    ].filter(Boolean);

    if (parts.length === 0) {
        return '';
    }

    return parts.join(' - ');
}