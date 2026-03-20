import { useMutation, useQueryClient } from '@tanstack/react-query'

import { KEY_TICKETS } from '@/domain/queryKeys'

import {
    assignTicketService,
    startTicketService,
    resolveTicketService,
    closeTicketService,
    reopenTicketService,
} from '../ticketService'

export function useTicketActions() {
    const queryClient = useQueryClient()

    const assignMutation = useMutation({
        mutationFn: ({ id, assignedToId }: { id: string; assignedToId?: string }) =>
            assignTicketService(id, assignedToId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [KEY_TICKETS] })
        },
    })

    const startMutation = useMutation({
        mutationFn: (id: string) => startTicketService(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [KEY_TICKETS] })
        },
    })

    const resolveMutation = useMutation({
        mutationFn: ({ id, resolution }: { id: string; resolution?: string }) =>
            resolveTicketService(id, resolution),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [KEY_TICKETS] })
        },
    })

    const closeMutation = useMutation({
        mutationFn: (id: string) => closeTicketService(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [KEY_TICKETS] })
        },
    })

    const reopenMutation = useMutation({
        mutationFn: (id: string) => reopenTicketService(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [KEY_TICKETS] })
        },
    })

    return {
        assign: assignMutation.mutate,
        start: startMutation.mutate,
        resolve: resolveMutation.mutate,
        close: closeMutation.mutate,
        reopen: reopenMutation.mutate,
        isAssigning: assignMutation.isPending,
        isStarting: startMutation.isPending,
        isResolving: resolveMutation.isPending,
        isClosing: closeMutation.isPending,
        isReopening: reopenMutation.isPending,
    }
}
