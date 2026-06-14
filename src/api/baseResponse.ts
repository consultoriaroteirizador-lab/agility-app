export type BaseResponse<T> = {
    success: boolean;
    message?: string;
    result?: T;
    error?: ErrorResponse
}

/**
 * Espelha o PaginatedResponseDto do back (agility-services): os endpoints paginados
 * retornam result = { data, meta }.
 */
export type PaginationMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
}

export type PaginatedResult<T> = {
    data: T[];
    meta: PaginationMeta;
}

export type ErrorResponse = {
    message?: string;
    code?: string;
    validationErrors?: ValidationErrorsResponse[]
}

export type ValidationErrorsResponse = {
    message: string;
    field: string
}