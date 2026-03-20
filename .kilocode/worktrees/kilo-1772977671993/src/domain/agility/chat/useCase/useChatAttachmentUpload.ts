import { BaseResponse, useMutationService } from '@/api';

import { uploadChatAttachments } from '../../service/serviceUploadUtils';

interface UploadChatAttachmentsParams {
  files: string[]; // URIs dos arquivos no React Native
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
  const mutation = useMutationService<{ urls: string[] }, UploadChatAttachmentsParams>({
    action: async (params: UploadChatAttachmentsParams) => {
      const response = await uploadChatAttachments(params.files);
      if (!response.urls || response.urls.length === 0) {
        throw new Error('Failed to upload chat attachments');
      }
      return response;
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });

  return {
    uploadAttachments: async (
      params: UploadChatAttachmentsParams,
    ): Promise<BaseResponse<{ urls: string[] }>> => {
      return new Promise((resolve, reject) => {
        mutation.mutate(params, {
          onSuccess: data => {
            options?.onSuccess?.({ success: true, result: data } as BaseResponse<{ urls: string[] }>);
            resolve({ success: true, result: data } as BaseResponse<{ urls: string[] }>);
          },
          onError: error => {
            options?.onError?.(error as Error);
            reject(error);
          },
        });
      });
    },
    isLoading: mutation.isLoading,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
