import { useMutation } from '@tanstack/react-query';

import type { BaseResponse } from '@/api/baseResponse';

import { uploadChatAttachments } from '../../service/serviceUploadUtils';

interface UploadChatAttachmentsParams {
  files: string[]; // URIs dos arquivos no React Native
  chatId: string; // obrigatório no back (query param)
}

interface UploadChatAttachmentsResult {
  uploadAttachments: (params: UploadChatAttachmentsParams) => Promise<BaseResponse<{ urls: string[] }>>;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * Hook customizado para upload de anexos de chat (React Native)
 * Suporta múltiplos arquivos (imagens, PDF, Word)
 *
 * @param options - Opções de mutação (onSuccess, onError)
 * @returns Função de upload e estado da requisição
 */
export function useChatAttachmentUpload(
  options?: {
    onSuccess?: (data: BaseResponse<{ urls: string[] }>) => void;
    onError?: (error: Error) => void;
  },
): UploadChatAttachmentsResult {
  const mutation = useMutation({
    mutationFn: async (params: UploadChatAttachmentsParams) => {
      console.log('[useChatAttachmentUpload] Iniciando upload:', {
        filesCount: params.files.length,
        files: params.files.map((f: string) => f?.substring(0, 50)),
      });

      const response = await uploadChatAttachments(params.files, params.chatId);

      console.log('[useChatAttachmentUpload] Resposta do upload:', {
        urls: response.urls,
        urlsCount: response.urls?.length,
      });

      if (!response.urls || response.urls.length === 0) {
        console.error('[useChatAttachmentUpload] Nenhuma URL retornada do upload');
        throw new Error('Failed to upload chat attachments - no URLs returned');
      }
      return response;
    },
    onSuccess: (data: { urls: string[] }) => {
      console.log('[useChatAttachmentUpload] Upload concluído com sucesso:', data);
      options?.onSuccess?.({ success: true, result: data } as BaseResponse<{ urls: string[] }>);
    },
    onError: (error: Error) => {
      console.error('[useChatAttachmentUpload] Erro capturado:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack?.substring(0, 200),
      });
      options?.onError?.(error);
    },
  });

  return {
    uploadAttachments: async (
      params: UploadChatAttachmentsParams,
    ): Promise<BaseResponse<{ urls: string[] }>> => {
      // mutateAsync, e não os callbacks por chamada do mutate: esses só disparam enquanto
      // o componente está montado. Se a tela desmontasse no meio do upload, a promessa
      // nunca terminava e a fila de envio ficava parada. O erro chega igual (rejeição).
      const data = await mutation.mutateAsync(params);
      return { success: true, result: data } as BaseResponse<{ urls: string[] }>;
    },
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}