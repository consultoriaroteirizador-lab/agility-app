/**
 * ParadaListItem - Item da lista de paradas
 */

import { Box, Text, TouchableOpacityBox } from '@/components'
import { appDayKey, formatDDMM, formatHHmm } from '@/functions/dateFunctions'
import { useNow } from '@/hooks'
import { measure, ThemeColors } from '@/theme';

import { useRota } from '../_context/RotaContext'
import type { Parada, ParadaStatus } from '../_types/rota.types'
import { resolveNotasBadge } from '../_utils/paradaDisplay'
import { PARADA_STATUS_CHIP } from '../_utils/statusMappers'

/**
 * Recalcula os sinais de atraso ao vivo (relógio local) com fallback para o
 * snapshot do backend. Só vale para paradas em aberto (não concluídas).
 */
function computeLateness(parada: Parada, now: Date) {
    const concluded = parada.status === 'concluida-sucesso' || parada.status === 'concluida-insucesso'
    const windowEnd = parada.promisedEndISO ? new Date(parada.promisedEndISO) : null
    const windowEndValid = windowEnd && !isNaN(windowEnd.getTime()) ? windowEnd : null

    // Parada CONCLUÍDA → "entregue em atraso": conclusão real (completedAt) depois do
    // prazo prometido (promisedEnd). Independe do relógio (é um fato consolidado).
    if (concluded) {
        const done = parada.completedAtISO ? new Date(parada.completedAtISO) : null
        const doneValid = done && !isNaN(done.getTime()) ? done : null
        const deliveredLate = !!(doneValid && windowEndValid && doneValid.getTime() > windowEndValid.getTime())
        const deliveredLateMin = deliveredLate
            ? Math.max(0, Math.round((doneValid!.getTime() - windowEndValid!.getTime()) / 60_000))
            : null
        return { lateEta: false, lateWindow: false, delayMin: null as number | null, deliveredLate, deliveredLateMin }
    }

    const eta = parada.estimatedArrivalISO ? new Date(parada.estimatedArrivalISO) : null
    const etaValid = eta && !isNaN(eta.getTime()) ? eta : null
    // Baseline = plano original; sem ele (linha legada) cai na própria ETA atual.
    const plannedRaw = parada.plannedArrivalISO ? new Date(parada.plannedArrivalISO) : null
    const baseline = plannedRaw && !isNaN(plannedRaw.getTime()) ? plannedRaw : etaValid

    // Atraso = quando a parada de fato acontecerá (max(now, ETA atual)) vs. plano.
    // Assim o atraso continua visível mesmo depois de a ETA ser reprojetada pra frente.
    let delayMin: number | null = null
    if (baseline && etaValid) {
        const willHappenAt = Math.max(now.getTime(), etaValid.getTime())
        delayMin = Math.max(0, Math.round((willHappenAt - baseline.getTime()) / 60_000))
    } else {
        delayMin = parada.delayMinutes ?? null
    }

    const lateEta = delayMin != null ? delayMin > 0 : !!parada.isLateToEta
    const lateWindow = windowEndValid
        ? now.getTime() > windowEndValid.getTime()
        : !!parada.isLateToWindow

    return { lateEta, lateWindow, delayMin, deliveredLate: false, deliveredLateMin: null as number | null }
}

// ============================================
// TIPOS
// ============================================

export interface ParadaListItemProps {
    parada: Parada
    isProximaParada?: boolean
    onPress?: (parada: Parada) => void
    showNavigationButton?: boolean
}

// ============================================
// CONSTANTES
// ============================================

// A paleta de status mora em `_utils/statusMappers` (PARADA_STATUS_CHIP): o mesmo
// status também é pintado no card de cada nota dentro da parada agrupada, e duas
// cópias divergiriam sem ninguém notar.
const STATUS_CONFIG = PARADA_STATUS_CHIP

// ============================================
// COMPONENTE
// ============================================

/**
 * Item da lista de paradas - exibe número, nome, endereço, horário e status
 */
