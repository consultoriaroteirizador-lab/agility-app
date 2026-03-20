import { useState, useEffect } from 'react';
import { Alert, ScrollView, TextInput, Image as RNImage, Platform } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Box, Button, Text, TouchableOpacityBox, ActivityIndicator } from '@/components';
import { FailureReason } from '@/domain/agility/service/dto';
import { useFailService, useFindOneService } from '@/domain/agility/service/useCase';
import { KEY_SERVICES } from '@/domain/queryKeys';
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

  const { service, isLoading: isLoadingService } = useFindOneService(serviceId || '');
  const [selectedReason, setSelectedReason] = useState<FailureReason | null>(null);
  const [notes, setNotes] = useState('');
  const [fotos, setFotos] = useState<{ uri: string; base64: string }[]>([]);
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
      Alert.alert(
        'Erro',
        'Não foi possível marcar o serviço como insucesso. Tente novamente.',
      );
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
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64 && asset.uri) {
          setFotos([...fotos, { uri: asset.uri, base64: asset.base64 }]);
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  // Função para tirar foto com a câmera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para usar a câmera!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64 && asset.uri) {
          setFotos([...fotos, { uri: asset.uri, base64: asset.base64 }]);
        }
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
    }
  };

  const handleSubmit = () => {
    if (!selectedReason) {
      Alert.alert('Atenção', 'Por favor, selecione um motivo para o insucesso.');
      return;
    }

    setIsSubmitting(true);

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

    if (fotos.length > 0) {
      // Converter fotos para base64 strings (array de URLs base64)
      payload.photoProof = fotos.map(f => f.base64);
    }

    failService({
      id: serviceId,
      payload,
    });
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
    <Box flex={1} bg="white">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <Box px="x16" pt="y12" pb="y8" bg="white">
          <Box flexDirection="row" alignItems="center" mb="y8">
            <TouchableOpacityBox onPress={() => router.back()} mr="x12">
              <Text preset="text18" color="primary100">←</Text>
            </TouchableOpacityBox>
            <Box flex={1}>
              <Text preset="text18" fontWeight="500" color="colorTextPrimary" textAlign="center">
                Registrar insucesso
              </Text>
            </Box>
            <Box width={measure.x24} /> {/* Espaço para alinhar */}
          </Box>
        </Box>

        <Box px="x16" gap="y24" pt="y16">
          {/* Seleção de motivo */}
          <Box>
            <Text preset="text16" fontWeight="500" color="colorTextPrimary" mb="y12">
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
                  bg={selectedReason === reason.value ? 'primary10' : 'white'}
                >
                  <Box
                    width={measure.x24}
                    height={measure.y24}
                    borderRadius="s12"
                    borderWidth={measure.m2}
                    borderColor={selectedReason === reason.value ? 'primary100' : 'gray400'}
                    bg={selectedReason === reason.value ? 'primary100' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    {selectedReason === reason.value && (
                      <Box width={measure.x12} height={measure.y12} borderRadius="s6" bg="white" />
                    )}
                  </Box>
                  <Text preset="text16" color="colorTextPrimary" fontWeight={selectedReason === reason.value ? '500' : '400'}>
                    {reason.label}
                  </Text>
                </TouchableOpacityBox>
              ))}
            </Box>
          </Box>

          {/* Campo de observações */}
          <Box>
            <Text preset="text16" fontWeight="500" color="colorTextPrimary" mb="y8">
              Observações
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Descreva o que aconteceu, dificuldades encontradas ou observações adicionais"
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                borderColor: 'borderColor',
                borderRadius: 12,
                padding: measure.y14,
                fontSize: 15,
                minHeight: 100,
                textAlignVertical: 'top',
                backgroundColor: 'white',
              }}
            />
          </Box>

          {/* Fotos */}
          <Box>
            <Text preset="text16" fontWeight="500" color="colorTextPrimary" mb="y12">
              Fotos (opcional)
            </Text>
            <Box flexDirection="row" gap="x12" flexWrap="wrap" mb="y12">
              {fotos.map((foto, index) => (
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
                    bg="redError"
                    borderRadius="s12"
                    justifyContent="center"
                    alignItems="center"
                    onPress={() => setFotos(fotos.filter((_, i) => i !== index))}
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
              Máximo 10 fotos permitidas
            </Text>
          </Box>

          {/* Botão de enviar */}
          <Box mt="y16">
            <Button
              title={isFailingService || isSubmitting ? 'Registrando...' : 'Registrar insucesso'}
              onPress={handleSubmit}
              disabled={isFailingService || isSubmitting || !selectedReason}
            />
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
}
