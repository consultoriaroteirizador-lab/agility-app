/**
 * Exigencias de finalizacao por fluxo, definidas pela empresa (spec 2026-08-23).
 *
 * O backend publica isto ja resolvido em `GET /drivers/me`, mas o app resolve de
 * novo por conta propria: resposta antiga, campo faltando ou valor estranho NAO
 * podem afrouxar a regra. Falha fechada, sempre.
 */

export type RequirementMode = 'REQUIRED' | 'OPTIONAL' | 'HIDDEN'

export interface PhotosRequirement {
    mode: RequirementMode
    /** So vale quando mode === 'REQUIRED'. */
    min: number
}

export interface FlowCompletionRequirements {
    /** Etapa "Quem recebeu?" — a escolha do tipo. */
    recipientType: RequirementMode
    /** Nome + documento de quem recebeu. */
    recipientIdentity: RequirementMode
    signature: RequirementMode
    photos: PhotosRequirement
}

export interface CompletionRequirements {
    delivery: FlowCompletionRequirements
    pickup: FlowCompletionRequirements
    service: FlowCompletionRequirements
}

/** Tipos de tela usados pelos componentes compartilhados. */
export type ServiceFlowType = 'entrega' | 'coleta' | 'servico'

export const DEFAULT_FLOW_REQUIREMENTS: FlowCompletionRequirements = {
    recipientType: 'REQUIRED',
    recipientIdentity: 'REQUIRED',
    signature: 'REQUIRED',
    photos: { mode: 'REQUIRED', min: 1 },
}

const MODES: RequirementMode[] = ['REQUIRED', 'OPTIONAL', 'HIDDEN']

function resolveMode(value: unknown): RequirementMode {
    return MODES.includes(value as RequirementMode) ? (value as RequirementMode) : 'REQUIRED'
}

function resolvePhotos(value: unknown): PhotosRequirement {
    const raw = (value ?? {}) as Partial<PhotosRequirement>
    const min = Number.isInteger(raw.min) && (raw.min as number) > 0 ? (raw.min as number) : 1
    return { mode: resolveMode(raw.mode), min }
}

function resolveFlow(flow: unknown): FlowCompletionRequirements {
    const f = (flow ?? {}) as Partial<FlowCompletionRequirements>
    return {
        recipientType: resolveMode(f.recipientType),
        recipientIdentity: resolveMode(f.recipientIdentity),
        signature: resolveMode(f.signature),
        photos: resolvePhotos(f.photos),
    }
}

export function resolveCompletionRequirements(raw: unknown): CompletionRequirements {
    const bucket = (raw ?? {}) as Partial<CompletionRequirements>
    return {
        delivery: resolveFlow(bucket.delivery),
        pickup: resolveFlow(bucket.pickup),
        service: resolveFlow(bucket.service),
    }
}

/**
 * Traduz o nome de tela para o nome do contrato. A transferencia nao tem fluxo
 * proprio: `transfer/index.tsx` ja converte a perna em 'coleta' ou 'entrega'.
 */
export function requirementsForServiceType(
    requirements: CompletionRequirements,
    serviceType: ServiceFlowType,
): FlowCompletionRequirements {
    if (serviceType === 'entrega') return requirements.delivery
    if (serviceType === 'coleta') return requirements.pickup
    return requirements.service
}
