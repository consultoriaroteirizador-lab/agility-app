import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { KEY_NOTIFICATIONS } from '@/domain/queryKeys';

import type { NotificationResponse, UnreadCountResponse } from '../dto';
import { NotificationStatus } from '../dto';
import { markAllNotificationsAsReadService } from '../notificationService';

type Retrato = [QueryKey, unknown][];

/** Lista em cache com todas as não lidas viradas em lidas. Aceita o array cru e o BaseResponse. */
export function marcarTodasNoCache(dado: unknown, lidaEm: string): unknown {
    const marcar = (lista: NotificationResponse[]) =>
        lista.map((n) => (n.status === NotificationStatus.UNREAD ? { ...n, status: NotificationStatus.READ, readAt: lidaEm } : n));
    if (Array.isArray(dado)) return marcar(dado as NotificationResponse[]);
    if (dado && typeof dado === 'object' && Array.isArray((dado as { result?: unknown }).result)) {
        const resposta = dado as { result: NotificationResponse[] };
        return { ...resposta, result: marcar(resposta.result) };
    }
    return dado;
}

/**
 * "Marcar todas como lidas" (`PATCH /notifications/read-all`, só as do próprio usuário).
 *
 * Otimista: a lista da aba e o contador de não lidas (que alimenta o badge da barra inferior)
 * mudam na hora; se o servidor recusar, o retrato anterior volta. No fim, a confirmação vem do
 * servidor pela invalidação.
 */
export function useMarkAllNotificationsAsRead() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async () => {
            const response = await markAllNotificationsAsReadService();
            if (response && response.success === false) {
                throw new Error(response.error?.message || 'Erro ao marcar notificações como lidas');
            }
            return response;
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: [KEY_NOTIFICATIONS] });
            const retrato: Retrato = queryClient.getQueriesData({ queryKey: [KEY_NOTIFICATIONS] });

            const agora = new Date().toISOString();
            queryClient.setQueriesData({ queryKey: [KEY_NOTIFICATIONS, 'all'] }, (dado: unknown) => marcarTodasNoCache(dado, agora));
            queryClient.setQueriesData({ queryKey: [KEY_NOTIFICATIONS, 'unread'] }, (dado: unknown) => {
                if (Array.isArray(dado)) return [];
                if (dado && typeof dado === 'object' && Array.isArray((dado as { result?: unknown }).result)) {
                    return { ...(dado as object), result: [] };
                }
                return dado;
            });
            queryClient.setQueryData<UnreadCountResponse>([KEY_NOTIFICATIONS, 'unread-count'], (dado) =>
                dado ? { ...dado, unreadCount: 0 } : dado,
            );

            return { retrato };
        },
        onError: (_erro, _vars, contexto) => {
            for (const [chave, dado] of contexto?.retrato ?? []) {
                queryClient.setQueryData(chave, dado);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [KEY_NOTIFICATIONS] });
        },
    });

    return {
        markAllAsRead: mutation.mutate,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
        reset: mutation.reset,
    };
}
