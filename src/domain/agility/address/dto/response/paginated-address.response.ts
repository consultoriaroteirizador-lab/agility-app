import type { PaginatedResult } from '@/api';

import type { AddressResponse } from './address.response';

/**
 * Paginated address response.
 * Maps to PaginatedResponseDto<AddressResponse> do back: { data, meta }.
 */
export type PaginatedAddressResponse = PaginatedResult<AddressResponse>;
