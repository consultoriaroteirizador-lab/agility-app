/**
 * Opcoes de relacao de quem recebeu/entregou/acompanhou, definidas pela empresa (spec 2026-08-24).
 *
 * O backend publica isto ja resolvido em `GET /drivers/me`, mas o app resolve de
 * novo por conta propria: resposta antiga, campo faltando ou valor estranho NAO
 * podem afrouxar a regra. Falha fechada, sempre.
 */

export interface RecipientRelation {
    code: string
    label: string
}

export interface RecipientRelations {
    delivery: RecipientRelation[]
    pickup: RecipientRelation[]
    service: RecipientRelation[]
}

export type ServiceFlowType = 'entrega' | 'coleta' | 'servico'

export const DEFAULT_RECIPIENT_RELATIONS: RecipientRelations = {
    delivery: [
        { code: 'CLIENTE', label: 'Cliente' },
        { code: 'PORTEIRO', label: 'Porteiro' },
        { code: 'VIZINHO', label: 'Vizinho' },
        { code: 'FAMILIAR', label: 'Familiar' },
        { code: 'OUTRO', label: 'Outro' },
    ],
    pickup: [
        { code: 'CLIENTE', label: 'Cliente' },
        { code: 'ESTOQUISTA', label: 'Estoquista' },
        { code: 'PORTARIA', label: 'Portaria' },
        { code: 'OUTRO', label: 'Outro' },
    ],
    service: [
        { code: 'CLIENTE', label: 'Cliente' },
        { code: 'RESP_LOCAL', label: 'Responsavel no local' },
        { code: 'ENCARREGADO', label: 'Encarregado' },
        { code: 'NINGUEM', label: 'Ninguem acompanhou' },
        { code: 'OUTRO', label: 'Outro' },
    ],
}

function clone(lista: RecipientRelation[]): RecipientRelation[] {
    return lista.map((r) => ({ ...r }))
}

function isValidRelation(value: unknown): value is RecipientRelation {
    const r = value as Partial<RecipientRelation>
    return (
        typeof r === 'object' &&
        r !== null &&
        typeof r.code === 'string' &&
        r.code.length > 0 &&
        typeof r.label === 'string' &&
        r.label.length > 0
    )
}

function sanitize(lista: unknown): RecipientRelation[] {
    if (!Array.isArray(lista)) return []
    return lista
        .filter((r): r is RecipientRelation => isValidRelation(r))
        .map((r) => ({ code: r.code, label: r.label }))
}

function resolveFlow(bruto: unknown, padrao: RecipientRelation[]): RecipientRelation[] {
    // Ausente = nao configurado, cai no default. Array vazio = configurado como "sem
    // opcoes", e respeitado. A distincao e deliberada.
    if (bruto === undefined || bruto === null) return clone(padrao)
    return sanitize(bruto)
}

export function resolveRecipientRelations(raw: unknown): RecipientRelations {
    const bucket = (raw ?? {}) as Partial<RecipientRelations>

    return {
        delivery: resolveFlow(bucket.delivery, DEFAULT_RECIPIENT_RELATIONS.delivery),
        pickup: resolveFlow(bucket.pickup, DEFAULT_RECIPIENT_RELATIONS.pickup),
        service: resolveFlow(bucket.service, DEFAULT_RECIPIENT_RELATIONS.service),
    }
}

/**
 * Traduz o nome de tela para o nome do contrato. A transferencia nao tem fluxo
 * proprio: `transfer/index.tsx` ja converte a perna em 'coleta' ou 'entrega'.
 */
export function relationsForServiceType(
    relations: RecipientRelations,
    serviceType: ServiceFlowType,
): RecipientRelation[] {
    if (serviceType === 'entrega') return relations.delivery
    if (serviceType === 'coleta') return relations.pickup
    return relations.service
}

/** Titulos da etapa, por fluxo. Fixos no codigo de proposito: sao tres frases. */
export const RECIPIENT_STEP_TITLES = {
    entrega: {
        title: 'Quem recebeu?',
        description: 'Escolha para quem foi entregue:',
        nameLabel: 'Nome de quem recebeu',
    },
    coleta: {
        title: 'Quem entregou?',
        description: 'Escolha quem entregou os itens para coleta:',
        nameLabel: 'Nome de quem entregou',
    },
    servico: {
        title: 'Quem acompanhou?',
        description: 'Escolha quem acompanhou a execucao:',
        nameLabel: 'Nome de quem acompanhou',
    },
} as const
