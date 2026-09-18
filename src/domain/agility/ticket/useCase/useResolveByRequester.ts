import { useMutation, useQueryClient } from '@tanstack/react-query'

import { KEY_CHATS, KEY_TICKETS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { resolveByRequesterService } from '../ticketService'

/**
 * O próprio solicitante encerra o atendimento.
 *
 * O backend resolve o protocolo E fecha o chat, então o cache de chats também é
 * invalidado: sem isso, "Continuar chamado" voltaria para a conversa fechada.
 */
export function useResolveByRequester() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, resolution }: { id: Id; resolution?: string }) =>
            resolveByRequesterService(id, resolution),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [KEY_TICKETS] })
            queryClient.invalidateQueries({ queryKey: [KEY_CHATS] })
        },
    })
}
