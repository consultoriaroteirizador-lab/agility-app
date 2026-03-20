import { Box, Text, TouchableOpacityBox } from '@/components';
import { ServiceStatus, ServiceType } from '@/domain/agility/service/dto/types';
import { measure } from '@/theme';

export interface ParadaCardData {
  id: string;
  identificationCode?: string | null;
  fantasyName?: string | null;
  responsible?: string | null;
  serviceType?: ServiceType | null;
  status?: ServiceStatus;
  isPending?: boolean;
  isInProgress?: boolean;
  isCompleted?: boolean;
  isCanceled?: boolean;
  scheduledStartTime?: string | null;
  estimatedCompletionTime?: string | null;
  sequenceOrder?: number | null;
  address?: {
    formattedAddress?: string | null;
    street?: string | null;
    number?: string | null;
  } | null;
  addressId?: string | null;
}

export interface ParadaCardProps {
  parada: ParadaCardData;
  onPress: (parada: ParadaCardData) => void;
  showStatus?: boolean;
  isNext?: boolean;
  sequenceNumber?: number;
}

const STATUS_CONFIG = {
  pending: { label: 'Pendente', bgColor: 'gray100', textColor: 'gray600' },
  inProgress: { label: 'Em andamento', bgColor: 'primary10', textColor: 'primary100' },
  completed: { label: 'Realizado', bgColor: 'tertiary10', textColor: 'tertiary100' },
  canceled: { label: 'Nao realizado', bgColor: 'redError', textColor: 'white' },
};

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.INSTALLATION]: 'Instalacao',
  [ServiceType.DELIVERY]: 'Entrega',
  [ServiceType.MAINTENANCE]: 'Manutencao',
  [ServiceType.EXCHANGE]: 'Troca',
  [ServiceType.PICKUP]: 'Coleta',
};

function getStatus(parada: ParadaCardData): keyof typeof STATUS_CONFIG {
  if (parada.isCompleted || parada.status === ServiceStatus.COMPLETED) return 'completed';
  if (parada.isCanceled || parada.status === ServiceStatus.CANCELED) return 'canceled';
  if (parada.isInProgress || parada.status === ServiceStatus.IN_PROGRESS) return 'inProgress';
  return 'pending';
}

function getServiceTypeLabel(type?: ServiceType | null): string {
  if (!type) return 'Servico';
  return SERVICE_TYPE_LABELS[type] || type;
}

export function ParadaCard({
  parada,
  onPress,
  showStatus = true,
  isNext = false,
  sequenceNumber,
}: ParadaCardProps) {
  const status = getStatus(parada);
  const statusConfig = STATUS_CONFIG[status];
  const serviceTypeLabel = getServiceTypeLabel(parada.serviceType);
  const clienteName = parada.fantasyName || parada.responsible || 'Cliente';
  const endereco = parada.address?.formattedAddress || parada.address?.street || 'Endereco nao disponivel';

  return (
    <TouchableOpacityBox
      backgroundColor={isNext ? 'primary10' : 'white'}
      borderRadius="s12"
      padding="y12"
      paddingHorizontal="x12"
      borderWidth={measure.m1}
      borderColor={isNext ? 'primary100' : status === 'completed' ? 'tertiary100' : status === 'canceled' ? 'redError' : 'gray200'}
      onPress={() => onPress(parada)}
      flexDirection="row"
      alignItems="center"
      gap="x12"
    >
      {/* Numero da sequencia */}
      <Box
        width={measure.x36}
        height={measure.y36}
        borderRadius="s18"
        backgroundColor={
          isNext ? 'primary100' :
          status === 'completed' ? 'tertiary100' :
          status === 'canceled' ? 'redError' : 'gray200'
        }
        justifyContent="center"
        alignItems="center"
      >
        <Text
          preset="text14"
          fontWeightPreset="bold"
          color={isNext || status === 'completed' || status === 'canceled' ? 'white' : 'gray600'}
        >
          {sequenceNumber ?? parada.sequenceOrder ?? 1}
        </Text>
      </Box>

      {/* Conteudo */}
      <Box flex={1}>
        {/* Header com tipo e status */}
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="y4">
          <Box flexDirection="row" alignItems="center" gap="x8">
            <Text preset="text14" fontWeightPreset="500" color="colorTextPrimary">
              {serviceTypeLabel}
            </Text>
            {isNext && (
              <Box backgroundColor="primary100" paddingHorizontal="x6" paddingVertical="y2" borderRadius="s4">
                <Text preset="text10" fontWeightPreset="bold" color="white">PROXIMA</Text>
              </Box>
            )}
          </Box>

          {showStatus && (
            <Box
              backgroundColor={statusConfig.bgColor as any}
              paddingHorizontal="x6"
              paddingVertical="y2"
              borderRadius="s4"
            >
              <Text preset="text10" fontWeightPreset="500" color={statusConfig.textColor as any}>
                {statusConfig.label}
              </Text>
            </Box>
          )}
        </Box>

        {/* Cliente */}
        <Text preset="text13" color="gray600" marginBottom="y2">
          {clienteName}
          {parada.identificationCode && (
            <Text preset="text12" color="gray400"> #{parada.identificationCode}</Text>
          )}
        </Text>

        {/* Endereco e horario */}
        <Box flexDirection="row" alignItems="center" gap="x8">
          <Text preset="text12" color="gray400" flex={1} numberOfLines={1}>
            {endereco}
          </Text>
          {parada.scheduledStartTime && (
            <Text preset="text12" color="primary100">
              {parada.scheduledStartTime}
            </Text>
          )}
        </Box>
      </Box>

      {/* Seta */}
      <Text preset="text16" color="gray300">→</Text>
    </TouchableOpacityBox>
  );
}
