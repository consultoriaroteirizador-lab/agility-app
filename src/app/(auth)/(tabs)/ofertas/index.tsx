import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { useAcceptRouting, useFindBroadcastingRoutings } from '@/domain/agility/routing/useCase';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { useUserLocation } from '../rotas-detalhadas/[id]/parada/[pid]/_hooks/useUserLocation';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface OfertaAdaptada {
  id: string;
  tempoExpirarSegundos: number;
  servicosCount: number;
  distancia: string;
  tempo: string;
  preco: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcularTempoExpirar(offerTime: string | null): number {
  if (!offerTime) return 0;
  try {
    if (offerTime.includes(':')) {
      const [hora, minuto] = offerTime.split(':').map(Number);
      const agora = new Date();
      const expiracao = new Date();
      expiracao.setHours(hora, minuto, 0, 0);
      if (expiracao < agora) expiracao.setDate(expiracao.getDate() + 1);
      return Math.max(0, Math.floor((expiracao.getTime() - agora.getTime()) / 1000));
    }
    return Math.max(0, Math.floor((new Date(offerTime).getTime() - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

function formatarDistancia(km: number | null | undefined): string {
  if (!km) return '0 km';
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function formatarTempo(minutos: number | null | undefined): string {
  if (!minutos) return '0min';
  if (minutos < 60) return `${Math.round(minutos)}min`;
  const horas = Math.floor(minutos / 60);
  const mins = Math.round(minutos % 60);
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

function formatarPreco(valor: number | null | undefined): string {
  if (!valor) return 'R$ 0,00';
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function formatarTimer(segundos: number): string {
  if (segundos <= 0) return 'Expirada';
  const mins = Math.floor(segundos / 60);
  const secs = segundos % 60;
  if (mins > 0) return `${mins}min ${String(secs).padStart(2, '0')}s`;
  return `${segundos}s`;
}

// ─── Componente de Card ───────────────────────────────────────────────────────

interface OfertaCardProps {
  oferta: OfertaAdaptada;
  onPress: () => void;
  onAceitar: () => void;
  isAccepting: boolean;
}

function OfertaCard({ oferta, onPress, onAceitar, isAccepting }: OfertaCardProps) {
  const [segundos, setSegundos] = useState(oferta.tempoExpirarSegundos);

  useEffect(() => {
    if (segundos <= 0) return;
    const interval = setInterval(() => setSegundos((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [segundos]);

  const expirado = segundos <= 0;

  return (
    <TouchableOpacityBox
      backgroundColor="white"
      borderRadius="s16"
      borderWidth={measure.m1}
      borderColor="gray200"
      mb="y12"
      overflow="hidden"
      onPress={onPress}
    >
      {/* Timer */}
      <Box px="x16" pt="y16" pb="y12">
        <Box
          alignSelf="flex-start"
          borderWidth={measure.m1}
          borderColor="primary100"
          borderRadius="s20"
          px="x12"
          py="y4"
        >
          <Text preset="text13" color={expirado ? 'redError' : 'primary100'}>
            Oferta sumirá: {formatarTimer(segundos)}
          </Text>
        </Box>
      </Box>

      {/* Divisor */}
      <Box height={measure.m1} backgroundColor="gray100" />

      {/* Timeline */}
      <Box px="x16" py="y16" gap="y4">
        {/* Origem */}
        <Box flexDirection="row" alignItems="center" gap="x12">
          <Box alignItems="center" width={measure.x32}>
            <Box
              width={measure.x32}
              height={measure.y32}
              borderRadius="s16"
              borderWidth={measure.m2}
              borderColor="primary100"
              backgroundColor="white"
              justifyContent="center"
              alignItems="center"
            >
              <Icon name="home" size={16} color="primary100" />
            </Box>
          </Box>
          <Text preset="text14" color="gray500">
            Origem
          </Text>
        </Box>

        {/* Linha conectora */}
        <Box
          width={measure.x2}
          height={measure.y24}
          backgroundColor="gray300"
          ml="l14"
        />

        {/* Destino / Serviços */}
        <Box flexDirection="row" alignItems="flex-start" gap="x12">
          <Box alignItems="center" width={measure.x32}>
            <Box
              width={measure.x32}
              height={measure.y32}
              borderRadius="s16"
              borderWidth={measure.m2}
              borderColor="gray300"
              backgroundColor="white"
              justifyContent="center"
              alignItems="center"
            >
              <Icon name="arrow-forward" size={16} color="gray500" />
            </Box>
          </Box>
          <Box flex={1}>
            <Text preset="text16" fontWeight="700" color="colorTextPrimary">
              Serviços
            </Text>
            <Box flexDirection="row" alignItems="center" gap="x4" mt="y2">
              <Text preset="text13" color="gray400">
                {oferta.servicosCount} paradas
              </Text>
              <Text preset="text13" color="gray400"> · </Text>
              <Text preset="text13" color="primary100">
                Ver Rota
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Divisor */}
      <Box height={measure.m1} backgroundColor="gray100" />

      {/* Rodapé */}
      <Box
        px="x16"
        py="y16"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Box>
          <Text preset="text14" color="colorTextPrimary" fontWeight="500">
            Percurso
          </Text>
          <Text preset="text13" color="gray400" mt="y2">
            {oferta.distancia} · {oferta.tempo}
          </Text>
          <Text preset="text18" color="primary100" fontWeight="700" mt="y4">
            {oferta.preco}
          </Text>
        </Box>

        <Button
          title="Aceitar"
          onPress={onAceitar}
          disabled={isAccepting || expirado}
          iconName='check-circle'
          width={measure.x120}
        />
      </Box>
    </TouchableOpacityBox>
  );
}

// ─── Tela Principal ───────────────────────────────────────────────────────────

export default function OfertasScreen() {
  const { showToast } = useToastService();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const { acceptRouting, isLoading: isAcceptingRoute } = useAcceptRouting({
    onSuccess: () => {
      showToast({ message: 'Rota aceita com sucesso', type: 'success' });
      router.push('/(auth)/(tabs)');
    },
    onError: (error: Error) => {
      const errorMessage = error?.message || 'Erro ao aceitar rota';
      showToast({ message: errorMessage, type: 'error' });
    },
  });

  // Limpa o acceptingId quando o loading termina
  useEffect(() => {
    if (!isAcceptingRoute && acceptingId) {
      setAcceptingId(null);
    }
  }, [isAcceptingRoute, acceptingId]);

  const router = useRouter();
  const { userLocation, isLoading: isLoadingLocation } = useUserLocation();

  const { routings, isLoading } = useFindBroadcastingRoutings({
    driverLatitude: userLocation?.coords.latitude,
    driverLongitude: userLocation?.coords.longitude,
  });


  // TODO: substituir por store real
  const ofertasAceitas: string[] = [];

  const ofertas = useMemo<OfertaAdaptada[]>(() => {
    return routings
      .filter((r) => !ofertasAceitas.includes(r.id))
      .map((routing) => ({
        id: routing.id,
        tempoExpirarSegundos: calcularTempoExpirar(routing.offerTime),
        servicosCount: routing.totalServices || 0,
        distancia: formatarDistancia(routing.totalDistanceKm),
        tempo: formatarTempo(routing.totalDurationMinutes),
        preco: formatarPreco(routing.totalValue),
      }));
  }, [routings]);

  const handleAceitar = (routingId: string) => {
    setAcceptingId(routingId);
    acceptRouting({
      routingId,
      payload: {
        driverLatitude: userLocation?.coords.latitude,
        driverLongitude: userLocation?.coords.longitude,
      },
    });
  };

  if (isLoading || isLoadingLocation) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator />
        <Text mt="y16">Carregando ofertas...</Text>
      </Box>
    );
  }

  return (
    <ScreenBase title={<Text preset="textTitleScreen">Ofertas de serviços</Text>}>
      <Box flex={1} px="x16" pt="y12" pb="y24" scrollable>
        {ofertas.length === 0 ? (
          <Box py="y32" alignItems="center">
            <Icon name="local-shipping" size={measure.m48} color="gray300" />
            <Text preset="text14" color="gray400" textAlign="center" mt="y16">
              Nenhuma oferta disponível no momento.
            </Text>
          </Box>
        ) : (
          <Box gap="y4">
            {ofertas.map((oferta) => (
              <OfertaCard
                key={oferta.id}
                oferta={oferta}
                onPress={() => router.push(`/(auth)/(tabs)/ofertas/${oferta.id}`)}
                onAceitar={() => handleAceitar(oferta.id)}
                isAccepting={isAcceptingRoute && acceptingId === oferta.id}
              />
            ))}
          </Box>
        )}
      </Box>
    </ScreenBase>
  );
}