export function ParadaListItem({
    parada,
    isProximaParada = false,
    onPress,
    showNavigationButton = true,
}: ParadaListItemProps) {
    const { navegarParaParada, abrirNavegacao, routing } = useRota()

    // Paradas são clicáveis quando a rota está EM ANDAMENTO (IN_PROGRESS) ou
    // FINALIZADA (COMPLETED/CANCELLED) — finalizada abre o modo leitura. Só ficam
    // esmaecidas/“travadas” nos estados intermediários (não iniciada/broadcasting).
    const routeNotClickable = !(
        routing?.isInProgress === true ||
        routing?.isCompleted === true ||
        routing?.isCancelled === true
    )

    const statusConfig = STATUS_CONFIG[parada.status]

    // Uma parada pode ter N notas (mesma porta). A derivação é pura e testada em
    // `_utils/paradaDisplay` — este repo não tem teste de componente.
    const notasBadge = resolveNotasBadge(parada)

    // Relógio vivo (60s) para marcar atraso mesmo entre refetches.
    const now = useNow(60_000)
    const { lateEta, lateWindow, delayMin, deliveredLate, deliveredLateMin } = computeLateness(parada, now)
    const janelaContratada = (parada.promisedStartISO || parada.promisedEndISO)
        ? `${formatHHmm(parada.promisedStartISO)}–${formatHHmm(parada.promisedEndISO)}`
        : null

    // Só HH:mm esconde de que DIA o horário é: janela de ontem lida como 13:00–18:00
    // parece de hoje, e aí o selo "Fora da janela" (que compara o instante inteiro)
    // vira mistério. Quando não é hoje, o dia entra na frente.
    const hojeKey = appDayKey(now)
    const diaJanela = appDayKey(parada.promisedEndISO ?? parada.promisedStartISO)
    const janelaEmOutroDia = !!diaJanela && !!hojeKey && diaJanela !== hojeKey
    const diaEta = appDayKey(parada.estimatedArrivalISO)
    const etaEmOutroDia = !!diaEta && !!hojeKey && diaEta !== hojeKey

    // ⏰ ETA: só exibir quando há horário REAL. formatHHmm devolve '--:--' quando
    // não há estimatedArrival/Completion — não queremos mostrar o relógio com o
    // traço vazio (sem dado).
    const HORA_PLACEHOLDER = '--:--'
    const horaInicioValida = !!parada.horarioInicio && parada.horarioInicio !== HORA_PLACEHOLDER
    const horaFimValida = !!parada.horarioFim && parada.horarioFim !== HORA_PLACEHOLDER

    const handlePress = () => {
        if (onPress) {
            onPress(parada)
        } else {
            navegarParaParada(parada)
        }
    }

    const handleNavigation = () => {
        abrirNavegacao(parada)
    }

    const cardBgColor: ThemeColors = isProximaParada ? 'primary10' : 'white'
    const cardBorderColor: ThemeColors = isProximaParada ? 'primary100' : (statusConfig.borderColor ?? 'gray200')

    const statusIcon = getStatusIcon(parada.status)

    return (
        <TouchableOpacityBox
            backgroundColor={cardBgColor}
            borderRadius="s12"
            paddingVertical="y16"
            paddingHorizontal="x16"
            borderWidth={measure.m1}
            borderColor={cardBorderColor}
            onPress={handlePress}
            flexDirection="row"
            alignItems="center"
            gap="x12"
            opacity={
                routeNotClickable
                    ? 0.5
                    : parada.status === 'concluida-sucesso' || parada.status === 'concluida-insucesso'
                        ? 0.7
                        : 1
            }
        >
            <Box
                width={measure.x36}
                height={measure.y36}
                borderRadius="s18"
                backgroundColor={cardBorderColor}
                justifyContent="center"
                alignItems="center"
            >
                <Text
                    preset="text14"
                    fontWeight="bold"
                    color="white"
                >
                    {parada.numero}
                </Text>
            </Box>

            <Box flex={1} minWidth={0}>
                <Box
                    flexDirection="row"
                    alignItems="center"
                    flexWrap="wrap"
                    gap="x8"
                    marginBottom="y4"
                >
                    {isProximaParada && (
                        <Box
                            backgroundColor="primary100"
                            paddingHorizontal="x6"
                            paddingVertical="y2"
                            borderRadius="s4"
                            flexShrink={0}
                        >
                            <Text
                                preset="text12"
                                fontWeight="bold"
                                color="white"
                            >
                                PRÓXIMA
                            </Text>
                        </Box>
                    )}

                    <Box
                        backgroundColor={statusConfig.bgColor}
                        paddingHorizontal="x8"
                        paddingVertical="y2"
                        borderRadius="s4"
                        flexDirection="row"
                        alignItems="center"
                        gap="x4"
                        flexShrink={0}
                    >
                        <Text preset="text13" color="gray400">
                            {statusIcon}
                        </Text>
                        <Text
                            preset="text13"
                            color={statusConfig.textColor}
                        >
                            {statusConfig.label}
                        </Text>
                    </Box>

                    {notasBadge.label && (
                        <Box backgroundColor="gray100" paddingHorizontal="x8" paddingVertical="y2" borderRadius="s4" flexShrink={0}>
                            <Text preset="text13" color="gray600">
                                {notasBadge.label}
                            </Text>
                        </Box>
                    )}

                    {parada.status === 'concluida-sucesso' && parada.deliveryOutcome === 'WITH_ISSUES' && (
                        <Box
                            backgroundColor="yellow40"
                            paddingHorizontal="x8"
                            paddingVertical="y2"
                            borderRadius="s4"
                            flexShrink={0}
                        >
                            <Text preset="text13" color="gray800">
                                ⚠ com pendência
                            </Text>
                        </Box>
                    )}

                    {/* SLA: fora da janela contratada (prioridade sobre atraso de plano) */}
                    {lateWindow ? (
                        <Box
                            backgroundColor="redError"
                            paddingHorizontal="x8"
                            paddingVertical="y2"
                            borderRadius="s4"
                            flexShrink={0}
                        >
                            <Text preset="text13" color="white">
                                ⚠ Fora da janela
                            </Text>
                        </Box>
                    ) : lateEta ? (
                        <Box
                            backgroundColor="yellow40"
                            paddingHorizontal="x8"
                            paddingVertical="y2"
                            borderRadius="s4"
                            flexShrink={0}
                        >
                            <Text preset="text13" color="gray800">
                                ⏱ Atrasado{delayMin && delayMin > 0 ? ` +${delayMin}min` : ''}
                            </Text>
                        </Box>
                    ) : null}

                    {/* Parada CONCLUÍDA fora do prazo prometido → entregue em atraso */}
                    {deliveredLate && (
                        <Box
                            backgroundColor="redError"
                            paddingHorizontal="x8"
                            paddingVertical="y2"
                            borderRadius="s4"
                            flexShrink={0}
                        >
                            <Text preset="text13" color="white">
                                ⚠ Entregue em atraso{deliveredLateMin && deliveredLateMin > 0 ? ` +${deliveredLateMin}min` : ''}
                            </Text>
                        </Box>
                    )}
                </Box>

                {parada.enderecoRepetido && (
                    <Box marginBottom="y4">
                        <Text preset="text12" color="gray600">
                            ⓘ Este endereço aparece em outra parada da rota — siga a ordem do roteiro.
                        </Text>
                    </Box>
                )}

                <Box marginBottom="y4">
                    <Box flexDirection="row" alignItems="center" gap="x4" marginBottom="y4">
                        <Box
                            backgroundColor="gray200"
                            paddingHorizontal="x6"
                            paddingVertical="y2"
                            borderRadius="s4"
                            alignSelf="flex-start"
                        >
                            <Text preset="text10" fontWeightPreset='bold' color="gray600">
                                {parada.tipo.toUpperCase()}
                            </Text>
                        </Box>
                        {parada.hasReturn && (
                            <Box
                                backgroundColor="yellow40"
                                paddingHorizontal="x6"
                                paddingVertical="y2"
                                borderRadius="s4"
                                alignSelf="flex-start"
                            >
                                <Text preset="text10" fontWeightPreset='bold' color="gray800">
                                    + RETORNO
                                </Text>
                            </Box>
                        )}
                    </Box>
                    <Text
                        preset="text14"
                        color="gray600"
                        fontWeightPreset='bold'
                        numberOfLines={2}
                        ellipsizeMode="tail"
                    >
                        {parada.nome}
                    </Text>
                </Box>

                {parada.enderecoColeta || parada.enderecoEntrega ? (
                    <Box gap="y2">
                        <Text
                            preset="text13"
                            color="gray400"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            Coleta: {parada.enderecoColeta}
                        </Text>
                        <Text
                            preset="text13"
                            color="gray400"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            Entrega: {parada.enderecoEntrega}
                        </Text>
                    </Box>
                ) : (
                    <Text
                        preset="text13"
                        color="gray400"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {parada.endereco}
                    </Text>
                )}

                {/* Janela CALCULADA (ETA). Vermelho só quando a janela CONTRATADA
                    estourou — o mesmo caso do selo "⚠ Fora da janela" acima. Atraso
                    contra o plano (`lateEta`) já tem o selo âmbar próprio; pintar a
                    hora de vermelho também fazia parada DENTRO da janela parecer
                    problema, que é o oposto do que a cor deveria dizer. */}
                {(horaInicioValida || horaFimValida) && (
                    <Box flexDirection="row" alignItems="center" gap="x4" marginTop="y8">
                        <Text preset="text12" fontWeightPreset="semibold" color={lateWindow ? 'redError' : 'gray400'}>
                            ⏰{etaEmOutroDia ? ` ${formatDDMM(parada.estimatedArrivalISO)}` : ''}{horaInicioValida ? ` ${parada.horarioInicio}` : ''}
                        </Text>
                        {horaInicioValida && horaFimValida && (
                            <Text preset="text12" color="gray300">
                                -
                            </Text>
                        )}
                        {horaFimValida && (
                            <Text preset="text12" fontWeightPreset="semibold" color={lateWindow ? 'redError' : 'gray400'}>
                                {parada.horarioFim}
                            </Text>
                        )}
                    </Box>
                )}

                {/* Janela de atendimento contratada (compromisso com o cliente/SLA) */}
                {janelaContratada && (
                    <Box marginTop="y2">
                        <Text preset="text12" color="gray400">
                            📄 Janela contratada: {janelaEmOutroDia ? `${formatDDMM(parada.promisedEndISO ?? parada.promisedStartISO)} ` : ''}{janelaContratada}
                        </Text>
                    </Box>
                )}
            </Box>

            {showNavigationButton && (
                <TouchableOpacityBox
                    padding="x8"
                    onPress={handleNavigation}
                >
                    <Text preset="text16" color="primary100">
                        →
                    </Text>
                </TouchableOpacityBox>
            )}
        </TouchableOpacityBox>
    )
}

// ============================================
// HELPERS
// ============================================

function getStatusIcon(status: ParadaStatus): string {
    switch (status) {
        case 'pendente':
            return '○'
        case 'em-andamento':
            return '◐'
        case 'concluida-sucesso':
            return '✓'
        case 'concluida-insucesso':
            return '✕'
        default:
            return '○'
    }
}

// ============================================
// EMPTY STATE
// ============================================

export interface EmptyParadasListProps {
    message?: string
}

export function EmptyParadasList({ message = 'Nenhuma parada encontrada' }: EmptyParadasListProps) {
    return (
        <Box
            flex={1}
            justifyContent="center"
            alignItems="center"
            paddingVertical="y32"
        >
            <Text preset="text14" color="gray400">
                {message}
            </Text>
        </Box>
    )
}
