import { AddressResponse } from '@/domain/agility/address/dto'
import type { FormGroupAnswerResponse } from '@/domain/agility/form-group-answer/dto/form-group-answer.response'

import type { ServiceStatus, ServiceType, PriorityLevel, PersonType, VehicleRequirements } from '../types'

import type { ServiceMaterialResponse } from './service-material.response'

/**
 * Service response DTO
 * Maps to ServiceEntity.toJson() from backend
 */
export interface ServiceResponse {
    /** Service unique identifier */
    id: string

    /** Routing ID */
    routingId: string | null

    /** Sequence order in routing */
    sequenceOrder: number | null

    /** Previous service ID */
    previousServiceId: string | null

    /** Service type */
    serviceType: ServiceType | null

    /** Service sub-type (e.g. MANUTENCAO, VISTORIA, INSTALACAO) */
    subType: string | null

    /** Status */
    status: ServiceStatus

    /** Resultado da entrega/coleta derivado do check dos materiais (FULL/WITH_ISSUES). */
    deliveryOutcome?: 'FULL' | 'WITH_ISSUES' | null

    /** Responsible person name */
    responsible: string | null

    /** Client person type */
    clientPersonType: PersonType | null

    /** Client email */
    clientEmail: string | null

    /** Client phone */
    clientPhone: string | null

    /** Identification code */
    identificationCode: string | null

    /** Fantasy name / Trade name */
    fantasyName: string | null

    /** Tax number (CPF/CNPJ) */
    taxNumber: string | null

    /** Service order number */
    serviceOrder: string | null

    /** Order origin */
    orderOrigin: string | null

    /** Invoicing info */
    invoicing: string | null

    /** Offer value */
    offerValue: number | null

    /** Whether payment is required from customer on delivery (COD) */
    requiresPayment: boolean

    /** Address ID */
    addressId: string | null

    /** Customer ID */
    customerId: string | null

    /** Title */
    title: string | null

    /** Problem description */
    problemDescription: string | null

    /** Priority */
    priority: PriorityLevel | null

    /** Required skills */
    requiredSkills: number[] | null

    /** Vehicle requirements */
    vehicleRequirements: VehicleRequirements | null

    /** Assigned driver ID */
    assignedToId: string | null

    /** Technician ID */
    technicianId: string | null

    /** Helper ID */
    helperId: string | null

    /** Request date */
    requestDate: Date | string | null

    /** Promised start date */
    promisedStartDate: Date | string | null

    /** Promised end date */
    promisedEndDate: Date | string | null

    /** Scheduled date */
    scheduledDate: Date | string | null

    /** Estimated duration */
    estimatedDuration: number | null

    /** Horário estimado de chegada (ORS) — retornado pelo back (ISO datetime). */
    estimatedArrival: string | null

    /** Horário estimado de conclusão (ORS) — retornado pelo back (ISO datetime). */
    estimatedCompletion: string | null

    /** Baseline imutável do primeiro plano (ISO). ETA original antes de re-projeções. */
    plannedArrival?: Date | string | null

    /** Atrasada vs. ETA do ORS (plano). Derivado no backend no momento do fetch. */
    isLateToEta?: boolean

    /** Fora da janela contratada do pedido (SLA). Derivado no backend no fetch. */
    isLateToWindow?: boolean

    /** Minutos de atraso vs. ETA (positivo = atrasado); null quando não se aplica. */
    delayMinutes?: number | null

    /** Start date */
    startDate: Date | string | null

    /** End date */
    endDate: Date | string | null

    /** Completion notes */
    completionNotes: string | null

    /** Description */
    description: string | null

    /** Category */
    category: string | null

    /** Price */
    price: number | null

    /** Is pending */
    isPending: boolean

    /** Is in progress (a caminho do cliente) */
    isInProgress: boolean

    /** Is in attendance (em atendimento — chegou no cliente) */
    isInAttendance?: boolean

    /** Is completed */
    isCompleted: boolean

    /** Is canceled */
    isCanceled: boolean

    /** Is failed */
    isFailed: boolean

    /** Is assigned */
    isAssigned: boolean

    /** Has driver */
    hasDriver: boolean

    /** Has technician */
    hasTechnician: boolean

    /** Has helper */
    hasHelper: boolean

    /** Is in routing */
    isInRouting: boolean

    /** Is first in sequence */
    isFirstInSequence: boolean

    /** Actual duration in minutes */
    actualDurationMinutes: number | null

    /** Calculated actual duration in minutes */
    actualDurationMinutesCalculated: number | null

    /** Full address object (when available) */
    address: AddressResponse | null

    /**
     * Endereços de origem (A) e destino (B) para serviços TRANSFER
     * (transferência ponto-a-ponto). Nulos para os demais tipos.
     */
    pickupAddressId?: string | null
    pickupAddress?: AddressResponse | null
    deliveryAddressId?: string | null
    deliveryAddress?: AddressResponse | null

    /**
     * Evidência da coleta na origem (TRANSFER) — capturada na perna 1 do wizard
     * e persistida na finalização. Null para os demais tipos.
     */
    pickupCompletionData?: {
        customerSignature?: string | null
        receivedBy?: string | null
        photoProof?: string[] | null
        notes?: string | null
        completedAt?: string | null
    } | null

    /** Materials list for this service (delivery/pickup items) */
    materials?: ServiceMaterialResponse[]

    /** Routing code */
    routingCode: string | null

    /** Customer signature file path */
    customerSignature: string | null

    /** Photo proof file paths */
    photoProof: string[] | null

    /** Name of person who received the delivery/service */
    receivedBy: string | null

    /** Completion timestamp */
    completedAt: Date | string | null

    /** Number of attempts */
    attemptCount: number

    /** Creation timestamp */
    createdAt: Date | string

    /** Last update timestamp */
    updatedAt: Date | string

    /**
     * Cubagem do pedido, derivada dos materiais por `computeServiceAmounts` no
     * backend (`weight`/`volume` UNITÁRIOS × `quantity`) e serializada por
     * `ServiceEntity.toJson()`. `amountWeight` já vinha na resposta; era este
     * contrato que não o declarava, e o campo se perdia no caminho.
     */
    amountWeight: number | null | undefined
    amountItems: number | undefined
    amountVolume: number | undefined

    /**
     * Quantidades COLETADAS no mesmo stop (devolução, casco vazio, retorno).
     * Presentes quando a parada tem coleta de retorno além da entrega.
     */
    pickupAmountWeight?: number | null
    pickupAmountVolume?: number | null
    pickupAmountItems?: number | null

    /**
     * Flag explícito do backend: esta parada tem coleta/devolução no MESMO stop.
     * Fonte de verdade para o app habilitar a etapa de coleta de retorno.
     * Pode ser true mesmo com pickupAmount* vazio (qty desconhecida no cadastro).
     */
    hasReturn?: boolean

    /** IDs dos form groups vinculados ao service */
    formGroupIds: string[] | null

    /** Respostas preenchidas dos form groups */
    formGroupAnswers: FormGroupAnswerResponse[] | null

    /**
     * Configuração de código de confirmação de retirada/entrega (por empresa).
     * Indica se o backend exige código na retirada/entrega e se permite bypass.
     */
    confirmationCode?: {
        requirePickupCode: boolean
        requireDeliveryCode: boolean
        allowCodeBypass: boolean
    } | null
}



