/**
 * Utilitários de Mapeamento de Status
 * 
 * Este arquivo contém funções para mapear dados do backend
 * para formatos utilizados na UI da tela de detalhes da rota.
 * 
 * @module rotas-detalhadas/utils/statusMappers
 */

import type { ServiceResponse } from '@/domain/agility/service/dto'
import { ServiceType } from '@/domain/agility/service/dto/types'

import type {
    Parada,
    ParadaStatus,
    RotaStatus,
    ServiceTypeLabelMap,
} from '../_types/rota.types'

// ============================================
// CONSTANTES DE MAPEAMENTO
// ============================================

/**
 * Mapa de tipos de serviço para labels em português
 */
export const SERVICE_TYPE_LABELS: ServiceTypeLabelMap = {
    [ServiceType.INSTALLATION]: 'Instalação',
    [ServiceType.DELIVERY]: 'Entrega',
    [ServiceType.MAINTENANCE]: 'Manutenção',
    [ServiceType.EXCHANGE]: 'Troca',
    [ServiceType.PICKUP]: 'Coleta',
}

/**
 * Labels de status de parada para exibição
 */
export const PARADA_STATUS_LABELS: Record<ParadaStatus, string> = {
    'pendente': 'Pendente',
    'em-andamento': 'Em andamento',
    'concluida-sucesso': 'Concluída',
    'concluida-insucesso': 'Insucesso',
}

/**
 * Cores associadas aos status de parada
 */
export const PARADA_STATUS_COLORS: Record<ParadaStatus, string> = {
    'pendente': 'gray400',
    'em-andamento': 'primary100',
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

    if (service.isInProgress === true) {
        return 'em-andamento'
    }

    // Default para pendente (inclui caso isPending === true ou todos falsos)
    return 'pendente'
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

    // Verifica se há alguma parada em andamento
    const temEmAndamento = paradas.some(p => p.status === 'em-andamento')
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
 * Mapeia ServiceResponse para Parada
 * 
 * IMPORTANTE: Usa APENAS os dados do backend sem transformações desnecessárias.
 * Os campos booleanos (isPending, isInProgress, isCompleted, isCanceled) são a fonte da verdade.
 * 
 * @param service - Objeto de serviço do backend
 * @param index - Índice do serviço na lista ordenada (usado para número da parada)
 * @returns Objeto Parada formatado para exibição
 * 
 * @example
 * const parada = mapServiceToParada(service, 0)
 * // { numero: 1, serviceId: 'abc', nome: 'Cliente', ... }
 */
export function mapServiceToParada(service: ServiceResponse, index: number): Parada {
    // Usar posição na lista ordenada para numero (evita duplicados quando backend repete sequenceOrder)
    const numero = index + 1

    // Usar endereço completo se disponível, senão mostrar apenas o ID
    const endereco = service.address?.formattedAddress
        ?? (service.addressId ? `Endereço ID: ${service.addressId}` : 'Endereço não disponível')

    const horarioInicio = service.scheduledStartTime ?? '--:--'
    const horarioFim = service.estimatedCompletionTime ?? '--:--'

    // Mapear tipo de serviço
    const tipo = getServiceTypeLabel(service.serviceType)

    // Determinar status da parada
    const status = getParadaStatus(service)

    return {
        numero,
        serviceId: service.id,
        nome: service.fantasyName ?? service.responsible ?? 'Cliente',
        endereco,
        horarioInicio,
        horarioFim,
        tipo,
        status,
    }
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
    return status === 'em-andamento' || status === 'pendente'
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
