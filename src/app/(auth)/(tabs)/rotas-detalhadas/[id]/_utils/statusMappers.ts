/**
 * Utilitários de Mapeamento de Status
 * 
 * Este arquivo contém funções para mapear dados do backend
 * para formatos utilizados na UI da tela de detalhes da rota.
 * 
 * @module rotas-detalhadas/utils/statusMappers
 */

import { formatAddress } from '@/domain/agility/address/dto'
import type { ServiceResponse } from '@/domain/agility/service/dto'
import { ServiceType } from '@/domain/agility/service/dto/types'
import { formatHHmm } from '@/functions'

import type {
    Parada,
    ParadaStatus,
    RotaStatus,
    ServiceTypeLabelMap,
} from '../_types/rota.types'

import { stopKeyOf } from './stopGrouping'

// ============================================
// CONSTANTES DE MAPEAMENTO
// ============================================

/**
 * Mapa de tipos de serviço para labels em português
 */
export const SERVICE_TYPE_LABELS: ServiceTypeLabelMap = {
    [ServiceType.DELIVERY]: 'Entrega',
    [ServiceType.PICKUP]: 'Coleta',
    [ServiceType.SERVICE]: 'Serviço',
    [ServiceType.TRANSFER]: 'Transferência',
    [ServiceType.RETURN]: 'Retorno',
}

/**
 * Labels de status de parada para exibição
 */
export const PARADA_STATUS_LABELS: Record<ParadaStatus, string> = {
    'pendente': 'Pendente',
    'em-andamento': 'Em andamento',
    'em-atendimento': 'Em atendimento',
    'concluida-sucesso': 'Concluída',
    'concluida-insucesso': 'Insucesso',
}

/**
 * Cores associadas aos status de parada
 */
export const PARADA_STATUS_COLORS: Record<ParadaStatus, string> = {
    'pendente': 'gray400',
    'em-andamento': 'primary100',
    'em-atendimento': 'secondary100',
    'concluida-sucesso': 'greenSuccess',
    'concluida-insucesso': 'redError',
}

// ============================================
// FUNÇÕES DE MAPEAMENTO
// ============================================

/**
 * Retorna o label do tipo de serviço
 * 
 * @param serviceType - Tipo do serviço do backend
 * @returns Label em português do tipo de serviço
 * 
 * @example
 * getServiceTypeLabel(ServiceType.INSTALLATION) // 'Instalação'
 * getServiceTypeLabel(ServiceType.DELIVERY) // 'Entrega'
 */
export function getServiceTypeLabel(serviceType: ServiceType | string | null | undefined): string {
    if (!serviceType) {
        return 'Serviço'
    }
    return SERVICE_TYPE_LABELS[serviceType] ?? serviceType
}

/** Rotas do fluxo por-pedido que o índice de notas (Task 5) e o auto-redirect da tela da parada abrem. */
export type StopServiceRoutePath =
    | '/rotas-detalhadas/[id]/parada/[pid]/entrega'
    | '/rotas-detalhadas/[id]/parada/[pid]/coleta'
    | '/rotas-detalhadas/[id]/parada/[pid]/service'

/**
 * Mapeia o tipo do serviço para a rota do fluxo por-pedido (DELIVERY/PICKUP/
 * SERVICE). TRANSFER e RETURN não passam por aqui — `stopKeyOf` nunca os
 * agrupa (são sempre `solo:`), então uma parada agrupada (N>1) nunca tem
 * esses tipos; o default de DELIVERY cobre esse caso e qualquer tipo
 * desconhecido.
 */
export function pathForServiceType(serviceType: ServiceType | string | null | undefined): StopServiceRoutePath {
    if (serviceType === ServiceType.PICKUP) {
        return '/rotas-detalhadas/[id]/parada/[pid]/coleta'
    }
    if (serviceType === ServiceType.SERVICE) {
        return '/rotas-detalhadas/[id]/parada/[pid]/service'
    }
    return '/rotas-detalhadas/[id]/parada/[pid]/entrega'
}

/**
 * Determina o status da parada baseado nos campos booleanos do serviço
 * 
 * IMPORTANTE: Usa APENAS os campos booleanos do backend (isPending, isInProgress, 
 * isCompleted, isCanceled, isFailed) como fonte da verdade.
 * 
 * @param service - Objeto de serviço do backend
 * @returns Status da parada determinado
 * 
 * @example
 * getParadaStatus({ isCompleted: true }) // 'concluida-sucesso'
 * getParadaStatus({ isCanceled: true }) // 'concluida-insucesso'
 * getParadaStatus({ isInProgress: true }) // 'em-andamento'
 * getParadaStatus({ isPending: true }) // 'pendente'
 */
