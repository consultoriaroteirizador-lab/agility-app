import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';


import { ActivityIndicator, Box, Button, Text, TouchableOpacityBox, LocalIcon, ScreenBase, NavigationPopup } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import Modal from '@/components/Modal/Modal';
import { formatAddress } from '@/domain/agility/address/dto/response/address.response';
import { useFindOneAddress } from '@/domain/agility/address/useCase';
import { useCompleteRouting } from '@/domain/agility/routing/useCase';
import { ServiceType } from '@/domain/agility/service/dto/types';
import { useFindOneService, useFindServicesByRoutingId } from '@/domain/agility/service/useCase';
import { KEY_ROUTINGS } from '@/domain/queryKeys';
import { formatHHmm } from '@/functions';
import { measure } from '@/theme';

import { EquipmentList, StopActions, StopTabs } from './_components';
import { Map } from './_components/shared/Map';
import { useStopActions, useStopStatus, useUserLocation } from './_hooks';
import { TabType } from './_types/stop.types';
import { isValidCoordinate } from './_utils/mapUtils';

/**
 * Stop Detail Screen
 * Displays detailed information about a stop/service
 */
export default function StopDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; pid: string }>();
  const routeId = params.id as string;
  const serviceId = params.pid as string;

  // Fetch service data
  const { service, isLoading, isError, refetch } = useFindOneService(serviceId || '');
  const { services: allServices } = useFindServicesByRoutingId(routeId || '');

  // Get address from service list as fallback
  const serviceFromList = allServices.find((s) => s.id === serviceId);
  const addressFromList = serviceFromList?.address ?? null;

  // Embedded address from service (when backend sends it)
  const embeddedAddress = service?.address ?? addressFromList ?? null;
  const shouldFetchAddress = !embeddedAddress && !!service?.addressId;

  // Fetch complete address only if not embedded
  const {
    address: fetchedAddress,
    isLoading: isLoadingAddress,
  } = useFindOneAddress(shouldFetchAddress ? service?.addressId || null : null);

  // Effective address used in the screen
  const address = embeddedAddress ?? fetchedAddress ?? null;

  // User location
  const { userLocation } = useUserLocation();

  // Calculate stop status
  const stopStatus = useStopStatus({
    service,
    allServices,
    currentServiceId: serviceId,
  });

  // Stop actions
  const {
    handleGoToLocation,
    handleStartAttendance,
    handleCompleteService,
    handleMarkAsFailed,
    isStarting,
    isStartingAttendance,
    isCompleting,
    isFailing,
  } = useStopActions({
    serviceId,
    routeId,
    serviceStatus: service?.status,
    isServiceInProgress: service?.isInProgress,
    serviceStartDate: service?.startDate ? String(service.startDate) : null,
  });

  // Local state
  const [activeTab, setActiveTab] = useState<TabType>('local');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [navModalVisible, setNavModalVisible] = useState(false);
  const [showConcluirRotaModal, setShowConcluirRotaModal] = useState(false);

  // `hasArrivedAtLocation` = está EM ATENDIMENTO (chegou no cliente). Derivado do
  // backend (IN_ATTENDANCE) — não há estado local. "Estou aqui" → start-attendance.
  // IN_PROGRESS é apenas "a caminho" e NÃO conta como chegada.
  const hasArrivedAtLocation = !!(
    service?.isInAttendance ||
    service?.status === 'IN_ATTENDANCE'
  );

  // Complete routing mutation
  const queryClient = useQueryClient();
  const {
    completeRouting,
    isLoading: isCompletingRouting,
  } = useCompleteRouting({
    onSuccess: async () => {
      setShowConcluirRotaModal(false);
      // Invalidar queries de rotas para recarregar a lista na tela principal
      await queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS] });
      router.replace('/(auth)/(tabs)');
    },
  });

  // Auto-redirect for DELIVERY and PICKUP service types
  useEffect(() => {
    if (isLoading || isError || !service) return;

    console.log('[StopDetailScreen] Service type:', service.serviceType);
    console.log('[StopDetailScreen] ServiceType enum:', ServiceType);

    const isDelivery = service.serviceType === ServiceType.DELIVERY;
    const isPickup = service.serviceType === ServiceType.PICKUP;

    if (isDelivery) {
      router.replace({
        pathname: '/rotas-detalhadas/[id]/parada/[pid]/entrega',
        params: { id: routeId, pid: serviceId },
      });
      return;
    }

    if (isPickup) {
      router.replace({
        pathname: '/rotas-detalhadas/[id]/parada/[pid]/coleta',
        params: { id: routeId, pid: serviceId },
      });
      return;
    }

    // Service types (INSTALLATION, MAINTENANCE, EXCHANGE)
    if (service.serviceType === ServiceType.SERVICE) {
      console.log('[StopDetailScreen] Redirecting to service');
      router.replace({
        pathname: '/rotas-detalhadas/[id]/parada/[pid]/service',
        params: { id: routeId, pid: serviceId },
      });
      return;
    }

    // TRANSFER (origem A → destino B): wizard de 2 pernas.
    // (pathname cast: rota nova entra no typegen do expo-router quando o Metro roda.)
    if (service.serviceType === ServiceType.TRANSFER) {
      router.replace({
        pathname: '/rotas-detalhadas/[id]/parada/[pid]/transfer' as never,
        params: { id: routeId, pid: serviceId },
      });
      return;
    }
  }, [service, isLoading, isError, router, routeId, serviceId]);

  // "Estou aqui" → inicia o ATENDIMENTO: PATCH /services/:id/start-attendance → IN_ATTENDANCE.
  // Aceito de qualquer estado pré-terminal (PENDING/ASSIGNED/IN_PROGRESS) — o motorista pode
  // ir direto ao cliente. Quando o refetch trouxer IN_ATTENDANCE, `hasArrivedAtLocation` flippa.
  const handleArrivedAtLocation = useCallback(() => {
    const alreadyAttending = service?.isInAttendance === true || service?.status === 'IN_ATTENDANCE';
    const isTerminal = service?.status === 'COMPLETED' || service?.status === 'CANCELED' || service?.status === 'FAILED';

    if (!alreadyAttending && !isTerminal) {
      handleStartAttendance();
    }
  }, [service, handleStartAttendance]);

  // Handle service completed navigation — usa o fluxo novo (service/) com checklist e
  // tratamento de requiresPayment. A rota legada dados-servico fica apenas como redirect.
  const handleServiceCompleted = useCallback(() => {
    router.push({
      pathname: '/rotas-detalhadas/[id]/parada/[pid]/service',
      params: { id: routeId, pid: serviceId },
    });
  }, [router, routeId, serviceId]);

  // Handle service not completed navigation
  const handleServiceNotCompleted = useCallback(() => {
    router.push({
      pathname: '/rotas-detalhadas/[id]/parada/[pid]/nao-realizado',
      params: { id: routeId, pid: serviceId },
    });
  }, [router, routeId, serviceId]);

  // Handle complete routing
  const handleCompleteRouting = useCallback(() => {
    setShowConcluirRotaModal(true);
  }, []);

  // Confirm complete routing
  const confirmCompleteRouting = useCallback(() => {
    completeRouting(routeId);
  }, [completeRouting, routeId]);

  // Map service type to label
  const getServiceTypeLabel = useCallback((): string => {
    if (!service) return 'Serviço';
    const typeMap: Record<ServiceType, string> = {
      [ServiceType.DELIVERY]: 'Entrega',
      [ServiceType.PICKUP]: 'Coleta',
      [ServiceType.SERVICE]: 'Serviço',
      [ServiceType.TRANSFER]: 'Transferência',
    };
    return typeMap[service.serviceType as ServiceType] ?? service.serviceType ?? 'Serviço';
  }, [service]);

  // Early returns AFTER all hooks
  if (!routeId || !serviceId) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <Text preset="text16" color="redError" mb="y8">
          Erro: Parâmetros da rota não encontrados
        </Text>
        <Text preset="text14" color="gray600" mb="y16">
          routeId: {routeId || 'N/A'}{'\n'}
          serviceId: {serviceId || 'N/A'}
        </Text>
        <Button title="Voltar" onPress={() => router.back()} width={measure.x330} />
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <ActivityIndicator />
        <Text mt="y16">Carregando parada...</Text>
      </Box>
    );
  }

  if (isError || !service) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <Text preset="text16" color="gray600" mb="y8">
          Parada não encontrada
        </Text>
        <Button title="Voltar" onPress={() => router.back()} width={measure.x330} />
      </Box>
    );
  }

  // Map data from backend
  const customerName = service.fantasyName ?? service.responsible ?? 'Cliente';
  const addressText = formatAddress(service?.address)
    ?? address?.formattedAddress
    ?? (service.addressId ? `Endereço ID: ${service.addressId}` : 'Endereço não disponível');
  const startTime = formatHHmm(service.estimatedArrival);
  const endTime = formatHHmm(service.estimatedCompletion);
  const serviceTypeLabel = getServiceTypeLabel();

  // Coordinates
  const latitude = service.address?.latitude ?? address?.latitude;
  const longitude = service.address?.longitude ?? address?.longitude;
  const hasValidCoords = isValidCoordinate(latitude, longitude);

  // Destination for navigation popup
  const navigationDestination = hasValidCoords && latitude && longitude ? {
    latitude,
    longitude,
    name: customerName,
    address: addressText,
    type: serviceTypeLabel,
  } : null;

  // Local tab content
  const localContent = (
    <Box gap="y16" pb="y24" alignItems='center'>
      {/* Customer Information */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" alignItems="center" gap="x8">
          <Box width={18} height={18} backgroundColor="gray300" borderRadius="s9" />
          <Text preset="text15" fontWeightPreset='semibold' color="colorTextPrimary">
            {customerName}
          </Text>
          {service.identificationCode && (
            <Text preset="text13" color="gray400">
              #{service.identificationCode}
            </Text>
          )}
        </Box>
        <Box flexDirection="row" gap="x12">
          {/* Chat button */}
          <TouchableOpacityBox
            backgroundColor="primary10"
            padding="y8"
            paddingHorizontal="x12"
            borderRadius="s8"
            borderWidth={1}
            borderColor="primary20"
            onPress={() => {
              router.push('/(auth)/(tabs)/menu/chat');
            }}
          >
            <LocalIcon iconName="chat" size={measure.m20} color="primary100" />
          </TouchableOpacityBox>

          {/* Phone button */}
          {service.clientPhone ? (
            <TouchableOpacityBox
              backgroundColor="tertiary10"
              padding="y8"
              paddingHorizontal="x12"
              borderRadius="s8"
              borderWidth={1}
              borderColor="tertiary100"
              onPress={() => {
                Linking.openURL(`tel:${service.clientPhone}`);
              }}
            >
              <LocalIcon iconName="phone" size={measure.m20} color="tertiary100" />
            </TouchableOpacityBox>
          ) : null}
        </Box>
      </Box>

      {/* Service Information */}
      <Box backgroundColor="gray50" p="y12" borderRadius="s12">
        <Text preset="text14" color="gray600">
          Serviço: {serviceTypeLabel}
        </Text>
      </Box>

      {/* Origem → Destino (TRANSFER ponto-a-ponto) */}
      {service.serviceType === ServiceType.TRANSFER && (service.pickupAddress || service.deliveryAddress) && (
        <Box backgroundColor="secondary10" p="y12" borderRadius="s12" gap="y8">
          <Box flexDirection="row" alignItems="center" gap="x8">
            <LocalIcon iconName="location" size={measure.m20} color="secondary100" />
            <Box flex={1}>
              <Text preset="text12" color="gray600">Origem (coleta)</Text>
              <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                {formatAddress(service.pickupAddress) ?? 'Origem não informada'}
              </Text>
            </Box>
          </Box>
          <Text preset="text16" color="secondary100" textAlign="center">↓</Text>
          <Box flexDirection="row" alignItems="center" gap="x8">
            <LocalIcon iconName="location" size={measure.m20} color="primary100" />
            <Box flex={1}>
              <Text preset="text12" color="gray600">Destino (entrega)</Text>
              <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                {formatAddress(service.deliveryAddress) ?? 'Destino não informado'}
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {/* Observation/Notes */}
      {service.problemDescription && (
        <Box>
          <Text preset="text14" fontWeightPreset='bold' color="gray600" mb="y8">
            Observação
          </Text>
          <Box backgroundColor="gray50" p="y12" borderRadius="s12">
            <Text preset="text14" color="colorTextPrimary">
              {service.problemDescription}
            </Text>
          </Box>
        </Box>
      )}

      {/* Action Buttons */}
      <StopActions
        {...stopStatus}
        hasArrivedAtLocation={hasArrivedAtLocation}
        isStarting={isStarting}
        isStartingAttendance={isStartingAttendance}
        isCompletingRouting={isCompletingRouting}
        onGoToLocation={handleGoToLocation}
        onArrivedAtLocation={handleArrivedAtLocation}
        onServiceCompleted={handleServiceCompleted}
        onServiceNotCompleted={handleServiceNotCompleted}
        onCompleteRouting={handleCompleteRouting}
      />
    </Box>
  );

  // Equipment tab content
  const equipmentContent = (
    <Box gap="y16" pb="y24">
      <EquipmentList materials={service?.materials || []} />
    </Box>
  );

  return (
    <ScreenBase
      scrollable
      buttonLeft={<ButtonBack />}
      title={
        <Text preset="text16" fontWeightPreset='semibold' color="colorTextPrimary" textAlign="center" numberOfLines={2}>
          {addressText}
        </Text>
      }
    >
      <Box flex={1} backgroundColor="white" pt="y8">
        {/* Time and type tags */}
        <Box flexDirection="row" justifyContent="center" gap="x12" mb="y12" px="x16">
          <Box backgroundColor="primary10" px="x12" py="y4" borderRadius="s20">
            <Text preset="text13" color="primary100">
              {serviceTypeLabel} {startTime} - {endTime}
            </Text>
          </Box>
        </Box>

        {/* Map */}
        <Map
          latitude={latitude ?? null}
          longitude={longitude ?? null}
          addressText={addressText}
          customerName={customerName}
          userLocation={userLocation}
          onNavigatePress={() => setNavModalVisible(true)}
          isLoadingAddress={isLoadingAddress}
        />

        <Box px="x16">
          <StopTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            localContent={localContent}
            equipmentContent={equipmentContent}
          />
        </Box>
      </Box>

      {/* Navigation Modal */}
      <NavigationPopup
        visible={navModalVisible}
        onClose={() => setNavModalVisible(false)}
        destination={navigationDestination}
      />

      {/* Concluir Rota Modal */}
      <Modal
        isVisible={showConcluirRotaModal}
        preset="action"
        title="Concluir rota"
        text="Deseja realmente concluir esta rota? Esta ação não pode ser desfeita."
        buttonActionTitle={isCompletingRouting ? 'Concluindo...' : 'Concluir'}
        buttonCloseTitle="Cancelar"
        onPress={confirmCompleteRouting}
        onClose={() => setShowConcluirRotaModal(false)}
      />
    </ScreenBase>
  );
}
