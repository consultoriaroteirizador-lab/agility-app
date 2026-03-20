import { PageResponse, PageResponseAPI } from "./apiTypes";

function toPageResponse<T>(response: PageResponseAPI<T>): PageResponse<T> {
    return {
        items: response.items,
        currentPage: response.currentPage,
        totalItems: response.totalItems,
        totalPages: response.totalPages,
        pageSize: response.pageSize,
        elementPerPage: response.elementPerPage,
        first: response.first,
        last: response.last
    };
}

export const pageAdapter = {
    toPageResponse
}