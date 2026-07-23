import type { ServiceResponse } from './dto/response/service.response'
import { ServiceType } from './dto/types'

/**
 * Checkpoint (perna) do fluxo em que o código de confirmação pode ser exigido.
 */
export type CodeLeg = 'PICKUP' | 'DELIVERY'

export interface CodeRequirement {
    /** Se o código de confirmação é obrigatório neste checkpoint, para este serviço. */
    required: boolean
    /** Se a empresa permite bypass do código (independente de `required`). */
    allowBypass: boolean
}

/**
 * Mapa tipo→checkpoint (autoritativo, definido pelo backend):
 * - PICKUP e TRANSFER têm checkpoint de retirada.
 * - DELIVERY, TRANSFER e SERVICE têm checkpoint de entrega.
 * - RETURN não tem nenhum dos dois.
 */
const PICKUP_CHECKPOINT_TYPES: ReadonlySet<ServiceType> = new Set([ServiceType.PICKUP, ServiceType.TRANSFER])
const DELIVERY_CHECKPOINT_TYPES: ReadonlySet<ServiceType> = new Set([
    ServiceType.DELIVERY,
    ServiceType.TRANSFER,
    ServiceType.SERVICE,
])

/**
 * Decide se um serviço exige código de confirmação em um dado checkpoint (retirada/entrega),
 * combinando a configuração da empresa (`confirmationCode`) com o mapa tipo→checkpoint.
 *
 * Pura e sem I/O — usada pelas telas de retirada/entrega (T3/T4) para decidir se pedem o código.
 */
export function resolveCodeRequirement(
    service: Pick<ServiceResponse, 'serviceType' | 'confirmationCode'> | null | undefined,
    leg: CodeLeg,
): CodeRequirement {
    const serviceType = service?.serviceType
    const confirmationCode = service?.confirmationCode

    if (!serviceType || !confirmationCode) {
        return { required: false, allowBypass: false }
    }

    const allowBypass = confirmationCode.allowCodeBypass ?? false

    const required =
        leg === 'PICKUP'
            ? !!confirmationCode.requirePickupCode && PICKUP_CHECKPOINT_TYPES.has(serviceType)
            : !!confirmationCode.requireDeliveryCode && DELIVERY_CHECKPOINT_TYPES.has(serviceType)

    return { required, allowBypass }
}
