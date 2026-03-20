/**
 * ParadaListItem - Item da lista de paradas
 */

import { Box, Text, TouchableOpacityBox } from '@/components'
import { measure, StatusColorConfig, ThemeColors } from '@/theme';

import { useRota } from '../_context/RotaContext'
import type { Parada, ParadaStatus } from '../_types/rota.types'

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

const STATUS_CONFIG: Record<ParadaStatus, StatusColorConfig> = {
    'pendente': {
        label: 'Pendente',
        bgColor: 'gray100',
        textColor: 'gray600',
        borderColor: 'gray200',
    },
    'em-andamento': {
        label: 'Em andamento ',
        bgColor: 'primary10',
        textColor: 'primary100',
        borderColor: 'primary100',
    },
    'concluida-sucesso': {
        label: 'Concluída',
        bgColor: 'tertiary10',
        textColor: 'tertiary100',
        borderColor: 'tertiary100',
    },
    'concluida-insucesso': {
        label: 'Insucesso',
        bgColor: 'redError',
        textColor: 'white',
        borderColor: 'redError',
    },
}

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
    const { navegarParaParada, abrirNavegacao } = useRota()

    const statusConfig = STATUS_CONFIG[parada.status]

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
                parada.status === 'concluida-sucesso' || parada.status === 'concluida-insucesso'
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
                </Box>

                <Box marginBottom="y4">
                    <Box
                        backgroundColor="gray200"
                        paddingHorizontal="x6"
                        paddingVertical="y2"
                        borderRadius="s4"
                        alignSelf="flex-start"
                        marginBottom="y4"
                    >
                        <Text preset="text10" fontWeight="600" color="gray600">
                            {parada.tipo.toUpperCase()}
                        </Text>
                    </Box>
                    <Text
                        preset="text14"
                        color="gray600"
                        fontWeight="600"
                        numberOfLines={2}
                        ellipsizeMode="tail"
                    >
                        {parada.nome}
                    </Text>
                </Box>

                <Text
                    preset="text13"
                    color="gray400"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {parada.endereco}
                </Text>

                {(parada.horarioInicio || parada.horarioFim) && (
                    <Box flexDirection="row" alignItems="center" gap="x4" marginTop="y8">
                        {parada.horarioInicio && (
                            <Text preset="text12" color="gray400">
                                ⏰ {parada.horarioInicio}
                            </Text>
                        )}
                        {parada.horarioInicio && parada.horarioFim && (
                            <Text preset="text12" color="gray300">
                                -
                            </Text>
                        )}
                        {parada.horarioFim && (
                            <Text preset="text12" color="gray400">
                                {parada.horarioFim}
                            </Text>
                        )}
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
