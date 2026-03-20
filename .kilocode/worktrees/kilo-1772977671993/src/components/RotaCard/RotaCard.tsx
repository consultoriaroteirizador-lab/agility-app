import { Box, Text, TouchableOpacityBox } from '@/components';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';
import { measure } from '@/theme';

export interface RotaCardData {
  id: string;
  name?: string | null;
  code?: string | null;
  status: RoutingStatus;
  totalServices?: number | null;
  totalValue?: number | null;
  totalDistanceKm?: number | null;
  totalDurationMinutes?: number | null;
  createdAt?: string | null;
  startDate?: string | null;
  completedDate?: string | null;
}

export interface RotaCardProps {
  rota: RotaCardData;
  onPress: (rota: RotaCardData) => void;
  showStatus?: boolean;
  isHighlight?: boolean;
}

const STATUS_CONFIG: Record<RoutingStatus, { label: string; bgColor: string; textColor: string }> = {
  [RoutingStatus.DRAFT]: { label: 'Rascunho', bgColor: 'gray100', textColor: 'gray600' },
  [RoutingStatus.OPTIMIZED]: { label: 'Otimizada', bgColor: 'primary10', textColor: 'primary100' },
  [RoutingStatus.PENDING_ASSIGNMENT]: { label: 'Pendente', bgColor: 'yellow10', textColor: 'yellow100' },
  [RoutingStatus.BROADCASTING]: { label: 'Disponivel', bgColor: 'secondary10', textColor: 'secondary100' },
  [RoutingStatus.ASSIGNED]: { label: 'Atribuida', bgColor: 'primary10', textColor: 'primary100' },
  [RoutingStatus.IN_PROGRESS]: { label: 'Em andamento', bgColor: 'primary100', textColor: 'white' },
  [RoutingStatus.COMPLETED]: { label: 'Concluida', bgColor: 'tertiary10', textColor: 'tertiary100' },
  [RoutingStatus.CANCELLED]: { label: 'Cancelada', bgColor: 'redError', textColor: 'white' },
};

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
  if (minutos < 60) return `${Math.round(minutos)}min`;
  const horas = Math.floor(minutos / 60);
  const mins = Math.round(minutos % 60);
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

export function RotaCard({ rota, onPress, showStatus = true, isHighlight = false }: RotaCardProps) {
  const statusConfig = STATUS_CONFIG[rota.status] || STATUS_CONFIG[RoutingStatus.DRAFT];
  const preco = formatarPreco(rota.totalValue);
  const distancia = formatarDistancia(rota.totalDistanceKm);
  const tempo = formatarTempo(rota.totalDurationMinutes);

  return (
    <TouchableOpacityBox
      backgroundColor={isHighlight ? 'primary10' : 'white'}
      borderRadius="s16"
      padding="y16"
      paddingHorizontal="x16"
      borderWidth={measure.m1}
      borderColor={isHighlight ? 'primary100' : 'gray200'}
      onPress={() => onPress(rota)}
    >
      {/* Header com nome e status */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="y12">
        <Text preset="text16" fontWeightPreset="500" color="colorTextPrimary" flex={1}>
          {rota.name || `Rota ${rota.code || rota.id}`}
        </Text>
        
        {showStatus && (
          <Box
            backgroundColor={statusConfig.bgColor as any}
            paddingHorizontal="x8"
            paddingVertical="y4"
            borderRadius="s8"
          >
            <Text preset="text12" fontWeightPreset="500" color={statusConfig.textColor as any}>
              {statusConfig.label}
            </Text>
          </Box>
        )}
      </Box>

      {/* Tags de informacoes */}
      <Box flexDirection="row" flexWrap="wrap" gap="x12">
        <Box flexDirection="row" alignItems="center" gap="x4">
          <Text preset="text14" color="gray600">
            {rota.totalServices || 0} paradas
          </Text>
        </Box>

        <Text preset="text14" color="gray300">|</Text>

        <Text preset="text14" fontWeightPreset="500" color="primary100">
          {preco}
        </Text>

        <Text preset="text14" color="gray300">|</Text>

        <Text preset="text14" color="gray600">
          {distancia}
        </Text>

        <Text preset="text14" color="gray300">|</Text>

        <Text preset="text14" color="gray600">
          {tempo}
        </Text>
      </Box>
    </TouchableOpacityBox>
  );
}
