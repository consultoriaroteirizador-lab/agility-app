import { apiAgility } from '@/api/apiConfig';
import type { PagedResponse } from '@/domain/hooks/pagination';

import type { FuelEntry, FuelEntryContext, ReceiptPhoto } from './dto/types';
import { buildFuelEntryFormData, type FuelEntryPayload } from './fuelEntryForm';
import { compressReceipt } from './receiptPhoto';

const BASE_URL = '/fuel-entries/me';

/** O ResponseInterceptor global envelopa tudo em { success, message, result, error }. */
function unwrap<T>(body: any): T {
    if (body && typeof body === 'object' && 'result' in body) return body.result as T;
    return body as T;
}

export const fuelEntryAPI = {
    async getContext(): Promise<FuelEntryContext> {
        const response = await apiAgility.get(`${BASE_URL}/context`);
        return unwrap<FuelEntryContext>(response.data);
    },

    /** Um request só: o back grava a foto apenas se o lançamento passar na validação. */
    async create(payload: FuelEntryPayload, photo: ReceiptPhoto): Promise<FuelEntry> {
        const uri = await compressReceipt(photo);
        const formData = buildFuelEntryFormData(payload, { uri, name: `nota_${Date.now()}.jpg`, type: 'image/jpeg' });
        const response = await apiAgility.post(BASE_URL, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return unwrap<FuelEntry>(response.data);
    },

    /** O back devolve { data, total }; o app pagina por { data, meta: { page, totalPages } }. */
    async listMine(page: number, limit: number): Promise<PagedResponse<FuelEntry>> {
        const response = await apiAgility.get(BASE_URL, { params: { page, limit } });
        const { data, total } = unwrap<{ data: FuelEntry[]; total: number }>(response.data);
        return { data, meta: { page, totalPages: Math.max(1, Math.ceil(total / limit)), limit, total } };
    },
};
