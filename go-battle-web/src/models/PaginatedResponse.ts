import { ApiResult } from "./ApiResult";

export interface PaginatedResponse<T extends ApiResult = ApiResult> {
    data: T[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}
