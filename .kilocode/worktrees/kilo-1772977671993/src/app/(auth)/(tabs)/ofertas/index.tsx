import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { useFindBroadcastingRoutings } from '@/domain/agility/routing/useCase';
import { measure } from '@/theme';

interface OfertaAdaptada {
  id: string;
  tempoExpirar: number;
  servicosCount: number;
  distancia: string;
  tempo: string;
  preco: string;
}

function calcularTempoExpirar(offerTime: string | null): number {
  if (!offerTime) return 0;
  try {
    if (offerTime.includes(':')) {
      const [hora, minuto] = offerTime.split(':').map(Number);
      const agora = new Date();
      const expiracao = new Date();
      expiracao.setHours(hora, minuto, 0, 0);
      if (expiracao < agora) {
        expiracao.setDate(expiracao.getDate() + 1);
      }
      const diffMs = expiracao.getTime() - agora.getTime();
      return Math.max(0, Math.floor(diffMs / 1000));
    }
    const timestamp = new Date(offerTime).getTime();
    const agora = Date.now();
    const diffMs = timestamp - agora;
    return Math.max(0, Math.floor(diffMs / 1000));
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

export default function OfertasScreen() {
  const router = useRouter();
  const { routings, isLoading, refetch } = useFindBroadcastingRoutings();
  const [ofertas, setOfertas] = useState<OfertaAdaptada[]>([]);
  // TODO: Implementar store para ofertas aceitas
  // const ofertasAceitas = useRotasStore((s) => s.ofertasAceitas);
  const ofertasAceitas: string[] = [];

  useEffect(() => {
    const ofertasAdaptadas: OfertaAdaptada[] = routings.map((routing) => ({
      id: routing.id,
      tempoExpirar: calcularTempoExpirar(routing.offerTime),
      servicosCount: routing.totalServices || 0,
      distancia: formatarDistancia(routing.totalDistanceKm),
      tempo: formatarTempo(routing.totalDurationMinutes),
      preco: formatarPreco(routing.totalValue),
    }));

    setOfertas(ofertasAdaptadas);
  }, [routings]);

  const ofertasFiltradas = useMemo(() => {
    return ofertas.filter((item) => !ofertasAceitas.includes(String(item.id)));
  }, [ofertas, ofertasAceitas]);

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator />
        <Text mt="y16">Carregando ofertas...</Text>
      </Box>
    );
  }

  return (
    <ScreenBase title={<Text preset='textTitle'>Ofertas de serviços</Text>}>
      <Box flex={1} px="x16" pt="y12" pb="y24">

        {/* Lista de ofertas */}
        <Box gap="y16">
          {ofertasFiltradas.length === 0 && (
            <Box py="y32" alignItems="center">
              <Text preset="text14" color="gray400" textAlign="center">
                Nenhuma oferta disponível no momento.
              </Text>
            </Box>
          )}

          {ofertasFiltradas.map((oferta) => (
            <TouchableOpacityBox
              key={oferta.id}
              bg="white"
              borderRadius="s16"
              p="y16"
              borderWidth={measure.m1}
              borderColor="gray200"
              mb="y12"
              onPress={() => {
                router.push(`/(auth)/(tabs)/ofertas/${oferta.id}`);
              }}
            >
              <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="y12">
                <Text preset="text16" color="colorTextPrimary" fontWeight="500">
                  Oferta #{oferta.id.slice(0, 8)}
                </Text>
                <Box bg="primary100" px="x16" py="y4" borderRadius="s20">
                  <Text preset="text13" color="white">
                    {oferta.preco}
                  </Text>
                </Box>
              </Box>

              <Box bg="gray50" p="y12" borderRadius="s12" flexDirection="row" justifyContent="space-between" mb="y12">
                <Box alignItems="center">
                  <Text preset="text13" color="gray600">
                    {oferta.servicosCount} Serviços
                  </Text>
                </Box>
                <Box alignItems="center">
                  <Text preset="text13" color="gray600">
                    {oferta.distancia}
                  </Text>
                </Box>
                <Box alignItems="center">
                  <Text preset="text13" color="gray600">
                    {oferta.tempo}
                  </Text>
                </Box>
              </Box>

              <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Text preset="text12" color="gray400">
                  Expira em: {Math.floor(oferta.tempoExpirar / 60)}min
                </Text>
                {/* TODO: Adicionar botão de aceitar oferta */}
              </Box>
            </TouchableOpacityBox>
          ))}
        </Box>
      </Box>
    </ScreenBase>

  );
}
