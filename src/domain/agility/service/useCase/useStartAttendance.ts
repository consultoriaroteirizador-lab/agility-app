import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { ServiceResponse } from '../dto'
import { serviceService } from '../serviceService'

export interface StartAttendanceVariables {
    id: Id
    /** Localização capturada pelo app no momento do "Estou aqui" (best-effort). */
    location?: { latitude?: number; longitude?: number; accuracy?: number }
    /** Código de retirada informado pelo cliente ao motorista (quando exigido). */
    pickupCode?: string
    /** Código do motivo (catálogo) — usado quando o código é dispensado/bypass. */
    reasonCode?: string
    /** Texto livre do motivo — usado junto com reasonCode quando aplicável. */
    reasonText?: string
}

/**
 * Inicia o atendimento de um serviço (status IN_ATTENDANCE).
 * O motorista chegou ao cliente e está atendendo. Aceito a partir de qualquer
 * estado pré-terminal — o backend seta startDate se ainda não houver. A localização
 * (de onde ele começou) é gravada na metadata do histórico de status.
 */
export function useStartAttendance(options?: MutationOptions<BaseResponse<ServiceResponse>>) {
    const mutation = useMutationService<ServiceResponse, StartAttendanceVariables>({
        action: ({ id, location, pickupCode, reasonCode, reasonText }: StartAttendanceVariables) =>
            serviceService.startAttendance(id, { location, pickupCode, reasonCode, reasonText }),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        startAttendance: (variables: StartAttendanceVariables) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}
