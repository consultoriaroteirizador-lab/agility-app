import type { AddressResponse } from './address.response';

/**
 * Paginated address response
 * Maps to PaginatedResponseDto<AddressResponse> from backend
 */
export interface PaginatedAddressResponse {
    items: AddressResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
