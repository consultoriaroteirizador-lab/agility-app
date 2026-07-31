import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';


import { ActivityIndicator, Box, Button, Text, TouchableOpacityBox, LocalIcon, ScreenBase, NavigationPopup } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import Modal from '@/components/Modal/Modal';
import { formatAddress } from '@/domain/agility/address/dto/response/address.response';
import { useFindOneAddress } from '@/domain/agility/address/useCase';
import { useGetMe } from '@/domain/agility/driver/useCase';
import { useCompleteRouting } from '@/domain/agility/routing/useCase';
import { ServiceType } from '@/domain/agility/service/dto/types';
import { useFindOneService, useFindServicesByRoutingId, useStartAttendance } from '@/domain/agility/service/useCase';
import { KEY_ROUTINGS, KEY_SERVICES } from '@/domain/queryKeys';
import { formatHHmm } from '@/functions';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { TransferOrderList } from '../../_components/TransferOrderList';
import { formatResumoDaNota, mapGrupoToParada, pathForServiceType, resolveNotaFiscalLabel, resolveParadaAtendida, resolvePedidosDaParada } from '../../_utils';

import { EquipmentList, StopActions, StopTabs } from './_components';
import { Map } from './_components/shared/Map';
import { useStopActions, useStopStatus, useUserLocation } from './_hooks';
import { getCurrentCoords } from './_hooks/getCurrentCoords';
import { TabType } from './_types/stop.types';
import { resolveCompanyRules } from './_utils/companyRules';
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
  const { services: allServices, isLoading: isLoadingServices } = useFindServicesByRoutingId(routeId || '');

  // Get address from service list as fallback
  const serviceFromList = allServices.find((s) => s.id === serviceId);
  const addressFromList = serviceFromList?.address ?? null;

  // Pedidos DESTA parada (mesma porta, contíguos). Mesma função (`resolvePedidosDaParada`,
  // que por sua vez usa `getParadasOrdenadas`) que o gate de "uma por vez" (useStopStatus)
  // usa — as duas precisam concordar sobre o que é "uma parada".
  const pedidosDaParada = useMemo(
    () => resolvePedidosDaParada(allServices, serviceId),
    [allServices, serviceId],
  );

  const isParadaAgrupada = pedidosDaParada.length > 1;

  // Cada nota é uma "parada de 1 pedido" para o card — inclusive o status dela.
  const notas = useMemo(
    () => pedidosDaParada.map((p, i) => mapGrupoToParada([p], i, null)),
    [pedidosDaParada],
  );

  // Rota do fluxo de entrega/coleta/serviço de cada nota — MESMO mapa
  // (`pathForServiceType`) do useEffect de auto-redirect abaixo para
  // DELIVERY/PICKUP/SERVICE. O grupo é sempre homogêneo em tipo (o tipo entra
  // na chave de agrupamento), então basta olhar o tipo do serviço corrente uma
  // vez. Calculado aqui (antes dos early returns) porque `handleOpenNota`
  // também precisa dele; `pathForServiceType` aceita `undefined` (loading).
  const rotaDaNota = pathForServiceType(service?.serviceType);

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

  // Regras configuráveis da empresa (uma parada por vez / ordem obrigatória) —
  // mesmas flags que o fluxo de entrega/coleta (ParadaContext) usa, pra o gating
  // ser consistente também nesta tela genérica.
  // `useGetMe` (GET /drivers/me) resolve o motorista logado seja ele funcionário
  // ou terceirizado — o antigo useGetProfile (/collaborators/profile) 404ava para
  // terceirizado e apagava a regra operacional para ele.
  const { me } = useGetMe();
  // Opt-out: mesma semântica do backend. Perfil ainda não carregado (rede ruim,
  // primeiro render) NÃO pode desligar a regra — na dúvida, ela vale.
  const rules = resolveCompanyRules(me?.companyFeatures);

  // Calculate stop status
  const stopStatus = useStopStatus({
    service,
    allServices,
    currentServiceId: serviceId,
    enforceSingleActiveStop: rules.enforceSingleActiveStop,
    enforceStopOrder: rules.enforceStopOrder,
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
  } = useStopActions({
    serviceId,
    routeId,
    serviceStatus: service?.status,
    isServiceInProgress: service?.isInProgress,
    serviceStartDate: service?.startDate ? String(service.startDate) : null,
  });

  // Query client hoisted aqui (em vez de perto do `completeRouting` mais abaixo)
  // porque o bloco de chegada da parada, logo a seguir, também precisa dele.
  const queryClient = useQueryClient();

  // ── Chegada da PARADA (Camada 3 — parada ≠ pedido) ────────────────────────
  // A parada está atendida quando QUALQUER nota já chegou (ou passou disso) —
  // mesma derivação que o `ParadaContext` usa para não pedir "Estou aqui" de
  // novo na nota 2. Enquanto falso, a tela troca a lista de notas pelo bloco de
  // chegada (ver ramo `isParadaAgrupada` mais abaixo).
  const paradaAtendida = resolveParadaAtendida(pedidosDaParada);

  // Ações de chegada amarradas ao REPRESENTANTE do grupo (`pedidosDaParada[0]`)
  // — é ele que registra a chegada na porta (§3 da spec: a 1ª nota entra em
  // atendimento na chegada; as demais, ao serem abertas — ver `handleOpenNota`).
  // NÃO reusa o `useStopActions` de cima (ligado a `serviceId`, o pid da
  // navegação): hoje os dois sempre coincidem, porque a lista da rota navega
  // para cá com `parada.serviceId` = `grupo[0].id` (`mapGrupoToParada`) — mas se
  // o itinerário for reordenado entre o fetch e o toque, este hook continua
  // certo mesmo assim, e o custo de mais uma instância do hook é irrelevante
  // (mutations não disparam nada até serem chamadas).
  const representanteDaParada = pedidosDaParada[0] ?? service;
  const representanteId = representanteDaParada?.id ?? serviceId;
  const {
    handleStartService: handleStartServiceParada,
    handleStartAttendance: handleStartAttendanceParada,
    isStarting: isStartingParada,
    isStartingAttendance: isStartingAttendanceParada,
  } = useStopActions({
    serviceId: representanteId,
    routeId,
    serviceStatus: representanteDaParada?.status,
    isServiceInProgress: representanteDaParada?.isInProgress,
    serviceStartDate: representanteDaParada?.startDate ? String(representanteDaParada.startDate) : null,
  });

  const { showToast } = useToastService();
  // Mesmo gate de "uma parada por vez"/ordem que `EtapaInicial` respeita — o
  // bloqueio continua valendo ENTRE portas; dentro da mesma porta some assim
  // que a primeira nota chega (`stopStatus` já agrupa por vizinhança).
  const isStartBlockedParada = stopStatus.startBlockReason !== null;
  const isEnRouteParada =
    representanteDaParada?.isInProgress === true || representanteDaParada?.status === 'IN_PROGRESS';

  const handleGoToLocationParada = useCallback(() => {
    if (isStartBlockedParada) {
      showToast({ message: stopStatus.startBlockReason!, type: 'error' });
      return;
    }
    handleStartServiceParada();
  }, [isStartBlockedParada, stopStatus.startBlockReason, showToast, handleStartServiceParada]);

  const handleArrivedParada = useCallback(() => {
    if (isStartBlockedParada) {
      showToast({ message: stopStatus.startBlockReason!, type: 'error' });
      return;
    }
    handleStartAttendanceParada();
  }, [isStartBlockedParada, stopStatus.startBlockReason, showToast, handleStartAttendanceParada]);

  // Abrir uma nota entra em atendimento (decisão do dono do produto, §3): o
  // motorista confere uma de cada vez, não todas juntas na chegada — é o que
  // o backend já sabe fazer por serviço, só o gate por-serviço impedia.
  const { startAttendance: startAttendanceDaNota } = useStartAttendance({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', routeId] });
    },
  });

  // `onOpen` do card do índice de notas. Só chama start-attendance quando a
  // nota AINDA NÃO está em atendimento (ou além) — o backend é idempotente para
  // IN_ATTENDANCE, mas a checagem evita uma chamada à toa a cada reabertura de
  // nota já em curso ou já terminal.
  const handleOpenNota = useCallback((pid: string) => {
    const pedido = pedidosDaParada.find((p) => p.id === pid);
    const jaAtendidaOuAlem = !!(
      pedido?.isInAttendance === true ||
      pedido?.status === 'IN_ATTENDANCE' ||
      pedido?.isCompleted === true ||
      pedido?.isCanceled === true ||
      pedido?.isFailed === true
    );

    if (pedido && !jaAtendidaOuAlem) {
      // Fire-and-forget: NÃO aguardamos a resposta antes de navegar — o
      // motorista já está olhando a nota que escolheu, travar a navegação numa
      // rede lenta pareceria a tela ter travado à toa. Falha aqui é só log (via
      // React Query); o pior caso é a nota ficar sem o registro incremental de
      // atendimento, recuperável reabrindo o card.
      void (async () => {
        const location = await getCurrentCoords();
        startAttendanceDaNota({ id: pid, location });
      })();
    }

    router.push({
      pathname: rotaDaNota,
      params: { id: routeId, pid },
    });
  }, [pedidosDaParada, rotaDaNota, routeId, router, startAttendanceDaNota]);

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

  // Complete routing mutation (`queryClient` já foi obtido acima, perto do bloco de chegada da parada)
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
    // Parada agrupada: esta tela é o ÍNDICE das notas. Só redireciona quando a
    // parada tem 1 pedido (comportamento idêntico ao de hoje). O guard de
    // isLoadingServices evita redirecionar antes de saber quantas notas são.
    if (isLoadingServices || isParadaAgrupada) return;

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

    // RETURN: parada final no CD/origem — check-in + conferência das devoluções.
    if (service.serviceType === ServiceType.RETURN) {
      router.replace({
        pathname: '/rotas-detalhadas/[id]/parada/[pid]/retorno' as never,
        params: { id: routeId, pid: serviceId },
      });
      return;
    }
  }, [service, isLoading, isError, router, routeId, serviceId, isLoadingServices, isParadaAgrupada]);

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
      [ServiceType.RETURN]: 'Retorno',
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
  // Fallback vazio (não '--:--') p/ não exibir horário quando não há ETA.
  const startTime = formatHHmm(service.estimatedArrival, '');
  const endTime = formatHHmm(service.estimatedCompletion, '');
  const horarioLabel = startTime && endTime ? `${startTime} - ${endTime}` : (startTime || endTime || '');
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

  if (isParadaAgrupada) {
    return (
      <ScreenBase
        scrollable
        buttonLeft={<ButtonBack />}
        title={
          <Text preset="text16" fontWeightPreset="semibold" color="colorTextPrimary" textAlign="center" numberOfLines={2}>
            {addressText}
          </Text>
        }
      >
        <Box flex={1} backgroundColor="white" pt="y8" px="x16" gap="y16">
          {!paradaAtendida ? (
            // Chegada da PORTA (Camada 3, §3): antes de ver as notas, o motorista
            // chega na parada — UMA vez, igual ao balcão. A lista de notas só
            // aparece depois (`paradaAtendida` vira true assim que a 1ª nota
            // entra em atendimento).
            <Box gap="y12" alignItems="center" pb="y24">
              <Box alignSelf="stretch">
                <Text preset="text15" fontWeightPreset="semibold" color="colorTextPrimary">{customerName}</Text>
                <Text preset="text13" color="gray600">
                  {notas.length} notas nesta parada — chegue na porta para ver a lista.
                </Text>
              </Box>
              <Button
                title={isStartingParada ? 'Iniciando...' : isEnRouteParada ? 'A caminho ✓' : 'Indo pra lá'}
                preset="outline"
                onPress={handleGoToLocationParada}
                disabled={isStartingParada || isStartingAttendanceParada || isEnRouteParada || isStartBlockedParada}
                width={measure.x330}
              />
              <Button
                title={isStartingAttendanceParada ? 'Iniciando atendimento...' : 'Estou aqui!'}
                onPress={handleArrivedParada}
                disabled={isStartingParada || isStartingAttendanceParada || isStartBlockedParada}
                width={measure.x330}
              />
              {isStartBlockedParada && (
                <Text preset="text13" color="redError" textAlign="center">
                  {stopStatus.startBlockReason}
                </Text>
              )}
            </Box>
          ) : (
            <>
              <Box>
                <Text preset="text15" fontWeightPreset="semibold" color="colorTextPrimary">{customerName}</Text>
                <Text preset="text13" color="gray600">
                  {notas.length} notas nesta parada — confirme uma de cada vez.
                </Text>
              </Box>

              <TransferOrderList
                paradas={notas}
                titulo={`Notas desta parada (${notas.length})`}
                openLabel="Abrir"
                notaFiscalDeCard={(nota, i) => resolveNotaFiscalLabel(pedidosDaParada[i])}
                statusDeCard={(nota) => nota.status}
                subtituloDeCard={(nota, i) => {
                  const janela = nota.promisedStartISO || nota.promisedEndISO
                    ? `Janela ${formatHHmm(nota.promisedStartISO)}–${formatHHmm(nota.promisedEndISO)}`
                    : null;
                  return formatResumoDaNota(i + 1, notas.length, janela);
                }}
                onOpen={handleOpenNota}
              />
            </>
          )}
        </Box>
      </ScreenBase>
    );
  }

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
              {serviceTypeLabel}{horarioLabel ? ` ${horarioLabel}` : ''}
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
