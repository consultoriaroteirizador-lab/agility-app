import { useCallback, useState } from 'react';

import { router } from 'expo-router';

import { Box, Button, ScreenBase, Text } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { TouchableOpacityBox } from '@/components/RestyleComponent/RestyleComponent';
import { formatAddressFull, formatAddressStreetNumber } from '@/domain/agility/address/dto';
import { formatHHmm } from '@/functions';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';
import { useStopActions } from '../../_hooks/useStopActions';
import { MaterialsModal } from '../shared/MaterialsModal';
import { StopRouteMap } from '../shared/StopRouteMap';

/**
 * Etapa 1: Tela inicial com "Indo pra lá" e "Estou aqui!"
 * Layout unificado com dados-servico
 */
export function EtapaInicial() {
    const { service, effectiveAddress, setEtapa, rotaId, startBlockReason } = useParada();
    const { showToast } = useToastService();
    const [showVolumesModal, setShowVolumesModal] = useState(false);
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

    const nomeCliente = service?.fantasyName || service?.responsible || 'Cliente';
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
                    <Box paddingTop="y24" paddingBottom="y4">
                        {/* Mapa — pino da parada + trecho até a próxima parada */}
                        <StopRouteMap
                            variant="entrega"
                            routeId={service?.routingId || rotaId}
                            serviceId={service?.id}
                            latitude={effectiveAddress?.latitude ?? null}
                            longitude={effectiveAddress?.longitude ?? null}
                            customerName={nomeCliente}
                        />

                        {/* Tag de tipo e horário */}
                        <Box flexDirection="row" gap="x8" marginBottom="y12">
                            <Box backgroundColor="primary10" paddingHorizontal="x12" paddingVertical="y4" borderRadius="s20">
                                <Text preset="text13" color="primary100">Entrega</Text>
                            </Box>
                            {service?.estimatedArrival && (
                                <Box backgroundColor="gray100" paddingHorizontal="x12" paddingVertical="y4" borderRadius="s20">
                                    <Text preset="text13" color="gray800">{formatHHmm(service.estimatedArrival)}</Text>
                                </Box>
                            )}
                        </Box>

                        {/* Informações do destinatário */}
                        <Box backgroundColor="gray50" borderRadius="s12" padding="y16" borderWidth={measure.m1} borderColor="gray200" marginBottom="y12">
                            <Box flexDirection="row" alignItems="center" gap="x8" marginBottom="y8">
                                <Box width={measure.x36} height={measure.y36} backgroundColor="gray300" borderRadius="s18" />
                                <Box flex={1}>
                                    <Text preset="text15" fontWeightPreset="bold" color="colorTextPrimary">
                                        {nomeCliente}
                                    </Text>
                                    {service?.identificationCode && (
                                        <Text preset="text13" color="gray400">
                                            #{service.identificationCode}
                                        </Text>
                                    )}
                                </Box>
                            </Box>

                            {/* Tags de volumes — toca para abrir a lista de itens */}
                            {service?.materials && service.materials.length > 0 && (
                                <Box flexDirection="row" gap="x8" marginTop="y8">
                                    <TouchableOpacityBox
                                        flexDirection="row"
                                        alignItems="center"
                                        gap="x4"
                                        paddingHorizontal="x12"
                                        paddingVertical="y6"
                                        backgroundColor="gray100"
                                        borderRadius="s20"
                                        onPress={() => setShowVolumesModal(true)}
                                    >
                                        <Text preset="text13">📦</Text>
                                        <Text preset="text13" color="gray700">
                                            {service.materials.length > 1 ? 'Volumes' : 'Volume'}
                                        </Text>
                                        <Text preset="text13" color="primary100">({service.materials.length})</Text>
                                    </TouchableOpacityBox>
                                </Box>
                            )}

                            {/* Endereço completo (header mantém só rua + número) */}
                            {effectiveAddress && (
                                <Box marginTop="y12">
                                    <Text preset="text13" fontWeightPreset="bold" color="gray600" marginBottom="y4">Endereço completo</Text>
                                    <Text preset="text13" color="gray700">{formatAddressFull(effectiveAddress)}</Text>
                                </Box>
                            )}

                            {service?.problemDescription && (
                                <Box marginTop="y12">
                                    <Text preset="text13" fontWeightPreset="bold" color="gray600" marginBottom="y4">Observação</Text>
                                    <Text preset="text13" color="gray700">{service.problemDescription}</Text>
                                </Box>
                            )}
                        </Box>

                        {/* Botões de ação */}
                        <Box gap="y12" paddingBottom="y24" alignItems='center'>
                            <Button
                                title={isStarting ? "Iniciando..." : isEnRoute ? "A caminho ✓" : "Indo pra lá"}
                                preset="outline"
                                onPress={handleGoToLocation}
                                disabled={isStarting || isStartingAttendance || isEnRoute || isStartBlocked}
                                width={measure.x330}
                            />
                            <Button
                                title={isStartingAttendance ? "Iniciando atendimento..." : "Estou aqui!"}
                                onPress={handleArrived}
                                disabled={isStarting || isStartingAttendance || isStartBlocked}
                                width={measure.x330}
                            />
                            {isStartBlocked && (
                                <Text preset="text13" color="redError" textAlign="center">
                                    {startBlockReason}
                                </Text>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>

            <MaterialsModal
                isVisible={showVolumesModal}
                onClose={() => setShowVolumesModal(false)}
                materials={service?.materials || []}
                title="Volumes"
            />
        </ScreenBase >

    );
}
