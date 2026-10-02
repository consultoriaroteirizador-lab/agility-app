export type BaseResponseAPI<T> = {
    success: boolean;
    message?: string;
    result?: T;
    error?: ErrorResponseAPI
}

export type ErrorResponseAPI = {
    message?: string;
    code?: string;
    validationErrors?: ValidationErrorsResponseAPI[]
    /** Campos extras que o back põe no corpo da exceção (ex.: `maxAmountCents` do saque). */
    [extra: string]: unknown
}

export type ValidationErrorsResponseAPI = {
    message: string;
    field: string
}