import { useCallback } from 'react';

import { router } from 'expo-router';

import { Box, Button, ScreenBase, Text } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { formatAddressStreetNumber } from '@/domain/agility/address/dto';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';
import { useStopActions } from '../../_hooks/useStopActions';
import { Map } from '../shared/Map';

import { TransferStepHeader } from './TransferStepHeader';

/**
 * Tela inicial de uma perna do TRANSFER. O endereço (origem/destino) já vem
 * leg-aware via `effectiveAddress`. Na coleta dispara o start-attendance; na
 * entrega, a "chegada" é só um passo de UI (o serviço já está em atendimento).
 */
export function TransferEtapaInicial() {
    const { service, effectiveAddress, setEtapa, transferLeg, isServiceStarted } = useParada();
    const isPickup = transferLeg === 'pickup';

    const { handleStartService, handleStartAttendance, isStarting, isStartingAttendance } = useStopActions({
        serviceId: service?.id || '',
        routeId: service?.routingId || '',
        serviceStatus: service?.status,
        isServiceInProgress: service?.status === 'IN_PROGRESS',
        serviceStartDate: service?.startDate ? String(service.startDate) : null,
    });

    const nomeCliente = service?.fantasyName || service?.responsible || 'Cliente';

    const handleBack = useCallback(() => {
        router.back();
    }, []);

    const handleChegou = useCallback(() => {
        // Na coleta (origem), marca atendimento no backend (uma única vez por TRANSFER).
        // Na entrega (destino), o serviço já está IN_ATTENDANCE — só avança o passo.
        if (isPickup && !isServiceStarted) {
            handleStartAttendance();
        }
        setEtapa(2);
    }, [isPickup, isServiceStarted, handleStartAttendance, setEtapa]);

    return (
        <ScreenBase
            buttonLeft={<ButtonBack onPress={handleBack} />}
            title={
                <Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
                    {formatAddressStreetNumber(effectiveAddress)}
                </Text>
            }
        >
            <Box flex={1} backgroundColor="white">
                <Box scrollable style={{ paddingBottom: 32 }}>
                    <Box paddingTop="y24" paddingBottom="y4">
                        <TransferStepHeader leg={transferLeg} />

                        <Map
                            variant={isPickup ? 'coleta' : 'entrega'}
                            latitude={effectiveAddress?.latitude ?? null}
                            longitude={effectiveAddress?.longitude ?? null}
                            customerName={nomeCliente}
                        />

                        <Box backgroundColor="gray50" borderRadius="s12" padding="y16" borderWidth={measure.m1} borderColor="gray200" marginVertical="y12">
                            <Text preset="text13" color="gray600">
                                {isPickup ? 'Origem (coleta)' : 'Destino (entrega)'}
                            </Text>
                            <Text preset="text15" fontWeightPreset="bold" color="colorTextPrimary">
                                {formatAddressStreetNumber(effectiveAddress)}
                            </Text>
                            {service?.materials && service.materials.length > 0 && (
                                <Box flexDirection="row" alignItems="center" gap="x4" marginTop="y8">
                                    <Text preset="text13">📦</Text>
                                    <Text preset="text13" color="gray700">
                                        {service.materials.length} volumes
                                    </Text>
                                </Box>
                            )}
                        </Box>

                        <Box gap="y12" paddingBottom="y24" alignItems="center">
                            {isPickup && (
                                <Button
                                    title={isStarting ? 'Iniciando...' : 'Indo até a origem'}
                                    preset="outline"
                                    onPress={handleStartService}
                                    disabled={isStarting || isStartingAttendance}
                                    width={measure.x330}
                                />
                            )}
                            <Button
                                title={
                                    isStartingAttendance
                                        ? 'Iniciando...'
                                        : isPickup ? 'Cheguei na origem' : 'Cheguei no destino'
                                }
                                onPress={handleChegou}
                                disabled={isStarting || isStartingAttendance}
                                width={measure.x330}
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </ScreenBase>
    );
}
