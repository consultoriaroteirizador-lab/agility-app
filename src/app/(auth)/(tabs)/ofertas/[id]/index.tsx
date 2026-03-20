import { useMemo, useState } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { ActivityIndicator, Box, Text, Button, Image, ScreenBase } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { Icon } from '@/components/Icon/Icon';
import Modal from '@/components/Modal/Modal';
import { formatAddress } from '@/domain/agility/address/dto';
import { useFindOneRouting, useAcceptRouting } from '@/domain/agility/routing/useCase';
import { ServiceType } from '@/domain/agility/service/dto/types';
import { useFindServicesByRoutingId } from '@/domain/agility/service/useCase';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { useUserLocation } from '../../rotas-detalhadas/[id]/parada/[pid]/_hooks/useUserLocation';

const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  [ServiceType.INSTALLATION]: 'Instalação',
  [ServiceType.DELIVERY]: 'Entrega',
  [ServiceType.MAINTENANCE]: 'Manutenção',
  [ServiceType.EXCHANGE]: 'Troca',
  [ServiceType.PICKUP]: 'Coleta',
};

function formatarDistancia(km: number | null | undefined): string {
  if (!km) return '0 km';
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function formatarTempo(minutos: number | null | undefined): string {
  if (!minutos) return '0h';
  if (minutos < 60) return `${Math.round(minutos)}min`;
  const horas = Math.floor(minutos / 60);
  const mins = Math.round(minutos % 60);
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

function formatarPreco(valor: number | null | undefined): string {
  if (!valor) return 'R$ 0,00';
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

export default function OfertaDetalhadaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routingId = id as string;

  const { userLocation } = useUserLocation();
  const { routing, isLoading: isLoadingRouting } = useFindOneRouting(routingId);
  const { services, isLoading: isLoadingServices } = useFindServicesByRoutingId(routingId);
  const { showToast } = useToastService();
  const [mostrarPopup, setMostrarPopup] = useState(false);

  const { acceptRouting, isLoading: isAccepting } = useAcceptRouting({
    onSuccess: () => {
      showToast({ message: 'Rota aceita com sucesso', type: 'success' });
      router.push('/(auth)/(tabs)');
    },
  });

  const paradas = useMemo(() => {
    if (!services || services.length === 0) return [];

    return [...services]
      .sort((a, b) => (a.sequenceOrder ?? 999) - (b.sequenceOrder ?? 999))
      .map((service) => ({
        tipo: service.serviceType
          ? (SERVICE_TYPE_LABEL[service.serviceType as ServiceType] ?? service.serviceType)
          : 'Serviço',
        endereco: service.address
          ? formatAddress(service.address)
          : 'Endereço não disponível',
      }));
  }, [services]);

  const resumo = useMemo(() => ({
    totalParadas: paradas.length,
    preco: formatarPreco(routing?.totalValue),
    distancia: formatarDistancia(routing?.totalDistanceKm),
    tempoTotal: formatarTempo(routing?.totalDurationMinutes),
  }), [routing, paradas]);

  const handleAcceptRouting = () => {
    setMostrarPopup(false);
    acceptRouting({
      routingId,
      payload: {
        driverLatitude: userLocation?.coords.latitude,
        driverLongitude: userLocation?.coords.longitude,
      },
    });
  };

  const isLoading = isLoadingRouting || isLoadingServices;

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <ActivityIndicator />
        <Text mt="y16">Carregando oferta...</Text>
      </Box>
    );
  }

  if (!routing) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <Text preset="text16" color="gray600">Oferta não encontrada</Text>
        <Button title="Voltar" onPress={() => router.back()} mt="y16" />
      </Box>
    );
  }

  return (
    <ScreenBase
      buttonLeft={<ButtonBack />}
      title={<Text preset="textTitleScreen">Rota</Text>}
    >
      <Box flex={1} pt="y12" pb="y24" scrollable>

        {/* Tags de Resumo */}
        <Box flexDirection="row" flexWrap="wrap" gap="x12" mb="y24">
          <TagResumo icon={<Image source={require('@/assets/images/agility/cards/map-pin.png')} width={measure.x16} height={measure.y16} resizeMode="contain" />}>
            {resumo.totalParadas} paradas
          </TagResumo>
          <TagResumo icon={<Icon name="attach-money" />}>
            {resumo.preco}
          </TagResumo>
          <TagResumo icon={<Icon name="straighten" />}>
            {resumo.distancia}
          </TagResumo>
          <TagResumo icon={<Icon name="av-timer" />} variant="neutral">
            {resumo.tempoTotal}
          </TagResumo>
        </Box>

        {/* Timeline de Paradas */}
        <Box gap="y16" mb="y24">
          {paradas.map((parada, index) => (
            <Box key={index} flexDirection="row" alignItems="flex-start" gap="x12">
              <Box alignItems="center" width={measure.x24}>
                <Box width={measure.x16} height={measure.y16} borderRadius="s8" backgroundColor="primary100" />
                {index < paradas.length - 1 && (
                  <Box width={measure.x2} flex={1} backgroundColor="gray200" mt="y4" />
                )}
              </Box>
              <Box flex={1} backgroundColor="white" borderRadius="s12" p="y16" borderWidth={measure.m1} borderColor="gray200">
                <Text preset="text14" fontWeight="500" color="colorTextPrimary" mb="y4">
                  {parada.tipo}
                </Text>
                <Text preset="text13" color="gray400">
                  {parada.endereco}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Botões */}
        <Box flexDirection="row" gap="x16" mt="y16">
          <Button title="Recusar" preset="outline" onPress={() => router.back()} flex={1} />
          <Button
            title={isAccepting ? 'Aceitando...' : 'Aceitar'}
            onPress={() => setMostrarPopup(true)}
            flex={1}
            disabled={isAccepting}
          />
        </Box>

        <Modal
          preset="action"
          buttonActionTitle="Aceitar"
          title="Aceitar oferta"
          onPress={handleAcceptRouting}
          isVisible={mostrarPopup}
          onClose={() => setMostrarPopup(false)}
        />
      </Box>
    </ScreenBase>
  );
}

// Componente auxiliar para as tags de resumo
type TagResumoProps = {
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: 'primary' | 'neutral';
};

function TagResumo({ icon, children, variant = 'primary' }: TagResumoProps) {
  const isPrimary = variant === 'primary';
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="x8"
      px="x16"
      py="y6"
      backgroundColor={isPrimary ? 'primary10' : 'gray50'}
      borderRadius="s20"
      borderWidth={measure.m1}
      borderColor={isPrimary ? 'primary20' : 'gray200'}
    >
      {icon}
      <Text preset="text14" color="gray600">{children}</Text>
    </Box>
  );
}