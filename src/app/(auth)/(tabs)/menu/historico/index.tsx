import { FlatList } from 'react-native';

import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';
import { useFindMyRoutings } from '@/domain/agility/routing/useCase';
import { measure } from '@/theme';
import { formatDate, formatDateOnly } from '@/utils/formatDate';

// --- Helpers ---

const STATUS_LABEL: Record<RoutingStatus, string> = {
  [RoutingStatus.DRAFT]: 'Não iniciado',
  [RoutingStatus.OPTIMIZED]: 'Otimizada',
  [RoutingStatus.PENDING_ASSIGNMENT]: 'Pendente',
  [RoutingStatus.BROADCASTING]: 'Disponível',
  [RoutingStatus.ASSIGNED]: 'Atribuída',
  [RoutingStatus.IN_PROGRESS]: 'Iniciada',
  [RoutingStatus.COMPLETED]: 'Concluída',
  [RoutingStatus.CANCELLED]: 'Cancelada',
};

const HISTORY_STATUSES = [RoutingStatus.COMPLETED, RoutingStatus.CANCELLED];

function formatPrice(value?: number | null): string {
  if (!value) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDistance(km?: number | null): string {
  if (!km) return '0 km';
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function formatDuration(minutes?: number | null): string {
  if (!minutes) return '0h';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getStatusColor(status: RoutingStatus) {
  if (status === RoutingStatus.COMPLETED) return 'greenSuccess';
  if (status === RoutingStatus.CANCELLED) return 'redError';
  return 'gray400';
}

// Fundo suave do badge de status, casando com a cor do texto.
function getStatusBgColor(status: RoutingStatus) {
  if (status === RoutingStatus.COMPLETED) return 'tertiary10';
  if (status === RoutingStatus.CANCELLED) return 'redError';
  return 'gray100';
}

// --- Subcomponentes ---

function EmptyState() {
  return (
    <Box py="y32" alignItems="center">
      <Text preset="text14" color="gray400" textAlign="center">
        Nenhuma rota encontrada.
      </Text>
    </Box>
  );
}

function LoadingState() {
  return (
    <Box py="y32" alignItems="center">
      <ActivityIndicator />
      <Text preset="text14" color="gray500" mt="y16">
        Carregando...
      </Text>
    </Box>
  );
}

type Routing = ReturnType<typeof useFindMyRoutings>['routings'][number];

interface RouteCardProps {
  rota: Routing;
  onPress: () => void;
}

function RouteCard({ rota, onPress }: RouteCardProps) {
  const isCancelled = rota.status === RoutingStatus.CANCELLED;
  const badgeTextColor = isCancelled ? 'white' : getStatusColor(rota.status);

  return (
    <TouchableOpacityBox
      backgroundColor="white"
      borderRadius="s16"
      p="y16"
      borderWidth={measure.m1}
      borderColor="gray200"
      onPress={onPress}
    >
      {/* Cabeçalho: nome + badge de status */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="flex-start" mb="y12" gap="x8">
        <Text preset="text16" fontWeightPreset='semibold' color="colorTextPrimary" flex={1} numberOfLines={2}>
          {rota.name ?? `Rota ${rota.code ?? rota.id}`}
        </Text>
        <Box
          backgroundColor={getStatusBgColor(rota.status)}
          paddingHorizontal="x12"
          paddingVertical="y4"
          borderRadius="s20"
          flexShrink={0}
        >
          <Text preset="text12" fontWeightPreset="semibold" color={badgeTextColor}>
            {STATUS_LABEL[rota.status] ?? rota.status}
          </Text>
        </Box>
      </Box>

      {/* Datas: agendada + concluída */}
      <Box gap="y4" mb="y12">
        {rota.date ? (
          <Box flexDirection="row" justifyContent="space-between">
            <Text preset="text13" color="gray500">Agendada</Text>
            <Text preset="text13" color="gray600">{formatDateOnly(rota.date)}</Text>
          </Box>
        ) : null}
        {rota.completedAt ? (
          <Box flexDirection="row" justifyContent="space-between">
            <Text preset="text13" color="gray500">Concluída</Text>
            <Text preset="text13" color="gray600">{formatDate(rota.completedAt)}</Text>
          </Box>
        ) : null}
      </Box>

      {/* Divisor */}
      <Box height={measure.m1} backgroundColor="gray200" mb="y12" />

      {/* Métricas */}
      <Box flexDirection="row" flexWrap="wrap" gap="x12">
        <Text preset="text14" color="gray600">{rota.totalServices ?? 0} paradas</Text>
        <Text preset="text14" color="gray600">{formatPrice(rota.totalValue)}</Text>
        <Text preset="text14" color="gray600">{formatDistance(rota.totalDistanceKm)}</Text>
        <Text preset="text14" color="gray600">{formatDuration(rota.totalDurationMinutes)}</Text>
      </Box>
    </TouchableOpacityBox>
  );
}

// --- Tela principal ---

export default function HistoricoRotasScreen() {
  const router = useRouter();

  const { routings, isLoading } = useFindMyRoutings({ status: RoutingStatus.COMPLETED });

  const rotasFiltradas = routings.filter((r) => HISTORY_STATUSES.includes(r.status));

  return (
    <ScreenBase
      buttonLeft={<ButtonBack />}
      title={
        <Text preset="textTitleScreen" fontWeightPreset='bold' color="colorTextPrimary">
          Histórico de Rotas
        </Text>
      }
    >
      <Box flex={1} backgroundColor="white" pt="y12" pb="y2">
        <Text preset="text15" color="gray500" mb="y16">
          Veja todas as rotas concluídas, canceladas ou já iniciadas.
        </Text>

        <Box
          width="100%"
          height={measure.y1}
          backgroundColor="gray200"
          borderRadius="s20"
          mb="y24"
        />

        {isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            data={rotasFiltradas}
            keyExtractor={(rota) => rota.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            ItemSeparatorComponent={() => <Box height={16} />}
            ListEmptyComponent={<EmptyState />}
            renderItem={({ item }) => (
              <RouteCard
                rota={item}
                onPress={() => router.push(`/(auth)/(tabs)/menu/historico/${item.id}`)}
              />
            )}
          />
        )}
      </Box>
    </ScreenBase>
  );
}