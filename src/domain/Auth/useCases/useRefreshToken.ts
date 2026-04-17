import { useMutation } from '@tanstack/react-query';

import { useAuthCredentialsService } from '../../../services/authCredentials/useAuthCredentialsService';
import { authService } from '../authService';
import { AuthCredentials } from '../authType';

export interface RefreshTokenRequest {
    refreshToken: string;
    username?: string;
}

export interface UseRefreshTokenOptions {
    onSuccess?: (credentials: AuthCredentials) => void | Promise<void>;
    onError?: (error: Error) => void;
}

export function useRefreshToken(options?: UseRefreshTokenOptions) {
    const { saveCredentials } = useAuthCredentialsService();

    const mutation = useMutation({
        mutationFn: async (request: RefreshTokenRequest): Promise<AuthCredentials> => {
            const credentials = await authService.refreshToken(request.refreshToken);
            return credentials;
        },
        onSuccess: async (credentials) => {
            // Salvar novas credenciais após refresh
            await saveCredentials(credentials);
            // Executar callback customizado
            if (options?.onSuccess) {
                await options.onSuccess(credentials);
            }
        },
        onError: (error: Error) => {
            if (options?.onError) {
                options.onError(error);
            }
        },
        retry: false,
    });

    return {
        isLoading: mutation.isPending,
        refreshToken: (variables: RefreshTokenRequest) => mutation.mutate(variables),
        refreshTokenAsync: (variables: RefreshTokenRequest) => mutation.mutateAsync(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
        error: mutation.error,
    };
}
