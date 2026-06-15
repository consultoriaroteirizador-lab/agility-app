import { useCallback, useState } from 'react';
import { Image as RNImage, Modal as RNModal, Pressable } from 'react-native';

import { router } from 'expo-router';

import { Box, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { formatAddressStreetNumber } from '@/domain/agility/address/dto';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';

/**
 * Tela read-only de uma parada já FINALIZADA (COMPLETED/FAILED/CANCELED).
 *
 * Substitui a tela inicial "Indo pra lá / Estou aqui" quando o serviço já foi
 * concluído — evita reabrir o fluxo de execução de algo que já terminou (ex.:
 * acesso via notificação SERVICE_COMPLETED ou pela aba "Concluído").
 */
export function EtapaConcluida() {
    const { service, effectiveAddress } = useParada();

    const isSucesso = service?.isCompleted === true;
    const nomeCliente = service?.fantasyName || service?.responsible || 'Cliente';
    const completedAt = service?.completedAt ? new Date(service.completedAt) : null;

    // Comprovação de entrega (read-only): URLs S3 salvas na finalização.
    const photos = (service?.photoProof ?? []).filter(Boolean);
    const signature = service?.customerSignature || null;

    // Visualizador em tela cheia (toque na miniatura/assinatura).
    const [viewerUri, setViewerUri] = useState<string | null>(null);

    const handleBack = useCallback(() => {
        router.back();
    }, []);

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
              <Box scrollable style={{ paddingTop: 24, paddingBottom: 32 }}>
                {/* Badge de desfecho */}
                <Box
                    backgroundColor={isSucesso ? 'tertiary10' : 'redError'}
                    padding="y16"
                    borderRadius="s12"
                    alignItems="center"
                    marginBottom="y16"
                >
                    <Text
                        preset="text16"
                        fontWeightPreset="bold"
                        color={isSucesso ? 'tertiary100' : 'white'}
                    >
                        {isSucesso ? 'Parada concluída com sucesso' : 'Parada não realizada'}
                    </Text>
                </Box>

                {/* Resumo do cliente / parada */}
                <Box
                    backgroundColor="gray50"
                    borderRadius="s12"
                    padding="y16"
                    borderWidth={measure.m1}
                    borderColor="gray200"
                    gap="y8"
                >
                    <Text preset="text15" fontWeightPreset="bold" color="colorTextPrimary">
                        {nomeCliente}
                    </Text>
                    {service?.identificationCode && (
                        <Text preset="text13" color="gray400">
                            #{service.identificationCode}
                        </Text>
                    )}

                    {completedAt && (
                        <Box flexDirection="row" gap="x4">
                            <Text preset="text13" fontWeightPreset="bold" color="gray600">
                                Finalizado em:
                            </Text>
                            <Text preset="text13" color="gray700">
                                {completedAt.toLocaleString('pt-BR')}
                            </Text>
                        </Box>
                    )}

                    {!!service?.receivedBy && (
                        <Box flexDirection="row" gap="x4">
                            <Text preset="text13" fontWeightPreset="bold" color="gray600">
                                Recebido por:
                            </Text>
                            <Text preset="text13" color="gray700">
                                {service.receivedBy}
                            </Text>
                        </Box>
                    )}

                    {!!service?.completionNotes && (
                        <Box gap="y4" marginTop="y4">
                            <Text preset="text13" fontWeightPreset="bold" color="gray600">
                                Observação
                            </Text>
                            <Text preset="text13" color="gray700">
                                {service.completionNotes}
                            </Text>
                        </Box>
                    )}
                </Box>

                {/* Comprovação de entrega (fotos + assinatura) */}
                {(photos.length > 0 || !!signature) && (
                    <Box marginTop="y16" gap="y12">
                        <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary">
                            Comprovação
                        </Text>

                        {photos.length > 0 && (
                            <Box>
                                <Text preset="text13" color="gray600" marginBottom="y8">
                                    Fotos
                                </Text>
                                <Box flexDirection="row" gap="x12" flexWrap="wrap">
                                    {photos.map((uri, index) => (
                                        <TouchableOpacityBox
                                            key={`${uri}-${index}`}
                                            onPress={() => setViewerUri(uri)}
                                        >
                                            <RNImage
                                                source={{ uri }}
                                                style={{ width: 90, height: 90, borderRadius: 8 }}
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacityBox>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {!!signature && (
                            <Box>
                                <Text preset="text13" color="gray600" marginBottom="y8">
                                    Assinatura
                                </Text>
                                <TouchableOpacityBox
                                    backgroundColor="white"
                                    borderWidth={measure.m1}
                                    borderColor="gray200"
                                    borderRadius="s8"
                                    padding="y8"
                                    onPress={() => setViewerUri(signature)}
                                >
                                    <RNImage
                                        source={{ uri: signature }}
                                        style={{ width: '100%', height: 140 }}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacityBox>
                            </Box>
                        )}
                    </Box>
                )}

                <Text preset="text13" color="gray400" textAlign="center" marginTop="y16">
                    Esta parada já foi finalizada (somente leitura).
                </Text>
              </Box>

              {/* Visualizador em tela cheia */}
              <RNModal
                visible={!!viewerUri}
                transparent
                animationType="fade"
                onRequestClose={() => setViewerUri(null)}
              >
                <Pressable
                  onPress={() => setViewerUri(null)}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.95)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 16,
                  }}
                >
                  {!!viewerUri && (
                    <RNImage
                      source={{ uri: viewerUri }}
                      style={{ width: '100%', height: '85%' }}
                      resizeMode="contain"
                    />
                  )}
                  <Text preset="text14" color="white" textAlign="center" marginTop="y16">
                    Toque para fechar
                  </Text>
                </Pressable>
              </RNModal>
            </Box>
        </ScreenBase>
    );
}
