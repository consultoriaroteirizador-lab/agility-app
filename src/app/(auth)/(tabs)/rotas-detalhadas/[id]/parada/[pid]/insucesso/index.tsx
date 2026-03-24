import { useState, useEffect } from 'react';
import { ScrollView, Image as RNImage, Platform } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Box, Button, Text, TouchableOpacityBox, ActivityIndicator, ScreenBase, Input } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { FailureReason } from '@/domain/agility/service/dto';
import { uploadMultipleServicePhotos } from '@/domain/agility/service/serviceUploadUtils';
import { useFailService, useFindOneService } from '@/domain/agility/service/useCase';
import { KEY_SERVICES } from '@/domain/queryKeys';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

const FAILURE_REASONS = [
  { value: FailureReason.RECIPIENT_ABSENT, label: 'Destinatário ausente' },
  { value: FailureReason.WRONG_ADDRESS, label: 'Endereço incorreto' },
  { value: FailureReason.ACCESS_DENIED, label: 'Acesso negado' },
  { value: FailureReason.RECIPIENT_REFUSED, label: 'Destinatário recusou' },
  { value: FailureReason.VEHICLE_ISSUE, label: 'Problema com veículo' },
  { value: FailureReason.WEATHER_CONDITIONS, label: 'Condições climáticas' },
  { value: FailureReason.TIME_EXCEEDED, label: 'Tempo excedido' },
  { value: FailureReason.OTHER, label: 'Outro' },
];