export function getParadaStatus(service: ServiceResponse): ParadaStatus {
    // VALIDAÇÃO CRÍTICA: Usar APENAS os campos booleanos do backend
    // Não fazer fallback para enum status, pois os booleanos são calculados pelo backend
    if (service.isCompleted === true) {
        return 'concluida-sucesso'
    }

    if (service.isCanceled === true || service.isFailed === true) {
        // Serviço marcado como cancelado ou falha = insucesso
        return 'concluida-insucesso'
    }

    if (service.isInAttendance === true || service.status === 'IN_ATTENDANCE') {
        return 'em-atendimento'
    }

    if (service.isInProgress === true) {
        return 'em-andamento'
    }

    // Default para pendente (inclui caso isPending === true ou todos falsos)
    return 'pendente'
}

/**
 * Status da PARADA a partir dos N pedidos (§3.2 da spec).
 *
 * Precedência: em atendimento > em andamento > pendente > terminal. Uma parada
 * só fecha quando TODOS os pedidos fecham; e grupo misto (alguns entregues,
 * algum insucesso) fecha como INSUCESSO — é o recorte que não esconde o
 * problema do operador (§3.3).
 */
export function getParadaStatusGrupo(grupo: ServiceResponse[]): ParadaStatus {
    if (grupo.length === 0) return 'pendente'

    const status = grupo.map(getParadaStatus)

    if (status.includes('em-atendimento')) return 'em-atendimento'
    if (status.includes('em-andamento')) return 'em-andamento'
    if (status.includes('pendente')) return 'pendente'
    if (status.includes('concluida-insucesso')) return 'concluida-insucesso'
    return 'concluida-sucesso'
}

/** Janela mais restritiva do grupo: o início mais tarde e o fim mais cedo (§3.4). */
function janelaMaisRestritiva(grupo: ServiceResponse[]): { inicio: string | null; fim: string | null } {
    const inicios = grupo.map((s) => toISO(s.promisedStartDate)).filter((v): v is string => !!v)
    const fins = grupo.map((s) => toISO(s.promisedEndDate)).filter((v): v is string => !!v)

    return {
        inicio: inicios.length ? inicios.reduce((a, b) => (a > b ? a : b)) : null,
        fim: fins.length ? fins.reduce((a, b) => (a < b ? a : b)) : null,
    }
}

/**
 * Determina o status da rota baseado nas paradas
 * 
 * @param paradas - Lista de paradas da rota
 * @returns Status da rota determinado
 * 
 * @example
 * getRotaStatus([]) // 'pendente'
 * getRotaStatus([{ status: 'em-andamento' }]) // 'em-andamento'
 * getRotaStatus([{ status: 'concluida-sucesso' }]) // 'concluida'
 */
export function getRotaStatus(paradas: Parada[]): RotaStatus {
    if (!paradas || paradas.length === 0) {
        return 'pendente'
    }

    // Verifica se há alguma parada em execução (a caminho ou em atendimento)
    const temEmAndamento = paradas.some(p => p.status === 'em-andamento' || p.status === 'em-atendimento')
    if (temEmAndamento) {
        return 'em-andamento'
    }

    // Verifica se todas as paradas estão concluídas (sucesso ou insucesso)
    const todasConcluidas = paradas.every(p =>
        p.status === 'concluida-sucesso' || p.status === 'concluida-insucesso'
    )
    if (todasConcluidas) {
        return 'concluida'
    }

    // Se há paradas pendentes mas nenhuma em andamento
    return 'pendente'
}

/**
 * Mapeia UM GRUPO de pedidos (a parada) para `Parada`.
 *
 * O representante (`grupo[0]`, o primeiro do itinerário) fornece endereço, nome,
 * tipo e ETA de chegada. O que é agregado vem do grupo inteiro: status (§3.2),
 * janela (§3.4), conclusão real e pendência.
 *
 * PRÉ-CONDIÇÃO: `grupo` não é vazio. `groupContiguousBy` só cria um grupo ao ver
 * um item, então nenhum grupo dele nasce vazio — mas esta função é exportada
 * pelo barrel, e um chamador novo pode passar `[]`. `getParadaStatusGrupo` já
 * trata o caso; aqui não dá para tratar (uma parada sem nenhum pedido não tem
 * endereço, nome nem tipo), então falha alto e com o motivo escrito, em vez de
 * estourar um `TypeError` de `undefined.serviceType` trinta linhas abaixo.
 */
