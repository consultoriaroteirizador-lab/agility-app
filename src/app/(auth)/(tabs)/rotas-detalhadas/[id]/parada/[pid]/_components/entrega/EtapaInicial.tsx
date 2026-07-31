import { useCallback } from 'react';

import { router } from 'expo-router';

import { Box, ScreenBase, Text } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { formatAddressStreetNumber } from '@/domain/agility/address/dto';
import { useToastService } from '@/services/Toast/useToast';

import { useParada } from '../../_context/ParadaContext';
import { useStopActions } from '../../_hooks/useStopActions';
import { StopArrivalView } from '../shared/StopArrivalView';

/**
 * Etapa 1: Tela inicial com "Indo pra lá" e "Estou aqui!"
 * Layout unificado com dados-servico.
 *
 * A apresentação mora em `StopArrivalView` (compartilhada com o índice da
 * parada agrupada — Camada 3, Task 4): as duas telas divergem só DEPOIS de
 * "Estou aqui", nunca na chegada em si. Este componente fica só com o que é
 * dele — dados do `ParadaContext`, o gate de bloqueio e o avanço de etapa
 * (`setEtapa`), que a tela do índice não tem.
 */
export function EtapaInicial() {
    const { service, effectiveAddress, setEtapa, rotaId, startBlockReason } = useParada();
    const { showToast } = useToastService();
    const { handleStartService, handleStartAttendance, isStarting, isStartingAttendance } = useStopActions({
        serviceId: service?.id || '',
        routeId: service?.routingId || '',
        serviceStatus: service?.status,
        isServiceInProgress: service?.status === 'IN_PROGRESS',
        serviceStartDate: service?.startDate ? String(service.startDate) : null,
        onSuccess: () => {
            // Continua na tela após iniciar o atendimento
        },
    });

    // "A caminho" (IN_PROGRESS) — já clicou "Indo pra lá"; agora só falta "Estou aqui".
    const isEnRoute = service?.isInProgress === true || service?.status === 'IN_PROGRESS';

    // Regras configuráveis da empresa (uma parada por vez / ordem obrigatória).
    const isStartBlocked = startBlockReason !== null;

    const handleBack = useCallback(() => {
        router.back();
    }, []);

    const handleGoToLocation = useCallback(() => {
        if (isStartBlocked) {
            showToast({ message: startBlockReason!, type: 'error' });
            return;
        }
        handleStartService();
    }, [isStartBlocked, startBlockReason, showToast, handleStartService]);

    const handleArrived = useCallback(() => {
        if (isStartBlocked) {
            showToast({ message: startBlockReason!, type: 'error' });
            return;
        }
        handleStartAttendance();
        setEtapa(2);
    }, [isStartBlocked, startBlockReason, showToast, handleStartAttendance, setEtapa]);

    return (
        <ScreenBase buttonLeft={<ButtonBack onPress={handleBack} />} title={<Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
            {formatAddressStreetNumber(effectiveAddress)}
        </Text>}>
            <Box flex={1} backgroundColor="white">
                <Box scrollable style={{ paddingBottom: 32 }}>
                    <StopArrivalView
                        service={service}
                        effectiveAddress={effectiveAddress}
                        routeId={rotaId}
                        isEnRoute={isEnRoute}
                        isStarting={isStarting}
                        isStartingAttendance={isStartingAttendance}
                        isStartBlocked={isStartBlocked}
                        startBlockReason={startBlockReason}
                        onGoToLocation={handleGoToLocation}
                        onArrived={handleArrived}
                    />
                </Box>
            </Box>
        </ScreenBase >

    );
}
