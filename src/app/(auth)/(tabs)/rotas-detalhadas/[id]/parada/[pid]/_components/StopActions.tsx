import { Box, Button, Text } from '@/components';
import { measure } from '@/theme';

import { StopActionsProps } from '../_types/stop.types';

/**
 * Component that renders action buttons based on stop status
 */
export const StopActions = ({
    isNextStop,
    isInProgress,
    isInAttendance,
    isCompleted,
    isCanceled,
    hasArrivedAtLocation,
    hasOtherServiceInProgress,
    canStartService,
    startBlockReason,
    canCompleteRouting,
    isStarting = false,
    isStartingAttendance = false,
    isCompletingRouting = false,
    onGoToLocation,
    onArrivedAtLocation,
    onServiceCompleted,
    onServiceNotCompleted,
    onCompleteRouting,
}: StopActionsProps) => {
    // "Atendendo" é a fonte de verdade que abre Realizado/Não realizado.
    const attending = isInAttendance || hasArrivedAtLocation;
    return (
        <Box gap="y12" mt="y16" justifyContent='center' alignItems='center'                                                                 >
            {/* Não é a próxima e não está em execução → só "Indo pra lá".
                Gate por canStartService: iniciar tb respeita ordem/uma-por-vez
                (não só o "Estou aqui"), senão dá pra furar a regra pela partida. */}
            {!isNextStop && !isInProgress && !attending && (
                <Button
                    title={isStarting ? "Iniciando..." : "Indo pra lá"}
                    preset="outline"
                    onPress={onGoToLocation}
                    disabled={isStarting || !canStartService}
                    width={measure.x330}
                />
            )}

            {/* Próxima parada (PENDING/ASSIGNED), ainda não a caminho nem atendendo */}
            {isNextStop && !isInProgress && !attending && (
                <>
                    {startBlockReason && (
                        <Box backgroundColor="alertColor" p="y12" borderRadius="s12" mb="y8">
                            <Text preset="text13" color="alertColor" textAlign="center">
                                ⚠️ {startBlockReason}
                            </Text>
                        </Box>
                    )}
                    <Button
                        title={isStarting ? "Iniciando..." : "Indo pra lá"}
                        preset="outline"
                        onPress={onGoToLocation}
                        disabled={isStarting || !canStartService}
                        width={measure.x330}
                    />
                    <Button
                        title={isStartingAttendance ? "Iniciando atendimento..." : "Estou aqui!"}
                        onPress={onArrivedAtLocation}
                        disabled={!canStartService || isStartingAttendance}
                        width={measure.x330}
                    />
                </>
            )}

            {/* A caminho (IN_PROGRESS), ainda não chegou → "Estou aqui" inicia o atendimento */}
            {isInProgress && !attending && !isCompleted && (
                <Button
                    title={isStartingAttendance ? "Iniciando atendimento..." : "Estou aqui!"}
                    onPress={onArrivedAtLocation}
                    disabled={isStartingAttendance}
                    width={measure.x330}
                />
            )}

            {/* Em atendimento (IN_ATTENDANCE) → ações de conclusão */}
            {attending && !isCompleted && !isCanceled && (
                <>
                    <Button
                        title="Realizado"
                        onPress={onServiceCompleted}
                        width={measure.x330}
                    />
                    <Button
                        title="Não realizado"
                        preset="outline"
                        onPress={onServiceNotCompleted}
                        width={measure.x330}
                    />
                </>
            )}

            {/* If completed */}
            {isCompleted && (
                <Box backgroundColor="tertiary10" p="y16" borderRadius="s12" alignItems="center">
                    <Text preset="text14" color="tertiary100" fontWeightPreset='semibold'>
                        Parada concluída com sucesso
                    </Text>
                </Box>
            )}

            {/* If canceled */}
            {isCanceled && (
                <Box backgroundColor="redError" p="y16" borderRadius="s12" alignItems="center">
                    <Text preset="text14" color="redError" fontWeightPreset='semibold'>
                        Parada marcada como insucesso
                    </Text>
                </Box>
            )}

            {/* Complete Route Button - shown when stop is completed/canceled and all services are done */}
            {(isCompleted || isCanceled) && canCompleteRouting && onCompleteRouting && (
                <Button
                    title={isCompletingRouting ? "Concluindo..." : "Concluir Rota"}
                    onPress={onCompleteRouting}
                    disabled={isCompletingRouting}
                    mt="y8"

                />
            )}
        </Box>
    );
};
