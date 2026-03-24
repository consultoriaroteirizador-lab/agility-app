import { apiAgility, BaseResponseAPI } from '@/api';
import { API_KEY } from '@/config/environment';

import { CheckVersionRequest } from './dto/checkVersionRequest';
import { CheckVersionResponse } from './dto/checkVersionResponse';

async function checkVersion(request: CheckVersionRequest): Promise<BaseResponseAPI<CheckVersionResponse>> {
    // Esta é uma rota pública - usar x-api-key sem Authorization
    const originalAuth = apiAgility.defaults.headers.common?.Authorization;
    if (originalAuth) {
        delete apiAgility.defaults.headers.common.Authorization;
    }

    try {
        const response = await apiAgility.post<BaseResponseAPI<CheckVersionResponse>>(
            '/mobile-version/check',
            request,
            {
                headers: {
                    'x-api-key': API_KEY,
                },
            }
        );
        return response.data;
    } finally {
        // Restaurar Authorization header se existia antes
        if (originalAuth) {
            apiAgility.defaults.headers.common.Authorization = originalAuth;
        }
    }
}

export const mobileVersionAPI = {
    checkVersion,
};
