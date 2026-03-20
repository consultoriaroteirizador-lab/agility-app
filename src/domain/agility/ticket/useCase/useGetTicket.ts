import { useQuery } from '@tanstack/react-query'

import { KEY_TICKETS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import type { Ticket } from '../dto/types'
import { getTicketService } from '../ticketService'

/**
 * Hook para buscar um ticket específico por ID
 * Usa React Query para caching e gerenciamento de estado
 * 
 * @param ticketId - ID do ticket a ser buscado
 * @returns Objeto com ticket, estados de loading/error e função de refetch
 * 
 * @example
 * ```tsx
 * const { ticket, isLoading, isError, refetch } = useGetTicket(ticketId);
 * 
 * if (isLoading) return <LoadingScreen />;
 * if (isError) return <ErrorScreen onRetry={refetch} />;
 * if (!ticket) return <NotFound />;
 * 
 * return <TicketDetails ticket={ticket} />;
 * ```
 */
export function useGetTicket(ticketId: Id | undefined) {
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: [KEY_TICKETS, 'detail', ticketId],
        queryFn: async (): Promise<Ticket> => {
            if (!ticketId) {
                throw new Error('ticketId é obrigatório')
            }
            const result = await getTicketService(ticketId)
            if (!result.success || !result.result) {
                throw new Error(result.message || 'Erro ao buscar ticket')
            }
            return result.result as Ticket
        },
        enabled: !!ticketId,
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutos
    })

    return {
        ticket: data,
        isLoading,
        isError,
        error,
        refetch,
    }
}
