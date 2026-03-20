import { Box, Button, Text } from '@/components';
import { measure } from '@/theme';

import { StopActionsProps } from '../_types/stop.types';

/**
 * Component that renders action buttons based on stop status
 */
export const StopActions = ({
    isNextStop,
    isInProgress,
    isCompleted,
    isCanceled,
    hasArrivedAtLocation,
    hasOtherServiceInProgress,
    canStartService,
    canCompleteRouting,
    isStarting = false,
    isCompletingRouting = false,
    onGoToLocation,
    onArrivedAtLocation,
    onServiceCompleted,
    onServiceNotCompleted,
    onCompleteRouting,
}: StopActionsProps) => {
    return (
        <Box gap="y12" mt="y16" justifyContent='center' alignItems='center'                                                                 >
            {/* If not the next stop and not in progress, show only "Indo pra lá" */}
            {!isNextStop && !isInProgress && (
                <Button
                    title={isStarting ? "Iniciando..." : "Indo pra lá"}
                    preset="outline"
                    onPress={onGoToLocation}
                    disabled={isStarting}
                    width={measure.x330}
                />
            )}

            {/* If is the next stop and not yet started */}
            {isNextStop && !isInProgress && !hasArrivedAtLocation && (
                <>
                    {hasOtherServiceInProgress && (
                        <Box backgroundColor="alertColor" p="y12" borderRadius="s12" mb="y8">
                            <Text preset="text13" color="alertColor" textAlign="center">
                                ⚠️ Já existe uma parada em andamento. Conclua a parada atual antes de iniciar outra.
                            </Text>
                        </Box>
                    )}
                    <Button
                        title={isStarting ? "Iniciando..." : "Indo pra lá"}
                        preset="outline"
                        onPress={onGoToLocation}
                        disabled={hasOtherServiceInProgress || isStarting}
                        width={measure.x330}
                    />
                    <Button
                        title={isStarting ? "Iniciando..." : "Estou aqui!"}
                        onPress={onArrivedAtLocation}
                        disabled={!canStartService || isStarting}
                        width={measure.x330}
                    />
                </>
            )}

            {/* If in progress and clicked "Estou aqui" */}
            {isInProgress && hasArrivedAtLocation && !isCompleted && (
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

            {/* If in progress but hasn't clicked "Estou aqui" yet */}
            {isInProgress && !hasArrivedAtLocation && !isCompleted && (
                <Button
                    title="Estou aqui!"
                    onPress={onArrivedAtLocation}
                    width={measure.x330}
                />
            )}

            {/* If completed */}
            {isCompleted && (
                <Box backgroundColor="tertiary10" p="y16" borderRadius="s12" alignItems="center">
                    <Text preset="text14" color="tertiary100" fontWeight="500">
                        Parada concluída com sucesso
                    </Text>
                </Box>
            )}

            {/* If canceled */}
            {isCanceled && (
                <Box backgroundColor="redError" p="y16" borderRadius="s12" alignItems="center">
                    <Text preset="text14" color="redError" fontWeight="500">
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
