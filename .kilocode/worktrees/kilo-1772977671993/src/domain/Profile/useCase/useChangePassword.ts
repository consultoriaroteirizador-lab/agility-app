import { useMutation, type MutationOptions } from '@tanstack/react-query';

import { BaseResponse } from '@/api';
import { authService } from '@/domain/Auth/authService';
import { ChangePasswordRequest, ChangePasswordResponse } from '@/domain/Auth/authType';

// Mapear FormChangePasswordSchema (password) para ChangePasswordRequest (currentPassword)
type ChangePasswordFormRequest = {
    password: string;
    newPassword: string;
    newPasswordConfirmation: string;
};

export function useChangePassword(
    options?: MutationOptions<BaseResponse<ChangePasswordResponse>, Error, ChangePasswordFormRequest>
) {
    const mutation = useMutation({
        mutationFn: (request: ChangePasswordFormRequest) => {
            // Mapear password (do form) para currentPassword (do backend)
            const changePasswordRequest: ChangePasswordRequest = {
                currentPassword: request.password,
                newPassword: request.newPassword,
                newPasswordConfirmation: request.newPasswordConfirmation,
            };
            return authService.changePassword(changePasswordRequest);
        },
        ...options,
    });

    return {
        changePassword: mutation.mutate,
        changePasswordAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    };
}
