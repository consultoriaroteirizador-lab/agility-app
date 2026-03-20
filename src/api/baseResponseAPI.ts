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
}

export type ValidationErrorsResponseAPI = {
    message: string;
    field: string
}