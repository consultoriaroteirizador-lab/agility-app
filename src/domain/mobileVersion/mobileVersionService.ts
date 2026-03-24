import { BaseResponse, baseResponseAdapter } from '@/api';
import { getDeviceFingerprint } from '@/functions/getDeviceFingerprint';

import { CheckVersionResponse } from './dto/checkVersionResponse';
import { mobileVersionAPI } from './mobileVersionAPI';

async function checkVersion(): Promise<BaseResponse<CheckVersionResponse>> {
    const deviceInfo = await getDeviceFingerprint();

    if (!deviceInfo) {
        // Se não conseguir obter device info, retorna que não precisa atualizar
        return {
            success: true,
            result: {
                needsUpdate: false,
                forceUpdate: false,
                currentBuildNumber: 0,
                minBuildNumber: 0,
                versionName: null,
            },
        };
    }

    // Converter platform de 'ios'|'android' para 'IOS'|'ANDROID'
    const platform = deviceInfo.deviceInfo.platform.toUpperCase() as 'IOS' | 'ANDROID';
    const buildNumber = deviceInfo.deviceInfo.buildNumber;

    const response = await mobileVersionAPI.checkVersion({
        platform,
        buildNumber,
    });

    return baseResponseAdapter.toBaseResponse(response, response.result) as BaseResponse<CheckVersionResponse>;
}

export const mobileVersionService = {
    checkVersion,
};
