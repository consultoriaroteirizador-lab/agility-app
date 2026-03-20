




import { BaseResponse } from '../../../api/baseResponse';
import { useMutationService } from '../../../api/useMutationService';
import { useAuthCredentialsService } from '../../../services/authCredentials/useAuthCredentialsService';
import { UserAuth } from '../../../services/userAuthInfo/UserAuthInfoType';
import { authService } from '../authService';
import { AuthCredentials, AuthRequest } from '../authType';

interface UseAuthSignInOptions {
    onError?: (error: BaseResponse<any>) => void;
    onSuccess?: (data: BaseResponse<AuthCredentials>, userAuth: UserAuth | null) => void | Promise<void>;
}

export function useAuthSignIn(options?: UseAuthSignInOptions) {
    const { saveCredentials } = useAuthCredentialsService()

    const mutation = useMutationService<AuthCredentials, AuthRequest>({
        action: (request: AuthRequest) => authService.signIn(request),
        onError: options?.onError,
        onSuccess: async (data) => {
            console.log('[useAuthSignIn] onSuccess chamado');
            console.log('[useAuthSignIn] data.result:', data.result ? 'existe' : 'null');
            // Salvar credenciais PRIMEIRO para garantir que o token seja atualizado antes de qualquer navegação
            const userAuth = await saveCredentials(data.result!);
            console.log('[useAuthSignIn] saveCredentials finalizado, userAuth:', userAuth?.fullname || 'null');
            // Depois executar o callback customizado (que pode navegar)
            if (options?.onSuccess) {
                console.log('[useAuthSignIn] chamando options.onSuccess');
                await options.onSuccess(data, userAuth);
                console.log('[useAuthSignIn] options.onSuccess finalizado');
            }
        },
    });

    return {
        isLoading: mutation.isLoading,
        signIn: (variables: AuthRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    };
}





// const mutation = useMutation<BaseResponse<AuthCredentials>, Error, Variables>(
//     ({ email, password }) => authService.signIn(email, password), // Função de mutação
//     {
//         retry: false, // Desativa tentativas automáticas
//         onError: error => {
//             if (options?.onError) {
//                 options.onError(error.message); // Propaga o erro para o callback fornecido
//             }
//         },
//         onSuccess: authCredentials => {
//             if (options?.onSuccess) {
//                 options.onSuccess(authCredentials.result!); // Propaga o sucesso para o callback fornecido
//             }
//         },
//     }
// );
