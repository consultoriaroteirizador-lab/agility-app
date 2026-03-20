import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, Text, TouchableOpacityBox } from '@/components';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';
import { useFindMyRoutings } from '@/domain/agility/routing/useCase';
import { measure } from '@/theme';

function mapStatus(status: RoutingStatus): string {
  const map: Record<RoutingStatus, string> = {
    [RoutingStatus.DRAFT]: 'Não iniciado',
    [RoutingStatus.OPTIMIZED]: 'Otimizada',
    [RoutingStatus.PENDING_ASSIGNMENT]: 'Pendente',
    [RoutingStatus.BROADCASTING]: 'Disponível',
    [RoutingStatus.ASSIGNED]: 'Atribuída',
    [RoutingStatus.IN_PROGRESS]: 'Iniciada',
    [RoutingStatus.COMPLETED]: 'Concluída',
    [RoutingStatus.CANCELLED]: 'Cancelada',
  };
  return map[status] ?? status;
}

export default function HistoricoRotasScreen() {
  const router = useRouter();
  
  // Buscar apenas rotas concluídas ou canceladas
  const { routings, isLoading } = useFindMyRoutings({
    status: RoutingStatus.COMPLETED,
  });

  const rotasFiltradas = routings.filter(
    (r) => r.status === RoutingStatus.COMPLETED || r.status === RoutingStatus.CANCELLED
  );

  function formatarPreco(valor: number | null | undefined): string {
    if (!valor) return 'R$ 0,00';
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  }

  function formatarDistancia(km: number | null | undefined): string {
    if (!km) return '0 km';
    return `${km.toFixed(1).replace('.', ',')} km`;
  }

  function formatarTempo(minutos: number | null | undefined): string {
    if (!minutos) return '0h';
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
  }

  return (
    <Box flex={1} bg="white" px="x16" pt="y12" pb="y24">
      {/* Header */}
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" mb="y24">
        <TouchableOpacityBox onPress={() => router.back()} mr="x12">
          <Text preset="text18" color="primary100">←</Text>
        </TouchableOpacityBox>
        <Box flex={1}>
          <Text preset="text20" fontWeight="600" color="colorTextPrimary">
            Histórico de Rotas
          </Text>
        </Box>
      </Box>

      <Text preset="text15" color="gray500" mb="y16">
        Veja todas as rotas concluídas, canceladas ou já iniciadas.
      </Text>

      <Box width="100%" height={measure.y1} bg="gray200" borderRadius="s20" mb="y24" />

      {/* Loading */}
      {isLoading && (
        <Box py="y32" alignItems="center">
          <ActivityIndicator />
          <Text preset="text14" color="gray500" mt="y16">
            Carregando...
          </Text>
        </Box>
      )}

      {/* Sem rotas */}
      {!isLoading && rotasFiltradas.length === 0 && (
        <Box py="y32" alignItems="center">
          <Text preset="text14" color="gray400" textAlign="center">
            Nenhuma rota encontrada.
          </Text>
        </Box>
      )}

      {/* Lista de rotas */}
      <Box gap="y20">
        {rotasFiltradas.map((rota) => {
          const status = mapStatus(rota.status);
          const preco = formatarPreco(rota.totalValue);
          const distancia = formatarDistancia(rota.totalDistanceKm);
          const tempo = formatarTempo(rota.totalDurationMinutes);

          return (
            <TouchableOpacityBox
              key={rota.id}
              bg="white"
              borderRadius="s16"
              p="y16"
              borderWidth={measure.m1}
              borderColor="gray200"
              onPress={() => {
                router.push(`/(auth)/(tabs)/menu/historico/${rota.id}`);
              }}
            >
              <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="y12">
                <Text preset="text16" fontWeight="500" color="colorTextPrimary">
                  {rota.name || `Rota ${rota.code || rota.id}`}
                </Text>
                <Text
                  preset="text13"
                  color={
                    rota.status === RoutingStatus.COMPLETED
                      ? 'greenSuccess'
                      : rota.status === RoutingStatus.CANCELLED
                      ? 'redError'
                      : 'gray400'
                  }
                >
                  {status}
                </Text>
              </Box>

              <Box flexDirection="row" flexWrap="wrap" gap="x12" mb="y12">
                <Text preset="text14" color="gray600">
                  {rota.totalServices || 0} paradas
                </Text>
                <Text preset="text14" color="gray600">
                  {preco}
                </Text>
                <Text preset="text14" color="gray600">
                  {distancia}
                </Text>
                <Text preset="text14" color="gray600">
                  {tempo}
                </Text>
              </Box>
            </TouchableOpacityBox>
          );
        })}
      </Box>
    </Box>
  );
}