export default function FalhaScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
  const rotaId = id as string;
  const serviceId = pid as string;
  const { showToast } = useToastService();

  const { service, isLoading: isLoadingService } = useFindOneService(serviceId || '');
  const [selectedReason, setSelectedReason] = useState<FailureReason | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { failService, isLoading: isFailingService } = useFailService({
    onSuccess: async () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] });
      queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });

      // Aguardar refetch explícito para garantir que os dados sejam atualizados
      await queryClient.refetchQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });

      // Navegar de volta para a rota após atualizar os dados
      // Pequeno delay para garantir que a UI seja atualizada
      setTimeout(() => {
        router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}`);
      }, 500);
    },
    onError: (error) => {
      setIsSubmitting(false);
      console.error('Erro ao marcar como insucesso:', error);
      showToast({ message: 'Não foi possível marcar o serviço como insucesso. Tente novamente.', type: 'error' });
    },
  });

  // Solicitar permissões de mídia
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        await ImagePicker.requestCameraPermissionsAsync();
      }
    })();
  }, []);

  // Função para selecionar imagem da galeria
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0]]);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      showToast({ message: 'Não foi possível selecionar a imagem.', type: 'error' });
    }
  };

  // Função para tirar foto com a câmera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast({ message: 'Precisamos de permissão para usar a câmera!', type: 'error' });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0]]);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      showToast({ message: 'Não foi possível tirar a foto.', type: 'error' });
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      showToast({ message: 'Por favor, selecione um motivo para o insucesso.', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar payload
      const payload: {
        reason: FailureReason;
        notes?: string;
        photoProof?: string[];
      } = {
        reason: selectedReason,
      };

      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      if (photos.length > 0) {
        // Fazer upload das photos e obter URLs
        console.log('[Insucesso] Iniciando upload de photos:', {
          photosCount: photos.length,
          serviceId,
          photos: photos.map(f => ({ uri: f.uri, type: f.type })),
        });

        const photoUrls = await uploadMultipleServicePhotos(
          photos,
          serviceId,
          'before',
        );

        console.log('[Insucesso] Upload concluído:', { photoUrls });

        if (photoUrls.length > 0) {
          payload.photoProof = photoUrls;
        }
      }

      failService({
        id: serviceId,
        payload,
      });
    } catch (error) {
      console.error('[Insucesso] Erro ao fazer upload das photos:', error);

      // Verificar se é erro de S3 não configurado
      const errorMessage = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      const errorStatus = (error as { response?: { status?: number } })?.response?.status;

      console.error('[Insucesso] Detalhes do erro:', {
        errorMessage,
        errorStatus,
        errorData: (error as { response?: { data?: unknown } })?.response?.data,
      });

      setIsSubmitting(false);

      if (errorMessage?.includes('S3 storage is required')) {
        console.warn('[Insucesso] S3 não configurado - continuando sem photos');
        // Continuar sem as photos - tentar enviar apenas o motivo e notas
        const payloadWithoutPhotos: {
          reason: FailureReason;
          notes?: string;
        } = {
          reason: selectedReason,
        };
        if (notes.trim()) {
          payloadWithoutPhotos.notes = notes.trim();
        }
        failService({
          id: serviceId,
          payload: payloadWithoutPhotos,
        });
      } else {
        showToast({ message: 'Não foi possível fazer upload das photos. Tente novamente.', type: 'error' });
      }
    }
  };

  if (isLoadingService) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator />
        <Text mt="y16">Carregando...</Text>
      </Box>
    );
  }

  return (
    <ScreenBase buttonLeft={<ButtonBack />} title={
      <Text preset="textTitleScreen" >
        Registrar insucesso
      </Text>
    }>
      <Box flex={1} backgroundColor="white">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>


          <Box gap="y24" pt="y16">
            <Box>
              <Text preset="text16" fontWeightPreset='semibold' color="colorTextPrimary" mb="y12">
                Motivo do insucesso *
              </Text>
              <Box gap="y8">
                {FAILURE_REASONS.map((reason) => (
                  <TouchableOpacityBox
                    key={reason.value}
                    onPress={() => setSelectedReason(reason.value)}
                    flexDirection="row"
                    alignItems="center"
                    gap="x12"
                    p="y16"
                    borderWidth={measure.m2}
                    borderColor={selectedReason === reason.value ? 'primary100' : 'gray200'}
                    borderRadius="s12"
                    backgroundColor={selectedReason === reason.value ? 'primary10' : 'white'}
                  >
                    <Box
                      width={measure.x24}
                      height={measure.y24}
                      borderRadius="s12"
                      borderWidth={measure.m2}
                      borderColor={selectedReason === reason.value ? 'primary100' : 'gray400'}
                      backgroundColor={selectedReason === reason.value ? 'primary100' : 'transparent'}
                      justifyContent="center"
                      alignItems="center"
                    >
                      {selectedReason === reason.value && (
                        <Box width={measure.x12} height={measure.y12} borderRadius="s6" backgroundColor="white" />
                      )}
                    </Box>
                    <Text preset="text16" color="colorTextPrimary" fontWeight={selectedReason === reason.value ? '500' : '400'}>
                      {reason.label}
                    </Text>
                  </TouchableOpacityBox>
                ))}
              </Box>
            </Box>

            <Box>
              <Text preset="text16" fontWeightPreset='semibold' color="colorTextPrimary" mb="y8">
                Observações
              </Text>
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder="Descreva o que aconteceu, dificuldades encontradas ou observações adicionais"
                multiline
                numberOfLines={4}
                height={measure.y100}

              />
            </Box>

            <Box>
              <Text preset="text16" fontWeightPreset='semibold' color="colorTextPrimary" mb="y12">
                Fotos (opcional)
              </Text>
              <Box flexDirection="row" gap="x12" flexWrap="wrap" mb="y12">
                {photos.map((foto, index) => (
                  <Box key={index} position="relative">
                    <RNImage
                      source={{ uri: foto.uri }}
                      style={{
                        width: 70,
                        height: 70,
                        borderRadius: 8,
                      }}
                      resizeMode="cover"
                    />
                    <TouchableOpacityBox
                      position="absolute"
                      top={-8}
                      right={-8}
                      width={measure.x24}
                      height={measure.y24}
                      backgroundColor="redError"
                      borderRadius="s12"
                      justifyContent="center"
                      alignItems="center"
                      onPress={() => setPhotos(photos.filter((_, i) => i !== index))}
                    >
                      <Text color="white" preset="text12">×</Text>
                    </TouchableOpacityBox>
                  </Box>
                ))}
                <Box flexDirection="row" gap="x8">
                  <TouchableOpacityBox
                    width={measure.x70}
                    height={measure.y70}
                    borderWidth={measure.m1}
                    borderColor="gray300"
                    borderRadius="s8"
                    justifyContent="center"
                    alignItems="center"
                    onPress={handlePickImage}
                  >
                    <Text preset="text24" color="gray400">+</Text>
                  </TouchableOpacityBox>
                  <TouchableOpacityBox
                    width={measure.x70}
                    height={measure.y70}
                    borderWidth={measure.m1}
                    borderColor="primary100"
                    borderRadius="s8"
                    justifyContent="center"
                    alignItems="center"
                    onPress={handleTakePhoto}
                  >
                    <Text preset="text20" color="primary100">📷</Text>
                  </TouchableOpacityBox>
                </Box>
              </Box>
              <Text preset="text13" color="gray400">
                Máximo 10 photos permitidas
              </Text>
            </Box>

            <Box mt="y16">
              <Button
                title={isFailingService || isSubmitting ? 'Registrando...' : 'Registrar insucesso'}
                onPress={handleSubmit}
                disabled={isFailingService || isSubmitting || !selectedReason}
                width={measure.x330}
              />
            </Box>
          </Box>
        </ScrollView>
      </Box>
    </ScreenBase>

  );
}
