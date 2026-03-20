import { authService } from '@/domain/Auth/authService';
import { ForgotPasswordRequest, ForgotPasswordResponse } from '@/domain/Auth/authType';

import { MutationOptions } from '../../../api';
import { BaseResponse } from '../../../api/baseResponse';
import { useMutationService } from '../../../api/useMutationService';

export interface RecoverPasswordFormRequest {
    email: string;
    companyId?: string;
    realm?: string;
    clientId?: string;
    redirectUri?: string;
}

export function useRecoverPassword(
    options?: MutationOptions<BaseResponse<ForgotPasswordResponse>>
) {
    const mutation = useMutationService<ForgotPasswordResponse, RecoverPasswordFormRequest>({
        action: (request: RecoverPasswordFormRequest) => {
            const forgotPasswordRequest: ForgotPasswordRequest = {
                email: request.email,
                companyId: request.companyId,
                realm: request.realm,
                clientId: request.clientId,
                redirectUri: request.redirectUri,
            };
            return authService.forgotPassword(forgotPasswordRequest);
        },
        onError: options?.onError,
        onSuccess: options?.onSuccess,
    });

    return {
        isLoading: mutation.isLoading,
        recoverPassword: (variables: RecoverPasswordFormRequest) => mutation.mutate(variables),
        recoverPasswordAsync: (variables: RecoverPasswordFormRequest) => mutation.mutateAsync(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
        error: mutation.error,
    };
}
