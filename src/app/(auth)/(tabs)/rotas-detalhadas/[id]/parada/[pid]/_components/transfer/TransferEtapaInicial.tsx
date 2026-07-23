import { useCallback, useState } from 'react';

import { router } from 'expo-router';

import { Box, Button, ScreenBase, Text } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { TouchableOpacityBox } from '@/components/RestyleComponent/RestyleComponent';
import { formatAddressFull, formatAddressStreetNumber } from '@/domain/agility/address/dto';
import { resolveCodeRequirement } from '@/domain/agility/service/codeGate';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';
import { useStopActions } from '../../_hooks/useStopActions';
import { Map } from '../shared/Map';
import { MaterialsModal } from '../shared/MaterialsModal';
import { PickupCodeCard } from '../shared/PickupCodeCard';

import { TransferStepHeader } from './TransferStepHeader';

/**
 * Tela inicial de uma perna do TRANSFER. O endereço (origem/destino) já vem
 * leg-aware via `effectiveAddress`. Na coleta dispara o start-attendance; na
 * entrega, a "chegada" é só um passo de UI (o serviço já está em atendimento).
 */
export function TransferEtapaInicial() {
    const {
        service,
        effectiveAddress,
        setEtapa,
        transferLeg,
        isServiceStarted,
        startBlockReason,
        pickupCode,
        pickupBypassReasonCode,
        pickupBypassReasonText,
    } = useParada();
    const { showToast } = useToastService();
    const isPickup = transferLeg === 'pickup';
    // Gating só na perna de coleta (origem), onde a parada é efetivamente iniciada.
    const isStartBlocked = isPickup && startBlockReason !== null;
    const [showVolumesModal, setShowVolumesModal] = useState(false);

    // Código de confirmação de retirada (T4) — só aplica na perna de coleta (origem).
    const pickupGate = resolveCodeRequirement(service, 'PICKUP');
    const pickupBypassValid =
        !!pickupBypassReasonCode && (pickupBypassReasonCode !== 'OUTRO' || pickupBypassReasonText.trim().length > 0);

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

    const handleIndoOrigem = useCallback(() => {
        if (isStartBlocked) {
            showToast({ message: startBlockReason!, type: 'error' });
            return;
        }
        handleStartService();
    }, [isStartBlocked, startBlockReason, showToast, handleStartService]);

    const handleChegou = useCallback(async () => {
        if (isStartBlocked) {
            showToast({ message: startBlockReason!, type: 'error' });
            return;
        }

        // Na coleta (origem), marca atendimento no backend (uma única vez por TRANSFER).
        // Na entrega (destino), o serviço já está IN_ATTENDANCE — só avança o passo.
        if (isPickup && !isServiceStarted) {
            if (pickupGate.required) {
                const pickupCodeFilled = pickupCode.trim().length === 4;
                const pending = !pickupCodeFilled && !(pickupGate.allowBypass && pickupBypassValid);
                if (pending) {
                    showToast({ message: 'Informe o código de retirada ou o motivo.', type: 'error' });
                    return;
                }
                const args = pickupCodeFilled
                    ? { pickupCode: pickupCode.trim() }
                    : { reasonCode: pickupBypassReasonCode!, reasonText: pickupBypassReasonText.trim() || undefined };
                const ok = await handleStartAttendance(args);
                if (!ok) return;
                setEtapa(2);
                return;
            }
            // Sem código exigido: mantém o comportamento otimista de sempre (igual ao
            // Coleta e ao pré-feature) — fire-and-forget, não bloqueia por falha aqui.
            void handleStartAttendance();
            setEtapa(2);
            return;
        }

        setEtapa(2);
    }, [
        isStartBlocked,
        startBlockReason,
        showToast,
        isPickup,
        isServiceStarted,
        pickupGate.required,
        pickupGate.allowBypass,
        pickupCode,
        pickupBypassValid,
        pickupBypassReasonCode,
        pickupBypassReasonText,
        handleStartAttendance,
        setEtapa,
    ]);

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

                            {/* Endereço completo (header mantém só rua + número) */}
                            {effectiveAddress && (
                                <Text preset="text13" color="gray700" marginTop="y4">
                                    {formatAddressFull(effectiveAddress)}
                                </Text>
                            )}

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
                        </Box>

                        {isPickup && pickupGate.required && !isServiceStarted && (
                            <PickupCodeCard allowBypass={pickupGate.allowBypass} />
                        )}

                        <Box gap="y12" paddingBottom="y24" alignItems="center">
                            {isPickup && (
                                <Button
                                    title={isStarting ? 'Iniciando...' : 'Indo até a origem'}
                                    preset="outline"
                                    onPress={handleIndoOrigem}
                                    disabled={isStarting || isStartingAttendance || isStartBlocked}
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
        </ScreenBase>
    );
}
