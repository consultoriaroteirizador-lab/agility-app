import { useEffect, useState, useMemo } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { ActivityIndicator, Box, Text, TouchableOpacityBox, Button, Image } from '@/components';
import { useFindOneRouting, useAcceptRouting } from '@/domain/agility/routing/useCase';
import { ServiceType } from '@/domain/agility/service/dto/types';
import { useFindServicesByRoutingId } from '@/domain/agility/service/useCase';
import { measure } from '@/theme';

export default function OfertaDetalhadaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routingId = id as string;

  const { routing, isLoading: isLoadingRouting } = useFindOneRouting(routingId);
  const { services, isLoading: isLoadingServices } = useFindServicesByRoutingId(routingId);

  const { acceptRouting, isLoading: isAccepting } = useAcceptRouting({
    onSuccess: (data) => {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.push('/(auth)/(tabs)');
      }, 2000);
    },
    onError: (error) => {
      console.error('Erro ao aceitar oferta:', error);
    },
  });

  const [mostrarPopup, setMostrarPopup] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [resumo, setResumo] = useState({
    totalParadas: 0,
    preco: 'R$ 0,00',
    distancia: '0 km',
    tempoTotal: '0h',
  });

  const isLoading = isLoadingRouting || isLoadingServices;

  const paradas = useMemo(() => {
    if (!services || services.length === 0) return [];

    const sorted = [...services].sort((a, b) => {
      const orderA = a.sequenceOrder ?? 999;
      const orderB = b.sequenceOrder ?? 999;
      return orderA - orderB;
    });

    return sorted.map((service) => {
      let tipo = 'Serviço';
      if (service.serviceType) {
        const typeMap: Record<ServiceType, string> = {
          [ServiceType.INSTALLATION]: 'Instalação',
          [ServiceType.DELIVERY]: 'Entrega',
          [ServiceType.MAINTENANCE]: 'Manutenção',
          [ServiceType.EXCHANGE]: 'Troca',
          [ServiceType.PICKUP]: 'Coleta',
        };
        tipo = typeMap[service.serviceType as ServiceType] ?? service.serviceType;
      }

      return {
        tipo,
        endereco: service.addressId ? `Endereço ID: ${service.addressId}` : 'Endereço não disponível',
      };
    });
  }, [services]);

  useEffect(() => {
    if (!routing) return;

    const formatarDistancia = (km: number | null | undefined): string => {
      if (!km) return '0 km';
      return `${km.toFixed(1).replace('.', ',')} km`;
    };

    const formatarTempo = (minutos: number | null | undefined): string => {
      if (!minutos) return '0h';
      if (minutos < 60) return `${Math.round(minutos)}min`;
      const horas = Math.floor(minutos / 60);
      const mins = Math.round(minutos % 60);
      return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
    };

    const formatarPreco = (valor: number | null | undefined): string => {
      if (!valor) return 'R$ 0,00';
      return `R$ ${valor.toFixed(2).replace('.', ',')}`;
    };

    setResumo({
      totalParadas: paradas.length,
      preco: formatarPreco(routing.totalValue),
      distancia: formatarDistancia(routing.totalDistanceKm),
      tempoTotal: formatarTempo(routing.totalDurationMinutes),
    });
  }, [routing, paradas]);

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
        <Text preset="text16" color="gray600">
          Oferta não encontrada
        </Text>
        <Button title="Voltar" onPress={() => router.back()} mt="y16" />
      </Box>
    );
  }

  return (
    <Box flex={1} px="x16" pt="y12" pb="y24">
      {/* Header */}
      <Box flexDirection="row" alignItems="center" mb="y16">
        <TouchableOpacityBox onPress={() => router.back()} mr="x12">
          <Text preset="text18" color="primary100">←</Text>
        </TouchableOpacityBox>
        <Text preset="text18" fontWeightPreset='semibold' color="colorTextPrimary">
          Rota
        </Text>
      </Box>

      {/* Tags de Resumo */}
      <Box flexDirection="row" flexWrap="wrap" gap="x12" mb="y24">
        <Box
          flexDirection="row"
          alignItems="center"
          gap="x8"
          px="x16"
          py="y6"
          bg="primary10"
          borderRadius="s20"
          borderWidth={measure.m1}
          borderColor="primary20"
        >
          <Image
            source={require('@/assets/images/agility/cards/map-pin.png')}
            width={measure.x16}
            height={measure.y16}
            resizeMode="contain"
          />
          <Text preset="text14" color="gray600">
            {resumo.totalParadas} paradas
          </Text>
        </Box>

        <Box
          flexDirection="row"
          alignItems="center"
          gap="x8"
          px="x16"
          py="y6"
          bg="primary10"
          borderRadius="s20"
          borderWidth={measure.m1}
          borderColor="primary20"
        >
          <Text preset="text14" color="gray600">
            {resumo.preco}
          </Text>
        </Box>

        <Box
          flexDirection="row"
          alignItems="center"
          gap="x8"
          px="x16"
          py="y6"
          bg="primary10"
          borderRadius="s20"
          borderWidth={measure.m1}
          borderColor="primary20"
        >
          <Text preset="text14" color="gray600">
            {resumo.distancia}
          </Text>
        </Box>

        <Box
          flexDirection="row"
          alignItems="center"
          gap="x8"
          px="x16"
          py="y6"
          bg="gray50"
          borderRadius="s20"
          borderWidth={measure.m1}
          borderColor="gray200"
        >
          <Text preset="text14" color="gray600">
            {resumo.tempoTotal}
          </Text>
        </Box>
      </Box>

      {/* Timeline de Paradas */}
      <Box gap="y16" mb="y24">
        {paradas.map((parada, index) => (
          <Box key={index} flexDirection="row" alignItems="flex-start" gap="x12">
            <Box alignItems="center" width={measure.x24}>
              <Box width={measure.x16} height={measure.y16} borderRadius="s8" bg="primary100" />
              {index < paradas.length - 1 && (
                <Box width={measure.x2} flex={1} bg="gray200" mt="y4" />
              )}
            </Box>
            <Box flex={1} bg="white" borderRadius="s12" p="y16" borderWidth={measure.m1} borderColor="gray200">
              <Text preset="text14" fontWeightPreset='semibold' color="colorTextPrimary" mb="y4">
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
        <Button
          title="Recusar"
          preset="outline"
          onPress={() => router.back()}
          flex={1}
        />
        <Button
          title={isAccepting ? 'Aceitando...' : 'Aceitar'}
          onPress={() => setMostrarPopup(true)}
          flex={1}
          disabled={isAccepting}
        />
      </Box>

      {/* Modal de Confirmação */}
      {mostrarPopup && (
        <Box
          position="absolute"
          top={measure.t0}
          left={measure.l0}
          right={measure.r0}
          bottom={measure.b0}
          bg="blackOpaque"
          justifyContent="center"
          alignItems="center"
          zIndex={1000}
        >
          <Box bg="white" borderRadius="s16" p="y24" width="85%" maxWidth={measure.x340}>
            <Text preset="text18" fontWeightPreset='bold' color="colorTextPrimary" mb="y8">
              Aceitar oferta
            </Text>
            <Text preset="text14" color="gray600" mb="y24">
              Deseja realmente aceitar esta oferta?
            </Text>
            <Box flexDirection="row" gap="x16">
              <Button
                title="Cancelar"
                preset="outline"
                onPress={() => setMostrarPopup(false)}
                flex={1}
              />
              <Button
                title="Aceitar"
                onPress={() => {
                  setMostrarPopup(false);
                  acceptRouting(routingId);
                }}
                flex={1}
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* Sucesso */}
      {showSuccess && (
        <Box
          position="absolute"
          top={measure.t0}
          left={measure.l0}
          right={measure.r0}
          bottom={measure.b0}
          bg="primary100"
          justifyContent="center"
          alignItems="center"
          zIndex={1000}
        >
          <Box alignItems="center">
            <Box width={measure.x12} height={measure.y12} borderRadius="s6" bg="tertiary100" />
            <Text preset="text18" color="white" textAlign="center" mt="y40">
              Oferta aceita{'\n'}com sucesso!
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}