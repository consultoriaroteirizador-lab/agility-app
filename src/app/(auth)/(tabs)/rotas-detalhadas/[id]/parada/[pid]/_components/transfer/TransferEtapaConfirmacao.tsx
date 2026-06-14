import { useCallback } from 'react';

import { router } from 'expo-router';

import { Box, Button, ScreenBase, Text } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { formatAddressStreetNumber } from '@/domain/agility/address/dto';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';
import { Map } from '../shared/Map';

import { TransferStepHeader } from './TransferStepHeader';

/**
 * Confirmação da ação da perna atual: "Carreguei?" (origem) ou "Entreguei?" (destino).
 */
export function TransferEtapaConfirmacao() {
    const { service, effectiveAddress, setEtapa, setDelivered, transferLeg, rotaId } = useParada();
    const isPickup = transferLeg === 'pickup';
    const nomeCliente = service?.fantasyName || service?.responsible || 'Cliente';

    const handleBack = useCallback(() => setEtapa(1), [setEtapa]);

    const handleConfirmar = useCallback(() => {
        setDelivered(true);
        setEtapa(3);
    }, [setDelivered, setEtapa]);

    const handleNao = useCallback(() => {
        router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}/parada/${service?.id}/nao-realizado`);
    }, [rotaId, service?.id]);

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
                    <Box paddingTop="y24" paddingBottom="y4" alignItems="center">
                        <Box width="100%">
                            <TransferStepHeader leg={transferLeg} />
                            <Map
                                variant={isPickup ? 'coleta' : 'entrega'}
                                latitude={effectiveAddress?.latitude ?? null}
                                longitude={effectiveAddress?.longitude ?? null}
                                customerName={nomeCliente}
                            />
                        </Box>

                        <Box gap="y12" paddingTop="y24" paddingBottom="y24" alignItems="center" width="100%">
                            <Button
                                width={measure.x330}
                                title={isPickup ? 'Carreguei a carga' : 'Entreguei'}
                                onPress={handleConfirmar}
                                borderRadius="s14"
                            />
                            <Button
                                width={measure.x330}
                                title={isPickup ? 'Não carreguei' : 'Não entreguei'}
                                preset="outline"
                                onPress={handleNao}
                                borderRadius="s14"
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </ScreenBase>
    );
}
