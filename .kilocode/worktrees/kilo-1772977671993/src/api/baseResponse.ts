export type BaseResponse<T> = {
    success: boolean;
    message?: string;
    result?: T;
    error?: ErrorResponse
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