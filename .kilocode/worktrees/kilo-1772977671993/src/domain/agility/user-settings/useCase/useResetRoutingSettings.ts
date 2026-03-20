import { useMutation, useQueryClient } from '@tanstack/react-query';

import { userSettingsService } from '../userSettingsService';

export function useResetRoutingSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => userSettingsService.resetRoutingSettings(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-settings', 'routing'] });
        },
    });
}

