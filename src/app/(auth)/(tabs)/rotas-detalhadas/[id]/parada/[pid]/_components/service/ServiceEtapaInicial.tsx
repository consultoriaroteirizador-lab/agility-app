import { useCallback, useState } from 'react';

import { router } from 'expo-router';

import { Box, Button, ScreenBase, Text } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { TouchableOpacityBox } from '@/components/RestyleComponent/RestyleComponent';
import { formatAddressStreetNumber } from '@/domain/agility/address/dto';
import { formatHHmm } from '@/functions';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';
import { useStopActions } from '../../_hooks/useStopActions';
import { MaterialsModal } from '../shared/MaterialsModal';
import { StopRouteMap } from '../shared/StopRouteMap';

export function ServiceEtapaInicial() {
    const { service, effectiveAddress, setEtapa, rotaId } = useParada();
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const { handleStartService, handleStartAttendance, isStarting, isStartingAttendance } = useStopActions({
        serviceId: service?.id || '',
        routeId: service?.routingId || '',
        serviceStatus: service?.status,
        isServiceInProgress: service?.status === 'IN_PROGRESS',
        serviceStartDate: service?.startDate ? String(service.startDate) : null,
        onSuccess: () => {},
    });

    const customerName = service?.fantasyName || service?.responsible || 'Cliente';

    const handleBack = useCallback(() => {
        router.back();
    }, []);

    return (

        <ScreenBase buttonLeft={<ButtonBack onPress={handleBack} />} title={<Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
            {formatAddressStreetNumber(effectiveAddress)}
        </Text>}>
            <Box flex={1} backgroundColor="white">
                <Box scrollable style={{ paddingBottom: 32 }}>
                    <Box paddingTop="y24" paddingBottom="y4">
                        <StopRouteMap
                            variant="service"
                            routeId={service?.routingId || rotaId}
                            serviceId={service?.id}
                            latitude={effectiveAddress?.latitude ?? null}
                            longitude={effectiveAddress?.longitude ?? null}
                            customerName={customerName}
                        />

                        <Box flexDirection="row" gap="x8" marginBottom="y12">
                            <Box backgroundColor="primary10" paddingHorizontal="x12" paddingVertical="y4" borderRadius="s20">
                                <Text preset="text13" color="primary100">Serviço</Text>
                            </Box>
                            {service?.estimatedArrival && (
                                <Box backgroundColor="gray100" paddingHorizontal="x12" paddingVertical="y4" borderRadius="s20">
                                    <Text preset="text13" color="gray800">{formatHHmm(service.estimatedArrival)}</Text>
                                </Box>
                            )}
                        </Box>

                        <Box backgroundColor="gray50" borderRadius="s12" padding="y16" borderWidth={measure.m1} borderColor="gray200" marginBottom="y12">
                            <Box flexDirection="row" alignItems="center" gap="x8" marginBottom="y8">
                                <Box width={measure.x36} height={measure.y36} backgroundColor="gray300" borderRadius="s18" />
                                <Box flex={1}>
                                    <Text preset="text15" fontWeightPreset="bold" color="colorTextPrimary">
                                        {customerName}
                                    </Text>
                                    {service?.identificationCode && (
                                        <Text preset="text13" color="gray400">
                                            #{service.identificationCode}
                                        </Text>
                                    )}
                                </Box>
                            </Box>

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
                                        onPress={() => setShowMaterialModal(true)}
                                    >
                                        <Text preset="text13">🔧</Text>
                                        <Text preset="text13" color="gray700">Materiais</Text>
                                        <Text preset="text13" color="primary100">({service.materials.length})</Text>
                                    </TouchableOpacityBox>
                                </Box>
                            )}

                            {service?.problemDescription && (
                                <Box marginTop="y12">
                                    <Text preset="text13" fontWeightPreset="bold" color="gray600" marginBottom="y4">Observação</Text>
                                    <Text preset="text13" color="gray700">{service.problemDescription}</Text>
                                </Box>
                            )}
                        </Box>

                        <Box gap="y12" paddingBottom="y24" alignItems='center'>
                            <Button
                                title={isStarting ? "Iniciando..." : "Indo pra lá"}
                                preset="outline"
                                onPress={handleStartService}
                                disabled={isStarting || isStartingAttendance}
                                width={measure.x330}
                            />
                            <Button
                                title={isStartingAttendance ? "Iniciando atendimento..." : "Estou aqui!"}
                                onPress={() => {
                                    handleStartAttendance();
                                    setEtapa(2);
                                }}
                                disabled={isStarting || isStartingAttendance}
                                width={measure.x330}
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>

            <MaterialsModal
                isVisible={showMaterialModal}
                onClose={() => setShowMaterialModal(false)}
                materials={service?.materials || []}
            />
        </ScreenBase>

    );
}