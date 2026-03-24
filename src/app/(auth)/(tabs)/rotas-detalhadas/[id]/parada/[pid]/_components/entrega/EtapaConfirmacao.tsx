import { useCallback } from 'react';
import { Linking } from 'react-native';

import { router } from 'expo-router';

import { Box, Button, LocalIcon, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { Icon } from '@/components/Icon/Icon';
import { formatAddressComplement, formatAddressStreetNumber } from '@/domain/agility/address/dto';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';
import { Map } from '../shared/Map';

/**
 * Etapa 2: "Entreguei" e "Não entreguei"
 * Layout unificado com dados-servico
 */
export function EtapaConfirmacao() {
    const { service, setEtapa, setDelivered, isServiceStarted, rotaId } = useParada();

    const nomeCliente = service?.fantasyName || service?.responsible || 'Cliente';

    const handleBack = useCallback(() => {
        if (isServiceStarted) {
            router.back();
        } else {
            setEtapa(1);
        }
    }, [isServiceStarted, setEtapa]);

    const handleEntreguei = useCallback(() => {
        console.log('[EtapaConfirmacao] Clicou em Entreguei');
        try {
            setDelivered(true);
            setEtapa(3);
            console.log('[EtapaConfirmacao] Estado atualizado para etapa 3');
        } catch (error) {
            console.error('[EtapaConfirmacao] Erro ao atualizar estado:', error);
        }
    }, [setDelivered, setEtapa]);

    const handleNaoEntreguei = useCallback(() => {
        console.log('[EtapaConfirmacao] Clicou em Não entreguei');
        router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}/parada/${service?.id}/nao-realizado`);
    }, [rotaId, service?.id]);

    return (
        <ScreenBase
            buttonLeft={<ButtonBack onPress={handleBack} />}
            title={
                <Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
                    {formatAddressStreetNumber(service?.address)}
                </Text>
            }
        >
            <Box flex={1} backgroundColor="white">
                <Text
                    preset="text14"
                    fontWeightPreset="bold"
                    color="colorTextPrimary"
                    style={{ textAlign: 'center', width: '100%' }}
                >
                    {formatAddressComplement(service?.address)}
                </Text>

                <Box scrollable style={{ paddingBottom: 32 }}>
                    <Box
                        paddingTop="y24"
                        paddingBottom="y4"
                        alignItems="center"
                    >
                        {/* Mapa */}
                        <Box width="100%">
                            <Map
                                variant="entrega"
                                latitude={service?.address?.latitude ?? null}
                                longitude={service?.address?.longitude ?? null}
                                customerName={nomeCliente}
                            />
                        </Box>

                        {/* Informações do destinatário */}
                        <Box
                            borderRadius="s12"
                            padding="y16"
                            marginBottom="y12"
                            width="100%"
                        >
                            <Box flexDirection="row" alignItems="center" justifyContent="space-between">
                                <Box flexDirection="row" alignItems="center" gap="x8" flex={1}>
                                    <Box>
                                        <LocalIcon iconName='iconUser' size={measure.m20} />
                                    </Box>
                                    <Box flex={1}>
                                        <Text
                                            preset="text15"
                                            fontWeightPreset="bold"
                                            color="colorTextPrimary"
                                        >
                                            {nomeCliente}
                                        </Text>
                                        {service?.identificationCode && (
                                            <Text preset="text13" color="gray400">
                                                #{service.identificationCode}
                                            </Text>
                                        )}
                                    </Box>
                                </Box>

                                <Box flexDirection="row" gap="x8">
                                    {/* Botão de Chat/Suporte */}
                                    <TouchableOpacityBox
                                        backgroundColor="primary100"
                                        padding="y8"
                                        paddingHorizontal="x8"
                                        borderRadius="s8"
                                        borderWidth={1}
                                        borderColor="primary20"
                                        onPress={() => {
                                            router.push('/(auth)/(tabs)/menu/suporte');
                                        }}
                                    >
                                        <Icon name="chat" size={measure.m20} color="white" />
                                    </TouchableOpacityBox>

                                    {/* Botão de Telefone */}
                                    {service?.clientPhone && (
                                        <TouchableOpacityBox
                                            backgroundColor="primary100"
                                            padding="y8"
                                            paddingHorizontal="x8"
                                            borderRadius="s12"
                                            borderWidth={1}
                                            borderColor="tertiary100"
                                            onPress={() => {
                                                Linking.openURL(`tel:${service.clientPhone}`);
                                            }}
                                        >
                                            <Icon name="phone" size={measure.m20} color="white" />
                                        </TouchableOpacityBox>
                                    )}
                                </Box>
                            </Box>
                            {service?.materials &&
                                <Box alignItems='center' mt='t6' justifyContent='center' gap='x8' padding='m14' borderRadius='s18' backgroundColor='gray50' width={measure.x150} flexDirection='row' height={measure.y50}>
                                    <Text preset="text13">📦</Text>
                                    <Box flexDirection='row' gap='x8' >
                                        <Text>{service?.materials?.length}</Text>
                                        <Text>volumes</Text>
                                    </Box>

                                </Box>
                            }

                        </Box>
                        {
                            service?.description && (
                                <Box mb='b14' padding='m14' borderRadius='s10' backgroundColor='gray50' width={"100%"} height={"auto"} gap='y8'>
                                    <Text fontWeightPreset='semibold'>
                                        Observação
                                    </Text>
                                    <Text preset='text14'>
                                        {service?.description}
                                    </Text>
                                </Box>
                            )
                        }


                        {/* Botões de ação */}
                        <Box gap="y12" paddingBottom="y24" alignItems='center'>
                            <Button
                                width={measure.x330}
                                title="Entreguei"
                                onPress={handleEntreguei}
                                borderRadius='s14'
                            />
                            <Button
                                width={measure.x330}
                                title="Não entreguei"
                                preset="outline"
                                onPress={handleNaoEntreguei}
                                borderRadius='s14'
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </ScreenBase >
    );
}