/**
 * Query parameters for listing addresses
 */
export interface ListAddressesRequest {
    /** Filter by postal code (CEP) - optional */
    postalCode?: string;

    /** Pagination - page number */
    page?: number;

    /** Pagination - items per page */
    limit?: number;
}
