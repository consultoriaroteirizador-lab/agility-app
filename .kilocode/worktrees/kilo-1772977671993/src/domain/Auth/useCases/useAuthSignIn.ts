





import { MutationOptions } from '../../../api';
import { BaseResponse } from '../../../api/baseResponse';
import { useMutationService } from '../../../api/useMutationService';
import { useAuthCredentialsService } from '../../../services/authCredentials/useAuthCredentialsService';
import { authService } from '../authService';
import { AuthCredentials, AuthRequest } from '../authType';




export function useAuthSignIn(options?: MutationOptions<BaseResponse<AuthCredentials>>) {
    const { saveCredentials } = useAuthCredentialsService()

    const mutation = useMutationService<AuthCredentials, AuthRequest>({
        action: (request: AuthRequest) => authService.signIn(request),
        onError: options?.onError,
        onSuccess: async (data) => {
            // Salvar credenciais PRIMEIRO para garantir que o token seja atualizado antes de qualquer navegação
            await saveCredentials(data.result!);
            // Depois executar o callback customizado (que pode navegar)
            if (options?.onSuccess) {
                await options?.onSuccess(data);
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
