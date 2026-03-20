import { useState } from 'react';
import { Linking, Platform } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { Box, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { createDriverSupportChatService, createDriverCustomerChatService } from '@/domain/agility/chat/chatService';
import { useFindOneService } from '@/domain/agility/service/useCase';
import { useAuthCredentialsService } from '@/services';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

export default function TentativaEntregaScreen() {
  const router = useRouter();
  const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
  const rotaId = id as string;
  const serviceId = pid as string;
  const { userAuth } = useAuthCredentialsService();
  const { showToast } = useToastService();

  const { service, isLoading } = useFindOneService(serviceId || '');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Endereço do serviço
  const endereco = service?.address?.formattedAddress
    ?? (service?.addressId ? `Endereço ID: ${service?.addressId}` : 'Endereço não disponível');
  const latitude = service?.address?.latitude;
  const longitude = service?.address?.longitude;

  const handleEnviarMensagemTorre = async () => {
    if (!userAuth?.id) {
      showToast({ message: 'Usuário não identificado', type: 'error' });
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
        showToast({ message: 'Não foi possível abrir o chat com a torre de controle', type: 'error' });
      }
    } catch (error) {
      console.error('Erro ao criar chat com torre:', error);
      showToast({ message: 'Não foi possível abrir o chat com a torre de controle', type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEnviarMensagemDestinatario = async () => {
    if (!userAuth?.id || !service?.customerId) {
      showToast({ message: 'Cliente não identificado para este serviço', type: 'error' });
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
        showToast({ message: 'Não foi possível abrir o chat com o destinatário', type: 'error' });
      }
    } catch (error) {
      console.error('Erro ao criar chat com destinatário:', error);
      showToast({ message: 'Não foi possível abrir o chat com o destinatário', type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBuscarEndereco = () => {
    if (!latitude || !longitude) {
      showToast({ message: 'Coordenadas do endereço não disponíveis.', type: 'error' });
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
        showToast({ message: 'Não foi possível abrir o aplicativo de mapas', type: 'error' });
      });
    });
  };

  const handleTenteiTudo = () => {
    // Navegar para tela de insucesso com formulário completo
    router.push({
      pathname: '/rotas-detalhadas/[id]/parada/[pid]/insucesso',
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
    <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen" >
      Tentativa de entrega
    </Text>}>
      <Box flex={1} backgroundColor="white">

        <Box flex={1} >
          <Box alignItems="center" mb="y32">
            <Box
              width={measure.x120}
              height={measure.y120}
              backgroundColor="redError"
              borderRadius="s16"
              justifyContent="center"
              alignItems="center"
            >
              <Text preset="text40">📦</Text>
            </Box>
          </Box>

          <Text
            preset="text16"
            color="colorTextPrimary"
            textAlign="center"
            mb="y32"
            px="x16"
          >
            Já realizou a tentativa de algumas dessas opções:
          </Text>

          <Box gap="y16" mb="y32">
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
              backgroundColor="white"
            >
              <Text preset="text16" color="colorTextPrimary" flex={1}>
                Enviar mensagem torre de controle
              </Text>
              <Text preset="text18" color="gray400">
                {loadingAction === 'torre' ? '...' : '>'}
              </Text>
            </TouchableOpacityBox>

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
              backgroundColor="white"
              opacity={!latitude || !longitude ? 0.5 : 1}
            >
              <Text preset="text16" color="colorTextPrimary" flex={1}>
                Buscar endereço
              </Text>
              <Text preset="text18" color="gray400">{'>'}</Text>
            </TouchableOpacityBox>
          </Box>

          <Box mb="y24" alignItems='center'>
            <Button
              alignContent='center'
              title="Tentei de tudo"
              preset="main"
              onPress={handleTenteiTudo}
              disabled={loadingAction !== null}
              color='redError'
              width={measure.x330}
            />
          </Box>
        </Box>
      </Box>
    </ScreenBase>

  );
}
