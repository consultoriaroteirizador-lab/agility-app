import { useMutation } from "@tanstack/react-query";

import { useModalErrorService } from "@/services/modalError/useModalErrorService";
import { useToastService } from "@/services/Toast/useToast";

import { BaseResponse, ErrorResponse } from "./baseResponse";

interface PropsUseMutation<TRequest = void, TData = void> {
    action: (request: TRequest) => Promise<BaseResponse<TData>>;
    onError?: (error: BaseResponse<any>) => void;
    onSuccess?: (data: BaseResponse<TData>) => void | Promise<void>;
    options?: Omit<
        Parameters<typeof useMutation>[0],
        "mutationFn" | "onError" | "onSuccess"
    >;
}

export function useMutationService<TData = void, TRequest = void>({
    action,
    onError = undefined,
    onSuccess = undefined,
    options
}: PropsUseMutation<TRequest, TData>) {
    const { openModal } = useModalErrorService();
    const { showToast } = useToastService();

    const handleError = (response: BaseResponse<ErrorResponse>) => {
        console.error('Erro recebido no mutation::ERROR:', response);
        if (onError) {
            console.log("OnError", response.error)
            onError(response);
        } else {
            openModal(response.error?.message ?? 'Houve um erro desconhecido');
        }
    };

    const handleSuccess = async (data: BaseResponse<TData>) => {
        if (onSuccess) {
            await onSuccess(data);
            return;
        }
        if (data.message) {
            showToast({ message: data.message });
        }
    };

    const mutation = useMutation<BaseResponse<TData>, BaseResponse<any>, TRequest>({
        mutationFn: action,
        retry: false,
        onError: handleError,
        onSuccess: handleSuccess,
        ...options,
    });

    const mutate = (variables?: TRequest) => mutation.mutate(variables as TRequest);
    const mutateAsync = (variables?: TRequest) => mutation.mutateAsync(variables as TRequest);

    return {
        isLoading: mutation.isPending,
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
        error: mutation.error,
        mutate,
        mutateAsync,
    };
}
