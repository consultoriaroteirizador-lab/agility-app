import { useState } from 'react';

import { Box, Button, Text } from '@/components';
import { TouchableOpacityBox } from '@/components/RestyleComponent/RestyleComponent';
import type { AddressResponse } from '@/domain/agility/address/dto';
import { formatAddressFull } from '@/domain/agility/address/dto';
import type { ServiceResponse } from '@/domain/agility/service/dto';
import { formatHHmm } from '@/functions';
import { measure } from '@/theme';

import { MaterialsModal } from './MaterialsModal';
import { StopRouteMap } from './StopRouteMap';

export interface StopArrivalViewProps {
    /** Serviço representante da parada (nota única, ou a 1ª nota do grupo). */
    service: ServiceResponse | null | undefined;
    effectiveAddress: AddressResponse | null;
    /** Fallback de `StopRouteMap.routeId` quando `service.routingId` ainda não chegou. */
    routeId?: string | null;
    /** "A caminho" (IN_PROGRESS) — já clicou "Indo pra lá", falta só "Estou aqui". */
    isEnRoute: boolean;
    isStarting: boolean;
    isStartingAttendance: boolean;
    /** Regras configuráveis da empresa (uma parada por vez / ordem obrigatória). */
    isStartBlocked: boolean;
    startBlockReason: string | null;
    /**
     * Já resolvidos pelo chamador (toast + checagem do bloqueio incluídos) — o
     * componente compartilhado só desabilita/exibe, não decide o gate.
     */
    onGoToLocation: () => void;
    onArrived: () => void;
    /**
     * Selo de contagem de notas, renderizado ao lado das tags de tipo/horário.
     * Vem de `formatNotasLabel` (`_utils/paradaDisplay.ts`), que já devolve
     * `null` para uma parada de uma nota — nesse caso a tela fica idêntica à de
     * hoje.
     */
    notasBadge?: string | null;
}

/**
 * Tela de chegada da parada: mapa, tags de tipo/horário, card do cliente
 * (nome, identificação, volumes, endereço completo, observação) e os botões
 * "Indo pra lá" / "Estou aqui!". Compartilhada entre `EtapaInicial` (fluxo de
 * uma nota) e o índice da parada agrupada (Camada 3) — os dois divergem só
 * DEPOIS de "Estou aqui", nunca na chegada em si.
 *
 * Recebe tudo por props e não lê `useParada()`: o índice da parada agrupada
 * não tem `ParadaProvider` montado, e é justamente ele que precisa reusar esta
 * tela. Mantém internamente só o que é seu — o estado do modal de volumes.
 */
export function StopArrivalView({
    service,
    effectiveAddress,
    routeId,
    isEnRoute,
    isStarting,
    isStartingAttendance,
    isStartBlocked,
    startBlockReason,
    onGoToLocation,
    onArrived,
    notasBadge,
}: StopArrivalViewProps) {
    const [showVolumesModal, setShowVolumesModal] = useState(false);

    const nomeCliente = service?.fantasyName || service?.responsible || 'Cliente';

    return (
        <>
            <Box paddingTop="y24" paddingBottom="y4">
                {/* Mapa — pino da parada + trecho até a próxima parada */}
                <StopRouteMap
                    variant="entrega"
                    routeId={service?.routingId || routeId}
                    serviceId={service?.id}
                    latitude={effectiveAddress?.latitude ?? null}
                    longitude={effectiveAddress?.longitude ?? null}
                    customerName={nomeCliente}
                />

                {/* Tag de tipo e horário (+ selo de notas, quando a parada é agrupada) */}
                <Box flexDirection="row" gap="x8" marginBottom="y12">
                    <Box backgroundColor="primary10" paddingHorizontal="x12" paddingVertical="y4" borderRadius="s20">
                        <Text preset="text13" color="primary100">Entrega</Text>
                    </Box>
                    {service?.estimatedArrival && (
                        <Box backgroundColor="gray100" paddingHorizontal="x12" paddingVertical="y4" borderRadius="s20">
                            <Text preset="text13" color="gray800">{formatHHmm(service.estimatedArrival)}</Text>
                        </Box>
                    )}
                    {notasBadge && (
                        <Box backgroundColor="gray100" paddingHorizontal="x12" paddingVertical="y4" borderRadius="s20">
                            <Text preset="text13" color="gray800">{notasBadge}</Text>
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
                        onPress={onGoToLocation}
                        disabled={isStarting || isStartingAttendance || isEnRoute || isStartBlocked}
                        width={measure.x330}
                    />
                    <Button
                        title={isStartingAttendance ? "Iniciando atendimento..." : "Estou aqui!"}
                        onPress={onArrived}
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

            <MaterialsModal
                isVisible={showVolumesModal}
                onClose={() => setShowVolumesModal(false)}
                materials={service?.materials || []}
                title="Volumes"
            />
        </>
    );
}
