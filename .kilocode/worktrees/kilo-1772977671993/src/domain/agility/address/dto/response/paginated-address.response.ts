import type { PaginatedResponse } from '@/types/base';

import type { AddressResponse } from './address.response';

/**
 * Paginated address response
 * Maps to PaginatedResponseDto<AddressResponse> from backend
 */
export type PaginatedAddressResponse = PaginatedResponse<AddressResponse>;

