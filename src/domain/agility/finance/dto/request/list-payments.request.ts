export interface ListPaymentsRequest {
  driverId?: string;
  routingId?: string;
  serviceId?: string;
  customerId?: string;
  status?: string;
  startDate?: string; // ISO 8601 format
  endDate?: string;   // ISO 8601 format
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedPaymentsResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
