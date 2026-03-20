import { useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { Box, Button, Text, TouchableOpacityBox } from '@/components';
import { createDriverSupportChatService, createDriverCustomerChatService } from '@/domain/agility/chat/chatService';
import { useFindOneService } from '@/domain/agility/service/useCase';
import { useAuthCredentialsService } from '@/services';
import { measure } from '@/theme';

export default function TentativaEntregaScreen() {
  const router = useRouter();
  const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
  const rotaId = id as string;
  const serviceId = pid as string;
  const { userAuth } = useAuthCredentialsService();

  const { service, isLoading } = useFindOneService(serviceId || '');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Endereço do serviço
  const endereco = service?.address?.formattedAddress
    ?? (service?.addressId ? `Endereço ID: ${service?.addressId}` : 'Endereço não disponível');
  const latitude = service?.address?.latitude;
  const longitude = service?.address?.longitude;

  const handleEnviarMensagemTorre = async () => {
    if (!userAuth?.id) {
      Alert.alert('Erro', 'Usuário não identificado');
      return;
    }

    try {
      setLoadingAction('torre');
      // Criar ou encontrar chat com suporte (torre de controle)
      const result = await createDriverSupportChatService({
        driverId: userAuth.id,
      });

      if (result.success && result.result) {
        // Navegar para tela de suporte onde o chat será exibido
        router.push('/(auth)/(tabs)/menu/suporte');
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o chat com a torre de controle');
      }
    } catch (error) {
      console.error('Erro ao criar chat com torre:', error);
      Alert.alert('Erro', 'Não foi possível abrir o chat com a torre de controle');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEnviarMensagemDestinatario = async () => {
    if (!userAuth?.id || !service?.customerId) {
      Alert.alert('Erro', 'Cliente não identificado para este serviço');
      return;
    }

    try {
      setLoadingAction('destinatario');
      // Criar ou encontrar chat com cliente (destinatário)
      const result = await createDriverCustomerChatService({
        driverId: userAuth.id,
        customerId: service.customerId,
        referenceId: serviceId, // Referência ao serviço
      });

      if (result.success && result.result) {
        // Navegar para tela de suporte onde o chat será exibido
        // (ou criar uma tela específica de chat com destinatário se necessário)
        router.push('/(auth)/(tabs)/menu/suporte');
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o chat com o destinatário');
      }
    } catch (error) {
      console.error('Erro ao criar chat com destinatário:', error);
      Alert.alert('Erro', 'Não foi possível abrir o chat com o destinatário');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBuscarEndereco = () => {
    if (!latitude || !longitude) {
      Alert.alert('Aviso', 'Coordenadas do endereço não disponíveis.');
      return;
    }

    // Abrir mapa com o endereço
    const latLng = `${latitude},${longitude}`;
    const label = encodeURIComponent(endereco || '');

    // Tentar abrir Google Maps primeiro
    const googleMapsUrl = Platform.OS === 'ios'
      ? `comgooglemaps://?q=${latLng}`
      : `https://www.google.com/maps/search/?api=1&query=${latLng}`;

    Linking.openURL(googleMapsUrl).catch(() => {
      // Se falhar, tentar Waze
      const wazeUrl = `waze://?ll=${latLng}&navigate=yes`;
      Linking.openURL(wazeUrl).catch(() => {
        Alert.alert('Erro', 'Não foi possível abrir o aplicativo de mapas');
      });
    });
  };

  const handleTenteiTudo = () => {
    // Navegar para tela de falha com formulário completo
    router.push({
      pathname: '/rotas-detalhadas/[id]/parada/[pid]/falha',
      params: { id: rotaId, pid: serviceId },
    });
  };

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Text>Carregando...</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white">
      {/* Header */}
      <Box px="x16" pt="y12" pb="y8" bg="white">
        <Box flexDirection="row" alignItems="center" mb="y8">
          <TouchableOpacityBox onPress={() => router.back()} mr="x12">
            <Text preset="text18" color="primary100">←</Text>
          </TouchableOpacityBox>
          <Box flex={1}>
            <Text preset="text18" fontWeight="500" color="colorTextPrimary" textAlign="center">
              Tentativa de entrega
            </Text>
          </Box>
          <Box width={measure.x24} /> {/* Espaço para alinhar */}
        </Box>
      </Box>

      <Box flex={1} px="x16" pt="y24">
        {/* Ícone ilustrativo */}
        <Box alignItems="center" mb="y32">
          <Box
            width={measure.x120}
            height={measure.y120}
            bg="redError"
            borderRadius="s16"
            justifyContent="center"
            alignItems="center"
          >
            <Text preset="text40">📦</Text>
          </Box>
        </Box>

        {/* Texto introdutório */}
        <Text
          preset="text16"
          color="colorTextPrimary"
          textAlign="center"
          mb="y32"
          px="x16"
        >
          Já realizou a tentativa de algumas dessas opções:
        </Text>

        {/* Opções */}
        <Box gap="y16" mb="y32">
          {/* Opção 1: Enviar mensagem torre de controle */}
          <TouchableOpacityBox
            onPress={handleEnviarMensagemTorre}
            disabled={loadingAction !== null}
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            p="y16"
            borderWidth={measure.m1}
            borderColor="gray200"
            borderRadius="s12"
            bg="white"
          >
            <Text preset="text16" color="colorTextPrimary" flex={1}>
              Enviar mensagem torre de controle
            </Text>
            <Text preset="text18" color="gray400">
              {loadingAction === 'torre' ? '...' : '>'}
            </Text>
          </TouchableOpacityBox>

          {/* Opção 2: Enviar mensagem para o destinatário */}
          <TouchableOpacityBox
            onPress={handleEnviarMensagemDestinatario}
            disabled={loadingAction !== null || !service?.customerId}
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            p="y16"
            borderWidth={measure.m1}
            borderColor="gray200"
            borderRadius="s12"
            bg="white"
            opacity={!service?.customerId ? 0.5 : 1}
          >
            <Text preset="text16" color="colorTextPrimary" flex={1}>
              Enviar mensagem para o destinatário
            </Text>
            <Text preset="text18" color="gray400">
              {loadingAction === 'destinatario' ? '...' : '>'}
            </Text>
          </TouchableOpacityBox>

          {/* Opção 3: Buscar endereço */}
          <TouchableOpacityBox
            onPress={handleBuscarEndereco}
            disabled={loadingAction !== null || !latitude || !longitude}
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            p="y16"
            borderWidth={measure.m1}
            borderColor="gray200"
            borderRadius="s12"
            bg="white"
            opacity={!latitude || !longitude ? 0.5 : 1}
          >
            <Text preset="text16" color="colorTextPrimary" flex={1}>
              Buscar endereço
            </Text>
            <Text preset="text18" color="gray400">{'>'}</Text>
          </TouchableOpacityBox>
        </Box>

        {/* Botão final: Tentei de tudo */}
        <Box mb="y24">
          <Button
            title="Tentei de tudo e não consegui entregar"
            preset="outline"
            onPress={handleTenteiTudo}
            disabled={loadingAction !== null}
            color='redError'
          />
        </Box>
      </Box>
    </Box>
  );
}
