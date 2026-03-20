import type { PaginationQuery } from '@/types/base';

/**
 * Query parameters for listing addresses
 */
export interface ListAddressesRequest extends PaginationQuery {
    /** Filter by postal code (CEP) - optional */
    postalCode?: string;
}

