import type { UserSettingsResponse, UpdateUserSettingsRequest } from './dto';
import { userSettingsAPI } from './userSettingsAPI';

export const userSettingsService = {
    getRoutingSettings: async (): Promise<UserSettingsResponse> => {
        const response = await userSettingsAPI.getRoutingSettings();
        return response.result!;
    },

    updateRoutingSettings: async (payload: UpdateUserSettingsRequest): Promise<UserSettingsResponse> => {
        const response = await userSettingsAPI.updateRoutingSettings(payload);
        return response.result!;
    },

    resetRoutingSettings: async (): Promise<void> => {
        await userSettingsAPI.resetRoutingSettings();
    },
};

