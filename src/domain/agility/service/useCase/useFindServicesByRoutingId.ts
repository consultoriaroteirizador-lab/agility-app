import { useEffect } from 'react'

import { useQuery } from '@tanstack/react-query'

import { orderOccurrenceReasonService } from '@/domain/agility/order-occurrence-reason/orderOccurrenceReasonService'
import { KEY_SERVICES } from '@/domain/queryKeys'
import { saveOccurrenceReasonsMirror } from '@/services/storage/occurrenceReasonsStorage'
import { clearStaleParadaDrafts } from '@/services/storage/paradaDraftStorage'

import { serviceService } from '../serviceService'

export function useFindServicesByRoutingId(
    routingId: string | undefined,
    options?: { refetchIntervalMs?: number },
) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_SERVICES, 'routing', routingId],
        queryFn: () => serviceService.findByRoutingId(routingId!),
        enabled: !!routingId,
        retry: false,
        // Fallback de polling enquanto a rota está em execução — cobre eventual
        // queda do socket /monitoring, garantindo que a re-projeção de ETA por
        // atraso chegue à tela mesmo sem push.
        refetchInterval: options?.refetchIntervalMs ?? false,
    })

    const services = data?.result ?? []

    // Limpa drafts cujo serviceId não pertence a esta rota. ParadaContext já cuida do
    // caso "serviço em status terminal" ao montar; este aqui pega o lixo deixado por
    // rotas antigas (motorista trocou de rota, app foi reinstalado, etc.).
    useEffect(() => {
        if (!routingId || services.length === 0) return
        const activeIds = services
            .map(s => s.id)
            .filter((id): id is string => !!id)
        if (activeIds.length === 0) return
        void clearStaleParadaDrafts(activeIds)

        // Warm do catálogo de motivos de insucesso (mirror local) ao abrir a rota, para
        // ter os motivos disponíveis offline na hora da entrega. Best-effort: falha aqui
        // não pode quebrar o carregamento da rota — em caso de erro (ex. offline), o
        // fluxo de insucesso cai pro mirror já salvo (se houver).
        void orderOccurrenceReasonService.findAllActive()
            .then(res => {
                const list = res.result ?? []
                if (list.length) void saveOccurrenceReasonsMirror(list)
            })
            .catch(() => { /* offline: usa o mirror existente */ })
    }, [routingId, services])

    return {
        services,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}