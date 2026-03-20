import { BaseResponse, ErrorResponse } from "./baseResponse";

export interface MutationOptions<TData> {
    onSuccess?: (data: TData) => void | Promise<void>;
    onError?: (error: BaseResponse<ErrorResponse>) => void;
    errorMessage?: string;
}


export interface PageResponseAPI<T> {
    items: T[];
    currentPage: number;
    totalItems: number;
    totalPages: number;
    pageSize: number;
    elementPerPage: number;
    first: boolean;
    last: boolean;
}


export interface PageResponse<T> {
    items: T[];
    currentPage: number;
    totalItems: number;
    totalPages: number;
    pageSize: number;
    elementPerPage: number;
    first: boolean;
    last: boolean;
}
