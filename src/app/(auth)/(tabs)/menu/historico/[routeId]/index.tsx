
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ActivityIndicator, Box, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';
import { useFindOneRouting, useGetRoutingMapData } from '@/domain/agility/routing/useCase';
import { ServiceStatus, ServiceType } from '@/domain/agility/service/dto/types';
import { useFindServicesByRoutingId } from '@/domain/agility/service/useCase';
import { colors, measure } from '@/theme';

import { Map, MapPoint } from '../../../rotas-detalhadas/[id]/parada/[pid]/_components/shared/Map';

function mapRoutingStatus(status: RoutingStatus): string {
  const map: Record<RoutingStatus, string> = {
    [RoutingStatus.DRAFT]: 'Nao iniciado',
    [RoutingStatus.OPTIMIZED]: 'Otimizada',
    [RoutingStatus.PENDING_ASSIGNMENT]: 'Pendente',
    [RoutingStatus.BROADCASTING]: 'Disponivel',
    [RoutingStatus.ASSIGNED]: 'Atribuida',
    [RoutingStatus.IN_PROGRESS]: 'Iniciada',
    [RoutingStatus.COMPLETED]: 'Concluida',
    [RoutingStatus.CANCELLED]: 'Cancelada',
  };
  return map[status] ?? status;
}

function mapServiceStatus(status: ServiceStatus): string {
  const map: Record<ServiceStatus, string> = {
    [ServiceStatus.PENDING]: 'Pendente',
    [ServiceStatus.ASSIGNED]: 'Atribuido',
    [ServiceStatus.IN_PROGRESS]: 'Em andamento',
    [ServiceStatus.COMPLETED]: 'Realizado',
    [ServiceStatus.CANCELED]: 'Nao realizado',
  };
  return map[status] ?? status;
}

function mapServiceType(type: ServiceType): string {
  const map: Record<ServiceType, string> = {
    [ServiceType.INSTALLATION]: 'Instalacao',
    [ServiceType.DELIVERY]: 'Entrega',
    [ServiceType.MAINTENANCE]: 'Manutencao',
    [ServiceType.EXCHANGE]: 'Troca',
    [ServiceType.PICKUP]: 'Coleta',
  };
  return map[type] ?? type;
}

function getStatusColor(status: ServiceStatus): string {
  switch (status) {
    case ServiceStatus.COMPLETED:
      return 'tertiary100';
    case ServiceStatus.CANCELED:
      return 'redError';
    default:
      return 'gray400';
  }
}

