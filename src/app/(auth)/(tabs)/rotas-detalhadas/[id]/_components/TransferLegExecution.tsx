import { useState } from 'react';

import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { ActivityIndicator, Box, Button, Input, LocalIcon, ScreenBase, Text } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { useRoutingHandoff } from '@/domain/agility/routing/useCase/useRoutingHandoff';
import { uploadBase64Signature, uploadMultipleServicePhotos } from '@/domain/agility/service/serviceUploadUtils';
import { measure } from '@/theme';

import { useRota } from '../_context/RotaContext';

/**
 * Tela de execução de um trecho de TRANSFERÊNCIA (malha de cross-docking).
 *
 * Diferente da parada comum (ParadaContext, escopada a um serviço), aqui a
 * routing inteira é um único "trecho" CD origem → CD destino: não há
 * paradas individuais para o motorista concluir, apenas a entrega em bloco
 * do lote de carga no CD de destino. Por isso o estado é local (não usa
 * ParadaContext) e a ação chama useRoutingHandoff → POST /routings/:id/handoff.
 */
export function TransferLegExecution() {
  const { routing, paradas } = useRota();

  const [receivedBy, setReceivedBy] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { handoff } = useRoutingHandoff({
    onSuccess: () => {
      setDone(true);
      setTimeout(() => router.replace('/(auth)/(tabs)'), 2000);
    },
    onError: () => setSubmitting(false),
  });

  const canSubmit = receivedBy.trim().length > 0 && (photos.length > 0 || !!signature);

  async function onConfirm() {
    if (!routing || !canSubmit || submitting) return;
    setSubmitting(true);

    const [photoUrls, signatureUrl] = await Promise.all([
      photos.length
        ? uploadMultipleServicePhotos(photos, routing.id).catch(() => [] as string[])
        : Promise.resolve([] as string[]),
      signature
        ? uploadBase64Signature(signature, routing.id).catch(() => null)
        : Promise.resolve<string | null>(null),
    ]);

    handoff({
      id: routing.id,
      payload: {
        proof: {
          receivedBy: receivedBy.trim(),
          photoProof: photoUrls.length ? photoUrls : undefined,
          signature: signatureUrl ?? undefined,
        },
      },
    });
  }

  if (done) {
    return (
      <Box flex={1} backgroundColor="primary100" justifyContent="center" alignItems="center" px="x24">
        <LocalIcon iconName="check" size={measure.m40} color="white" />
        <Text preset="text18" color="white" textAlign="center" mt="y16">
          Transferência concluída{'\n'}com sucesso
        </Text>
      </Box>
    );
  }

  if (!routing) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <ActivityIndicator />
        <Text mt="y16">Carregando trecho...</Text>
      </Box>
    );
  }

  const origem = routing.originFacilityName || 'Origem';
  const destino = routing.destinationFacilityName || routing.name || 'Destino';

  return (
    <ScreenBase
      scrollable
      buttonLeft={<ButtonBack />}
      title={
        <Text preset="text16" fontWeightPreset="semibold" color="colorTextPrimary" textAlign="center">
          Transferência
        </Text>
      }
    >
      <Box flex={1} pt="y8" gap="y16">
        {/* Cabeçalho: CD origem → CD destino */}
        <Box backgroundColor="secondary10" p="y12" borderRadius="s12" gap="y8">
          <Box flexDirection="row" alignItems="center" gap="x8">
            <LocalIcon iconName="location" size={measure.m20} color="secondary100" />
            <Box flex={1}>
              <Text preset="text12" color="gray600">
                Trecho de transferência
              </Text>
              <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                {origem} → {destino}
              </Text>
            </Box>
          </Box>
          <Text preset="text13" color="gray600">
            Registre a entrega do lote de carga neste CD para liberar a custódia do próximo trecho.
          </Text>
        </Box>

        {/* Lote de carga (conferência visual) */}
        <Box gap="y8">
          <Text preset="text14" fontWeightPreset="bold" color="gray600">
            Lote da carga ({paradas.length} pedido{paradas.length === 1 ? '' : 's'})
          </Text>

          {paradas.length === 0 ? (
            <Box backgroundColor="gray50" p="y12" borderRadius="s12">
              <Text preset="text14" color="gray600">
                Nenhum pedido no lote deste trecho.
              </Text>
            </Box>
          ) : (
            paradas.map((parada) => (
              <Box
                key={parada.serviceId}
                flexDirection="row"
                alignItems="center"
                gap="x12"
                backgroundColor="gray50"
                p="y12"
                borderRadius="s12"
                borderWidth={1}
                borderColor="gray100"
              >
                <LocalIcon iconName="box" size={measure.m20} color="gray400" />
                <Box flex={1}>
                  <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                    {parada.nome}
                  </Text>
                  <Text preset="text12" color="gray600">
                    {parada.endereco}
                  </Text>
                </Box>
              </Box>
            ))
          )}
        </Box>

        {/* Comprovante: quem recebeu + foto/assinatura */}
        <Box gap="y8">
          <Text preset="text14" fontWeightPreset="bold" color="gray600">
            Comprovante de recebimento
          </Text>

          <Input
            title="Nome de quem recebeu no CD *"
            placeholder="Nome do recebedor"
            value={receivedBy}
            onChangeText={setReceivedBy}
            width="auto"
          />

          <MultiPhotoPicker
            photos={photos}
            onPhotosChange={setPhotos}
            label="Foto da carga (opcional se houver assinatura)"
            maxPhotos={5}
            allowCamera
          />

          <Box>
            <Text preset="text12" color="gray600" mb="b4">
              Assinatura (opcional se houver foto)
            </Text>
            <SignatureCanvas
              onSave={setSignature}
              onClear={() => setSignature(null)}
              height={measure.y200}
              penColor="black"
              backgroundColor="white"
            />
            {signature ? (
              <Text preset="text12" color="primary100" mt="t4">
                Assinatura registrada.
              </Text>
            ) : null}
          </Box>
        </Box>

        {/* Ação */}
        <Box gap="y12" pb="y24" alignItems="center">
          <Button
            title="Registrar entrega da carga"
            onPress={onConfirm}
            disabled={!canSubmit || submitting}
            isLoading={submitting}
          />
          {!canSubmit ? (
            <Text preset="text12" color="gray500" textAlign="center">
              * Informe quem recebeu e anexe uma foto ou assinatura para concluir.
            </Text>
          ) : null}
        </Box>
      </Box>
    </ScreenBase>
  );
}
