import { BaseResponse } from '@/api';
import { apiService } from '@/api/apiConfig';

import type { UserSettingsResponse, UpdateUserSettingsRequest } from './dto';

async function getRoutingSettings(): Promise<BaseResponse<UserSettingsResponse>> {
    const { data } = await apiService.get<BaseResponse<UserSettingsResponse>>('/user-settings/routing');
    return data;
}

async function updateRoutingSettings(payload: UpdateUserSettingsRequest): Promise<BaseResponse<UserSettingsResponse>> {
    const { data } = await apiService.put<BaseResponse<UserSettingsResponse>>('/user-settings/routing', payload);
    return data;
}

async function resetRoutingSettings(): Promise<BaseResponse<null>> {
    const { data } = await apiService.delete<BaseResponse<null>>('/user-settings/routing');
    return data;
}

export const userSettingsAPI = {
    getRoutingSettings,
    updateRoutingSettings,
    resetRoutingSettings,
};