export default function HistoricoDetalhesScreen() {
  const router = useRouter();
  const { routeId } = useLocalSearchParams<{ routeId: string }>();

  const { routing, isLoading: isLoadingRouting } = useFindOneRouting(routeId || '');
  const { services, isLoading: isLoadingServices } = useFindServicesByRoutingId(routeId || '');
  const { routes: routeSegments, origin, isLoading: isLoadingMapData } = useGetRoutingMapData(routeId || '');

  const isLoading = isLoadingRouting || isLoadingServices || isLoadingMapData;

  const formatarPreco = (valor: number | null | undefined): string => {
    if (!valor) return 'R$ 0,00';
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

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

  // Ordenar servicos por ordem de sequencia
  const sortedServices = services
    ? [...services].sort((a, b) => {
      const orderA = a.sequenceOrder ?? 999;
      const orderB = b.sequenceOrder ?? 999;
      return orderA - orderB;
    })
    : [];

  // Converter services para pontos do mapa
  const mapPoints: MapPoint[] = sortedServices
    .filter(service => service.address?.latitude && service.address?.longitude)
    .map((service, index) => ({
      id: service.id,
      latitude: service.address!.latitude,
      longitude: service.address!.longitude,
      title: service.fantasyName || service.responsible || `Parada ${index + 1}`,
      variant: service.serviceType === ServiceType.PICKUP ? 'coleta' as const :
        service.serviceType === ServiceType.DELIVERY ? 'entrega' as const : 'service' as const,
    }));

  // Adicionar origem se existir
  if (origin?.latitude && origin?.longitude) {
    mapPoints.unshift({
      id: 'origin',
      latitude: origin.latitude,
      longitude: origin.longitude,
      title: 'Origem',
      variant: 'coleta' as const,
    });
  }

  // Extrair geometrias das rotas como array (cada segmento é independente)
  const routeGeometries = routeSegments
    ?.filter(segment => segment.geometry)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map(segment => segment.geometry as string) ?? [];

  // Contar servicos por status
  const servicosRealizados = sortedServices.filter(s => s.status === ServiceStatus.COMPLETED).length;
  const servicosNaoRealizados = sortedServices.filter(s => s.status === ServiceStatus.CANCELED).length;
  const servicosPendentes = sortedServices.filter(
    s => s.status !== ServiceStatus.COMPLETED && s.status !== ServiceStatus.CANCELED
  ).length;

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator />
        <Text preset="textParagraph" marginTop="y16">Carregando...</Text>
      </Box>
    );
  }

  if (!routing) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" >
        <Text preset="text16" color="gray600" marginBottom="y8">
          Rota nao encontrada
        </Text>
        <TouchableOpacityBox onPress={() => router.back()}>
          <Text preset="text14" color="primary100">Voltar</Text>
        </TouchableOpacityBox>
      </Box>
    );
  }

  return (
    <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">
      {routing.name || `Rota ${routing.code || routing.id}`}
    </Text>}>
      <Box flex={1} backgroundColor="white" scrollable>
        <Box paddingTop="y12" paddingBottom="y16">


          {/* Status */}
          <Box
            alignSelf="flex-start"
            backgroundColor={routing.status === RoutingStatus.COMPLETED ? 'tertiary10' : 'redError'}
            paddingHorizontal="x12"
            paddingVertical="y4"
            borderRadius="s20"
          >
            <Text
              preset="text13"
              color={routing.status === RoutingStatus.COMPLETED ? 'tertiary100' : 'white'}
            >
              {mapRoutingStatus(routing.status)}
            </Text>
          </Box>
        </Box>

        {/* Mapa */}
        <Box>
          <Map
            height={measure.x260}
            points={mapPoints}
            geometries={routeGeometries}
            routeColor={colors.primary100}
            routeWidth={3}
            showNavigationButton={false}
          />
        </Box>

        {/* Resumo */}
        <Box marginBottom="y16">
          <Box
            flexDirection="row"
            flexWrap="wrap"
            gap="x12"
          >
            <Box
              backgroundColor="primary10"

              paddingVertical="y8"
              borderRadius="s20"
              borderWidth={measure.m1}
              borderColor="primary20"
            >
              <Text preset="text14" color="gray600">
                {routing.totalServices || sortedServices.length} paradas
              </Text>
            </Box>

            <Box
              backgroundColor="primary10"

              paddingVertical="y8"
              borderRadius="s20"
              borderWidth={measure.m1}
              borderColor="primary20"
            >
              <Text preset="text14" color="gray600">
                {formatarPreco(routing.totalValue)}
              </Text>
            </Box>

            <Box
              backgroundColor="gray50"

              paddingVertical="y8"
              borderRadius="s20"
              borderWidth={measure.m1}
              borderColor="gray200"
            >
              <Text preset="text14" color="gray600">
                {formatarDistancia(routing.totalDistanceKm)}
              </Text>
            </Box>

            <Box
              backgroundColor="gray50"

              paddingVertical="y8"
              borderRadius="s20"
              borderWidth={measure.m1}
              borderColor="gray200"
            >
              <Text preset="text14" color="gray600">
                {formatarTempo(routing.totalDurationMinutes)}
              </Text>
            </Box>
          </Box>
        </Box>

        {/* Contadores */}
        <Box marginBottom="y16">
          <Box flexDirection="row" gap="x16">
            <Box flex={1} backgroundColor="tertiary10" padding="y12" borderRadius="s12" alignItems="center">
              <Text preset="text20" fontWeightPreset="bold" color="tertiary100">
                {servicosRealizados}
              </Text>
              <Text preset="text12" color="tertiary100">Realizados</Text>
            </Box>

            <Box flex={1} backgroundColor="redError" padding="y12" borderRadius="s12" alignItems="center" opacity={0.9}>
              <Text preset="text20" fontWeightPreset="bold" color="white">
                {servicosNaoRealizados}
              </Text>
              <Text preset="text12" color="white">Nao realizados</Text>
            </Box>

            <Box flex={1} backgroundColor="gray100" padding="y12" borderRadius="s12" alignItems="center">
              <Text preset="text20" fontWeightPreset="bold" color="gray600">
                {servicosPendentes}
              </Text>
              <Text preset="text12" color="gray600">Pendentes</Text>
            </Box>
          </Box>
        </Box>

        {/* Divisor */}
        <Box height={measure.y1} backgroundColor="gray200" marginHorizontal="x16" marginBottom="y16" />

        {/* Lista de servicos */}
        <Box paddingBottom="y24">
          <Text preset="text16" fontWeightPreset="bold" color="colorTextPrimary" marginBottom="y12">
            Servicos ({sortedServices.length})
          </Text>

          {sortedServices.length === 0 ? (
            <Box paddingVertical="y24" alignItems="center">
              <Text preset="text14" color="gray400">Nenhum servico encontrado</Text>
            </Box>
          ) : (
            <Box gap="y12">
              {sortedServices.map((service, index) => {
                const statusColor = getStatusColor(service.status);
                const endereco = service.address?.formattedAddress || 'Endereco nao disponivel';

                return (
                  <Box
                    key={service.id}
                    backgroundColor="white"
                    borderRadius="s12"
                    padding="y16"
                    borderWidth={measure.m1}
                    borderColor="gray200"
                  >
                    <Box flexDirection="row" alignItems="flex-start">
                      {/* Numero da parada */}
                      <Box
                        width={measure.x32}
                        height={measure.y32}
                        borderRadius="s16"
                        backgroundColor="primary100"
                        justifyContent="center"
                        alignItems="center"
                        marginRight="x12"
                      >
                        <Text preset="text14" fontWeightPreset="bold" color="white">
                          {index + 1}
                        </Text>
                      </Box>

                      {/* Conteudo */}
                      <Box flex={1}>
                        <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="y4">
                          <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary">
                            {mapServiceType(service.serviceType as ServiceType)}
                          </Text>
                          <Box
                            backgroundColor={statusColor === 'tertiary100' ? 'tertiary10' : statusColor === 'redError' ? 'redError' : 'gray100'}
                            paddingHorizontal="x8"
                            paddingVertical="y2"
                            borderRadius="s8"
                          >
                            <Text
                              preset="text12"
                              color={statusColor === 'tertiary100' ? 'tertiary100' : statusColor === 'redError' ? 'white' : 'gray600'}
                            >
                              {mapServiceStatus(service.status as ServiceStatus)}
                            </Text>
                          </Box>
                        </Box>

                        <Text preset="text13" color="gray500" marginBottom="y4">
                          {service.fantasyName || service.responsible || 'Cliente'}
                        </Text>

                        <Text preset="text12" color="gray400">
                          {endereco}
                        </Text>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>

    </ScreenBase>

  );
}
