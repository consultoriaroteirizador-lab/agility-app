import { useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { MaterialCheckRequest, MaterialCheckResponse } from '../dto/response/service-line.response'
import type { ServiceType } from '../dto/types'
import { serviceService } from '../serviceService'

export type CheckLineVariables = {
    serviceId: Id
    serviceType: ServiceType | null | undefined
    lineId: Id
    data: MaterialCheckRequest
}

/**
 * O check de uma linha na rota da família. Quem chama trata a falha (desfaz a marcação e mostra o toast,
 * fase 3C): o `onError` do `useMutationService` não recebe as variáveis da chamada, então a falha volta
 * pela promessa do `checkLineAsync`. O `onError` vazio impede o modal de erro por cima do toast.
 */
export function useCheckLine() {
    const mutation = useMutationService<MaterialCheckResponse, CheckLineVariables>({
        action: ({ serviceId, serviceType, lineId, data }) => serviceService.checkLine(serviceId, serviceType, lineId, data),
        onError: () => {},
    })

    return {
        checkLineAsync: mutation.mutateAsync,
        isLoading: mutation.isLoading,
    }
}