export function mapGrupoToParada(
    grupo: ServiceResponse[],
    index: number,
    returnAddress?: string | null,
): Parada {
    const service = grupo[0]
    if (!service) {
        throw new Error(
            'mapGrupoToParada: grupo vazio. Uma parada é sempre ao menos um pedido — ' +
            'use a saída de groupContiguousStops, que nunca produz grupo vazio.',
        )
    }
    const numero = index + 1

    const isRetorno = service.serviceType === ServiceType.RETURN

    const isTransferAB = service.serviceType === ServiceType.TRANSFER
        && (!!service.pickupAddress || !!service.deliveryAddress)
    const enderecoColeta = isTransferAB ? formatAddress(service.pickupAddress) : null
    const enderecoEntrega = isTransferAB ? formatAddress(service.deliveryAddress) : null

    const endereco = isRetorno
        ? (returnAddress ?? 'Retorno ao CD/origem')
        : isTransferAB
            ? `Coleta: ${enderecoColeta} · Entrega: ${enderecoEntrega}`
            : (service.address?.formattedAddress
                ?? (service.addressId ? `Endereço ID: ${service.addressId}` : 'Endereço não disponível'))

    // Chegada = a do primeiro pedido; conclusão = a do último. A parada dura da
    // primeira nota à última.
    const ultimo = grupo[grupo.length - 1]
    const horarioInicio = formatHHmm(service.estimatedArrival)
    const horarioFim = formatHHmm(ultimo.estimatedCompletion)

    const tipo = getServiceTypeLabel(service.serviceType)
    const status = getParadaStatusGrupo(grupo)
    const janela = janelaMaisRestritiva(grupo)

    const hasReturn = grupo.some((s) => !!(
        s.hasReturn ||
        (s.materials?.some((m) => m.direction === 'PICKUP') ?? false)
    ))

    // Conclusão da PARADA = a do último pedido a fechar.
    const conclusoes = grupo
        .map((s) => toISO(s.completedAt ?? s.endDate))
        .filter((v): v is string => !!v)
    const completedAtISO = conclusoes.length ? conclusoes.reduce((a, b) => (a > b ? a : b)) : null

    // Qualquer pendência de item no grupo marca a parada como "com pendência".
    const deliveryOutcome = grupo.some((s) => s.deliveryOutcome === 'WITH_ISSUES')
        ? 'WITH_ISSUES'
        : (grupo.some((s) => s.deliveryOutcome === 'FULL') ? 'FULL' : null)

    return {
        numero,
        serviceId: service.id,
        pedidos: grupo,
        chaveParada: stopKeyOf(service),
        nome: isRetorno ? 'Retorno' : (service.fantasyName ?? service.responsible ?? 'Cliente'),
        endereco,
        enderecoColeta,
        enderecoEntrega,
        horarioInicio,
        horarioFim,
        estimatedArrivalISO: toISO(service.estimatedArrival),
        plannedArrivalISO: toISO(service.plannedArrival),
        promisedStartISO: janela.inicio,
        promisedEndISO: janela.fim,
        completedAtISO,
        isLateToEta: service.isLateToEta ?? undefined,
        isLateToWindow: service.isLateToWindow ?? undefined,
        delayMinutes: service.delayMinutes ?? null,
        tipo,
        hasReturn,
        isRetorno,
        status,
        deliveryOutcome,
    }
}

/**
 * Compatibilidade: um pedido é uma parada de um pedido só.
 *
 * @deprecated Sem chamador de produção desde a Camada 2 — existe só para não
 * quebrar consumidor externo. NÃO usar em código novo: ela pula o agrupamento e
 * devolve uma parada por PEDIDO, que é exatamente o defeito que este épico
 * corrige (56 paradas onde são 26). Para transformar serviços em paradas use
 * `mapServicesToParadas`; para um grupo já formado, `mapGrupoToParada`.
 */
export function mapServiceToParada(
    service: ServiceResponse,
    index: number,
    returnAddress?: string | null,
): Parada {
    return mapGrupoToParada([service], index, returnAddress)
}

/** Normaliza Date|string|null → ISO string|null para comparação client-side. */
function toISO(value?: Date | string | null): string | null {
    if (!value) return null
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value.toISOString()
    return value
}

/**
 * Verifica se uma parada está concluída (sucesso ou insucesso)
 * 
 * @param status - Status da parada
 * @returns true se a parada está concluída
 */
export function isParadaConcluida(status: ParadaStatus): boolean {
    return status === 'concluida-sucesso' || status === 'concluida-insucesso'
}

/**
 * Verifica se uma parada está em andamento ou pendente
 * 
 * @param status - Status da parada
 * @returns true se a parada está em andamento ou pendente
 */
export function isParadaAtiva(status: ParadaStatus): boolean {
    return status === 'em-andamento' || status === 'em-atendimento' || status === 'pendente'
}

/**
 * Retorna o label de exibição do status da parada
 * 
 * @param status - Status da parada
 * @returns Label formatado para exibição
 */
export function getParadaStatusLabel(status: ParadaStatus): string {
    return PARADA_STATUS_LABELS[status]
}

/**
 * Retorna a cor associada ao status da parada
 * 
 * @param status - Status da parada
 * @returns Nome da cor para uso no tema
 */
export function getParadaStatusColor(status: ParadaStatus): string {
    return PARADA_STATUS_COLORS[status]
}
