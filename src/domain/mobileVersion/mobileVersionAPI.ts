import { apiAgility, BaseResponseAPI } from '@/api';
import { API_KEY } from '@/config/environment';

import { CheckVersionRequest } from './dto/checkVersionRequest';
import { CheckVersionResponse } from './dto/checkVersionResponse';

async function checkVersion(request: CheckVersionRequest): Promise<BaseResponseAPI<CheckVersionResponse>> {
    // Rota pública: usa x-api-key e omite o Authorization SÓ nesta request via
    // `skipAuth` (tratado no interceptor). Nada de mutar o header global — isso
    // causava 401 em requests autenticadas concorrentes durante o await.
    const response = await apiAgility.post<BaseResponseAPI<CheckVersionResponse>>(
        '/mobile-version/check',
        request,
        {
            headers: {
                'x-api-key': API_KEY,
            },
            skipAuth: true,
        } as Parameters<typeof apiAgility.post>[2],
    );
    return response.data;
}

export const mobileVersionAPI = {
    checkVersion,
};
