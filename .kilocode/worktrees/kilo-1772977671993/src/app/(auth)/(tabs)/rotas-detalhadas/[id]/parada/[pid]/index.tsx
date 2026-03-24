import { Component, ErrorInfo, ReactNode, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ActivityIndicator, Box, Button, Text, TouchableOpacityBox, LocalIcon, ScreenBase, LocalIconButton } from '@/components';
import Modal from '@/components/Modal/Modal';
import { useFindOneAddress } from '@/domain/agility/address/useCase';
import { FailureReason } from '@/domain/agility/service/dto';
import { ServiceStatus, ServiceType } from '@/domain/agility/service/dto/types';
import {
  useCompleteService,
  useFailService,
  useFindOneService,
  useFindServicesByRoutingId,
  useStartService,
} from '@/domain/agility/service/useCase';
import { KEY_SERVICES } from '@/domain/queryKeys';
import { measure } from '@/theme';

// Importar condicionalmente para evitar erro na web
// react-native-maps não é compatível com web
let MapView: any = null;
let Marker: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
  } catch (e) {
    console.warn('[ParadaDetalhadaScreen] react-native-maps não disponível:', e);
  }
}

type AppMap = 'waze' | 'googleMaps' | 'appleMaps';

// Error Boundary para capturar erros do mapa
class MapErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ParadaDetalhadaScreen] Erro no mapa:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box flex={1} justifyContent="center" alignItems="center" padding="y20">
          <Text preset="text15" textAlign="center" color="gray600">
            Não foi possível carregar o mapa.{'\n'}
            Use o endereço e o botão de navegação para chegar ao local.
          </Text>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default function ParadaDetalhadaScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id: string; pid: string }>();
  const rotaId = params.id as string;
  const serviceId = params.pid as string;

  const { service, isLoading, isError, refetch } = useFindOneService(serviceId || '');
  const { services: allServices } = useFindServicesByRoutingId(rotaId || '');

  // Buscar endereço na lista de serviços como fallback (já vem embedado lá)
  const serviceFromList = allServices.find((s) => s.id === serviceId);
  const addressFromList = serviceFromList?.address ?? null;

  // Endereço incorporado no service (quando o backend já envia)
  // Prioridade: service.address > serviceFromList.address > buscar via API
  const embeddedAddress = service?.address ?? addressFromList ?? null;
  const shouldFetchAddress = !embeddedAddress && !!service?.addressId;

  // Buscar endereço completo APENAS se não vier embedado
  const {
    address: fetchedAddress,
    isLoading: isLoadingAddress,
  } = useFindOneAddress(shouldFetchAddress ? service?.addressId || null : null);

  // Endereço efetivo usado na tela
  const address = embeddedAddress ?? fetchedAddress ?? null;

  // Estado para localização do usuário
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  // Buscar localização atual do usuário
  useEffect(() => {
    let isMounted = true;

    async function getCurrentLocation() {
      try {
        // Solicitar permissão
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[ParadaDetalhadaScreen] Permissão de localização negada');
          return;
        }

        // Pegar localização atual
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          setUserLocation(location);
          console.log('[ParadaDetalhadaScreen] Localização do usuário obtida:', {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.error('[ParadaDetalhadaScreen] Erro ao obter localização:', error);
      }
    }

    getCurrentLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  // Logs para debug do endereço
  useEffect(() => {
    console.log('[ParadaDetalhadaScreen] ===== DEBUG ENDEREÇO =====');
    console.log('[ParadaDetalhadaScreen] service?.address (do useFindOneService):', JSON.stringify(service?.address, null, 2));
    console.log('[ParadaDetalhadaScreen] serviceFromList?.address (da lista):', JSON.stringify(serviceFromList?.address, null, 2));
    console.log('[ParadaDetalhadaScreen] embeddedAddress (prioridade):', JSON.stringify(embeddedAddress, null, 2));
    console.log('[ParadaDetalhadaScreen] fetchedAddress (da API):', JSON.stringify(fetchedAddress, null, 2));
    console.log('[ParadaDetalhadaScreen] address FINAL (usado na tela):', JSON.stringify(address, null, 2));
    console.log('[ParadaDetalhadaScreen] address?.latitude:', address?.latitude);
    console.log('[ParadaDetalhadaScreen] address?.longitude:', address?.longitude);
    console.log('[ParadaDetalhadaScreen] address?.formattedAddress:', address?.formattedAddress);
    console.log('[ParadaDetalhadaScreen] =========================');
  }, [service?.address, serviceFromList?.address, embeddedAddress, fetchedAddress, address]);

  // Validação inicial dos parâmetros (APÓS todos os hooks)
  useEffect(() => {
    console.log('[ParadaDetalhadaScreen] ===== VALIDAÇÃO DE PARÂMETROS =====');
    console.log('[ParadaDetalhadaScreen] params recebidos:', params);
    console.log('[ParadaDetalhadaScreen] rotaId:', rotaId);
    console.log('[ParadaDetalhadaScreen] serviceId:', serviceId);
    console.log('[ParadaDetalhadaScreen] rotaId é válido?', !!rotaId);
    console.log('[ParadaDetalhadaScreen] serviceId é válido?', !!serviceId);
    console.log('[ParadaDetalhadaScreen] ====================================');

    if (!rotaId || !serviceId) {
      console.error('[ParadaDetalhadaScreen] ❌ ERRO: Parâmetros inválidos!', { rotaId, serviceId });
    }
  }, [params, rotaId, serviceId]);

  // Verificar se já existe outro serviço em progresso (diferente do atual)
  const hasOtherServiceInProgress = allServices.some(
    (s) => s.id !== serviceId && (s.isInProgress || s.status === ServiceStatus.IN_PROGRESS)
  );

  // Logs para debug
  useEffect(() => {
    console.log('[ParadaDetalhadaScreen] ===== DEBUG PARADA =====');
    console.log('[ParadaDetalhadaScreen] rotaId:', rotaId);
    console.log('[ParadaDetalhadaScreen] serviceId:', serviceId);
    console.log('[ParadaDetalhadaScreen] service:', JSON.stringify(service, null, 2));
    console.log('[ParadaDetalhadaScreen] allServices count:', allServices.length);
    console.log('[ParadaDetalhadaScreen] hasOtherServiceInProgress:', hasOtherServiceInProgress);
    console.log('[ParadaDetalhadaScreen] isLoading:', isLoading);
    console.log('[ParadaDetalhadaScreen] isError:', isError);
    console.log('[ParadaDetalhadaScreen] ========================');
  }, [rotaId, serviceId, service, allServices, hasOtherServiceInProgress, isLoading, isError]);

  const { startService } = useStartService({
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] });
      queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });
      // Refetch e navegar
      refetch();
      setTimeout(() => router.back(), 500);
    },
    onError: (error: any) => {
      // Se o serviço já foi iniciado, tratar como sucesso silenciosamente
      if (error?.error?.message?.includes('already been started') ||
        error?.error?.message?.includes('já foi iniciado') ||
        error?.error?.code === 'INTERNAL_ERROR') {
        // Invalidar queries e refetch silenciosamente
        queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] });
        queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });
        refetch();
        // Não mostrar erro, apenas atualizar a tela
        return;
      }
      // Para outros erros, mostrar mensagem
      console.error('Erro ao iniciar parada:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o serviço. Tente novamente.');
    },
  });

  const { completeService, isLoading: isCompletingService } = useCompleteService({
    onSuccess: () => {
      setPopupConcluirParada(false);
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] });
      queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });
      // Navegar de volta para a rota
      setTimeout(() => router.back(), 500);
    },
    onError: (error) => {
      console.error('Erro ao concluir parada:', error);
    },
  });

  // Usar o endpoint fail que permite COLLABORATOR_DRIVER
  const { failService, isLoading: isFailingService } = useFailService({
    onSuccess: async () => {
      setPopupInsucesso(false);
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] });
      queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });

      // Aguardar refetch explícito para garantir que os dados sejam atualizados
      await queryClient.refetchQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });

      // Navegar de volta para a rota após atualizar os dados
      setTimeout(() => router.back(), 500);
    },
    onError: (error) => {
      console.error('Erro ao marcar como insucesso:', error);
      Alert.alert(
        'Erro',
        'Não foi possível marcar o serviço como insucesso. Tente novamente.',
      );
    },
  });

  const [popupConcluirParada, setPopupConcluirParada] = useState(false);
  const [popupInsucesso, setPopupInsucesso] = useState(false);
  const [tab, setTab] = useState<'local' | 'equip'>('local');
  const [estouAquiClicado, setEstouAquiClicado] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [navModalVisible, setNavModalVisible] = useState(false);

  // VALIDAÇÃO CRÍTICA: Usar APENAS os campos booleanos do backend (fonte da verdade)
  // Não fazer fallback para enum status, pois os booleanos são calculados pelo backend
  const isPending = service?.isPending === true;
  const isInProgress = service?.isInProgress === true;
  const isCompleted = service?.isCompleted === true;
  const isCanceled = service?.isCanceled === true;

  // Validação de negócio: Não permitir iniciar se já existe outro serviço em progresso
  const canStartService = isPending && !hasOtherServiceInProgress;

  // Verificar se é a próxima parada (pendente ou atribuída)
  const ehProximaParada = isPending;

  // Resetar estado quando serviço muda para IN_PROGRESS
  useEffect(() => {
    if (isInProgress) {
      setEstouAquiClicado(false);
    }
    if (isCompleted) {
      setEstouAquiClicado(true);
    }
  }, [isInProgress, isCompleted]);

  // Logs adicionais para debug de status e validações
  useEffect(() => {
    if (service) {
      console.log('[ParadaDetalhadaScreen] Status e validações:', {
        status: service.status,
        isPending: service.isPending,
        isInProgress: service.isInProgress,
        isCompleted: service.isCompleted,
        isCanceled: service.isCanceled,
        computedIsPending: isPending,
        computedIsInProgress: isInProgress,
        computedIsCompleted: isCompleted,
        hasOtherServiceInProgress,
        canStartService,
        ehProximaParada,
      });
    }
  }, [service, isPending, isInProgress, isCompleted, hasOtherServiceInProgress, canStartService, ehProximaParada]);

  // Timeout de 10 segundos para o mapa carregar
  useEffect(() => {
    if (!mapReady && !mapError) {
      timeoutRef.current = setTimeout(() => {
        if (!mapReady) {
          console.warn('[ParadaDetalhadaScreen] Timeout ao carregar o mapa');
          setMapError(true);
        }
      }, 10000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [mapReady, mapError]);

  // Early returns APÓS todos os hooks
  if (!rotaId || !serviceId) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <Text preset="text16" color="redError" mb="y8">
          Erro: Parâmetros da rota não encontrados
        </Text>
        <Text preset="text14" color="gray600" mb="y16">
          rotaId: {rotaId || 'N/A'}{'\n'}
          serviceId: {serviceId || 'N/A'}
        </Text>
        <Button title="Voltar" onPress={() => router.back()} />
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
        <Button title="Voltar" onPress={() => router.back()} />
      </Box>
    );
  }

  // Mapear tipo de serviço
  const getServiceTypeLabel = () => {
    const typeMap: Record<ServiceType, string> = {
      [ServiceType.INSTALLATION]: 'Instalação',
      [ServiceType.DELIVERY]: 'Entrega',
      [ServiceType.MAINTENANCE]: 'Manutenção',
      [ServiceType.EXCHANGE]: 'Troca',
      [ServiceType.PICKUP]: 'Coleta',
    };
    return typeMap[service.serviceType as ServiceType] ?? service.serviceType ?? 'Serviço';
  };

  // Mapear dados EXATAMENTE como vêm do backend - sem transformações desnecessárias
  const nomeCliente = service.fantasyName ?? service.responsible ?? 'Cliente';
  // Usar endereço embedado do service primeiro, depois o buscado separadamente, depois apenas o ID
  const endereco = service.address?.formattedAddress
    ?? address?.formattedAddress
    ?? (service.addressId ? `Endereço ID: ${service.addressId}` : 'Endereço não disponível');
  const horarioInicio = service.scheduledStartTime ?? '--:--';
  const horarioFim = service.estimatedCompletionTime ?? '--:--';
  const tipoServico = getServiceTypeLabel();

  // Coordenadas do endereço: usar endereço embedado primeiro, depois o buscado separadamente
  const latitude = service.address?.latitude ?? address?.latitude;
  const longitude = service.address?.longitude ?? address?.longitude;

  // Coordenadas padrão (São Paulo) se não tiver endereço
  const defaultLatitude = -23.55052;
  const defaultLongitude = -46.63331;

  const mapLatitude = latitude ?? defaultLatitude;
  const mapLongitude = longitude ?? defaultLongitude;

  const isValidCoordinate = (lat: number | null | undefined, lng: number | null | undefined): boolean => {
    return (
      lat != null &&
      lng != null &&
      !Number.isNaN(lat) &&
      !Number.isNaN(lng) &&
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  };

  const hasValidCoords = isValidCoordinate(latitude, longitude);

  // Calcular região do mapa que inclua usuário e destino
  const calculateMapRegion = () => {
    const points: { latitude: number; longitude: number }[] = [];

    // Adicionar ponto de destino se válido
    if (hasValidCoords && latitude && longitude) {
      points.push({ latitude, longitude });
    }

    // Adicionar localização do usuário se disponível
    if (userLocation?.coords) {
      const userLat = userLocation.coords.latitude;
      const userLng = userLocation.coords.longitude;
      if (isValidCoordinate(userLat, userLng)) {
        points.push({ latitude: userLat, longitude: userLng });
      }
    }

    // Se não tiver pontos, usar coordenadas padrão
    if (points.length === 0) {
      return {
        latitude: mapLatitude,
        longitude: mapLongitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }

    // Se tiver apenas um ponto, usar ele com zoom padrão
    if (points.length === 1) {
      return {
        latitude: points[0].latitude,
        longitude: points[0].longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }

    // Se tiver dois pontos, calcular região que inclua ambos
    const minLat = Math.min(...points.map((p) => p.latitude));
    const maxLat = Math.max(...points.map((p) => p.latitude));
    const minLng = Math.min(...points.map((p) => p.longitude));
    const maxLng = Math.max(...points.map((p) => p.longitude));

    const latDelta = maxLat - minLat;
    const lngDelta = maxLng - minLng;

    // Adicionar padding de 20% em cada lado
    const padding = 0.2;
    const finalLatDelta = latDelta * (1 + padding * 2) || 0.01;
    const finalLngDelta = lngDelta * (1 + padding * 2) || 0.01;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(finalLatDelta, 0.01),
      longitudeDelta: Math.max(finalLngDelta, 0.01),
    };
  };

  const mapRegion = calculateMapRegion();

  // Mantido apenas para referência futura de fluxo; hoje não é usado diretamente
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleIniciarParada = () => {
    startService(serviceId);
  };

  const handleIrParaLa = () => {
    // Verificar se o serviço já está em progresso antes de tentar iniciar
    if (service?.isInProgress === true || service?.status === ServiceStatus.IN_PROGRESS || service?.startDate) {
      // Já está em progresso, apenas atualizar as queries
      queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] });
      queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });
      refetch();
      return;
    }

    // Validar se o status permite iniciar
    if (service?.status !== ServiceStatus.PENDING && service?.status !== ServiceStatus.ASSIGNED) {
      Alert.alert(
        'Aviso',
        `Não é possível iniciar o serviço. Status atual: ${service?.status || 'desconhecido'}`,
      );
      return;
    }

    // Iniciar serviço usando o endpoint correto para DRIVER
    startService(serviceId);
  };

  const handleEstouAqui = () => {
    // Se o serviço ainda não foi iniciado e está em status válido, iniciar primeiro
    const canStart = service?.status === ServiceStatus.PENDING || service?.status === ServiceStatus.ASSIGNED;
    const isAlreadyStarted = service?.isInProgress === true ||
      service?.status === ServiceStatus.IN_PROGRESS ||
      service?.startDate;

    if (!isAlreadyStarted && canStart) {
      startService(serviceId);
    }
    setEstouAquiClicado(true);
  };

  const handleRealizado = () => {
    // Navegar para tela de dados do serviço
    router.push({
      pathname: '/rotas-detalhadas/[id]/parada/[pid]/dados-servico',
      params: { id: rotaId, pid: serviceId },
    });
  };

  const handleNaoRealizado = () => {
    // Navegar para tela de tentativa de entrega (intermediária)
    router.push({
      pathname: '/rotas-detalhadas/[id]/parada/[pid]/tentativa-entrega',
      params: { id: rotaId, pid: serviceId },
    });
  };

  const handleConcluirParada = () => {
    completeService({ id: serviceId });
  };

  const handleMarcarInsucesso = () => {
    failService({
      id: serviceId,
      payload: {
        reason: FailureReason.OTHER, // Usar OTHER como padrão, pode ser customizado depois
        notes: `Insucesso registrado no serviço ${serviceId}`,
      },
    });
  };

  // Abrir app de navegação escolhido pelo motorista
  const handleOpenDeviceMap = async (app: AppMap) => {
    if (!hasValidCoords || !latitude || !longitude) {
      Alert.alert('Aviso', 'Coordenadas do endereço não disponíveis.');
      return;
    }

    const lat = latitude;
    const lng = longitude;

    // Valida coordenadas
    if (
      lat == null ||
      lng == null ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      Alert.alert('Erro', 'Coordenadas inválidas para este endereço');
      return;
    }

    const latLng = `${lat},${lng}`;
    const label = encodeURIComponent(endereco || '');
    let url: string | undefined;

    try {
      switch (app) {
        case 'waze':
          url = `waze://?ll=${latLng}&navigate=yes`;
          if (!(await Linking.canOpenURL(url))) {
            url = `https://waze.com/ul?ll=${latLng}&navigate=yes`;
          }
          break;
        case 'googleMaps':
          url =
            Platform.OS === 'ios'
              ? `comgooglemaps://?q=${latLng}`
              : `https://www.google.com/maps/search/?api=1&query=${latLng}`;
          break;
        case 'appleMaps':
          url = `maps://?q=${latLng}(${label})`;
          break;
      }

      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Erro', 'Não foi possível abrir o aplicativo de mapas');
        }
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o aplicativo de mapas');
    } finally {
      setNavModalVisible(false);
    }
  };

  return (
    <ScreenBase
      scrollable
      mtScreenBase="t0"
      mbScreenBase="b0"
      marginHorizontalScreenBase="x0"
      buttonLeft={
        <LocalIconButton
          size={measure.x24}
          onPress={() => router.back()}
          iconName="backArrow"
          color="primary100"
        />
      }
      title={
        <Text preset="text16" fontWeightPreset='semibold' color="colorTextPrimary" textAlign="center" numberOfLines={2}>
          {endereco}
        </Text>
      }
    >
      <Box flex={1} bg="white" pt="y8">
        {/* Tags de horário e tipo */}
        <Box flexDirection="row" justifyContent="center" gap="x12" mb="y12" px="x16">
          <Box bg="primary10" px="x12" py="y4" borderRadius="s20">
            <Text preset="text13" color="primary100">
              {tipoServico} {horarioInicio} - {horarioFim}
            </Text>
          </Box>
        </Box>

        {/* Mapa nativo: Apple Maps no iOS, Google Maps no Android */}
        <MapErrorBoundary>
          <Box height={measure.y180} mb="y16" position="relative" borderRadius="s12" overflow="hidden">
            {isLoadingAddress ? (
              <Box flex={1} bg="gray100" justifyContent="center" alignItems="center">
                <ActivityIndicator />
              </Box>
            ) : !hasValidCoords ? (
              <Box flex={1} bg="gray100" justifyContent="center" alignItems="center">
                <Text preset="text14" color="gray400">Coordenadas não disponíveis</Text>
              </Box>
            ) : mapError && !mapReady ? (
              <Box flex={1} bg="gray100" justifyContent="center" alignItems="center" padding="y20">
                <Text preset="text15" textAlign="center" color="gray600">
                  Não foi possível carregar o mapa.{'\n'}
                  Use o endereço e o botão de navegação para chegar ao local.
                </Text>
              </Box>
            ) : (
              <>
                {!mapReady && (
                  <Box
                    flex={1}
                    justifyContent="center"
                    alignItems="center"
                    position="absolute"
                    top={measure.t0}
                    left={measure.l0}
                    right={measure.r0}
                    bottom={measure.b0}
                    zIndex={1}
                  >
                    <ActivityIndicator />
                    <Text preset="text15" color="gray600" mt="y10">
                      Carregando mapa...
                    </Text>
                  </Box>
                )}
                <MapView
                  provider={PROVIDER_DEFAULT}
                  initialRegion={mapRegion}
                  style={{ flex: 1, opacity: mapReady ? 1 : 0 }}
                  onMapReady={() => {
                    if (timeoutRef.current) {
                      clearTimeout(timeoutRef.current);
                    }
                    setMapReady(true);
                  }}
                  loadingEnabled
                  loadingIndicatorColor="secondary100"
                >
                  {/* Marcador da localização do usuário */}
                  {userLocation?.coords &&
                    isValidCoordinate(userLocation.coords.latitude, userLocation.coords.longitude) && (
                      <Marker
                        coordinate={{
                          latitude: userLocation.coords.latitude,
                          longitude: userLocation.coords.longitude,
                        }}
                        title="Sua localização"
                        description="Você está aqui"
                        pinColor="blue"
                      />
                    )}

                  {/* Marcador do destino (parada) */}
                  {hasValidCoords && latitude && longitude && (
                    <Marker
                      coordinate={{
                        latitude,
                        longitude,
                      }}
                      title={nomeCliente}
                      description={endereco}
                      pinColor="red"
                    />
                  )}
                </MapView>
              </>
            )}
            {/* Botão de navegação com ícone */}
            {hasValidCoords && (
              <Box position="absolute" right={measure.r16} top={measure.y100}>
                <TouchableOpacityBox
                  bg="white"
                  p="y10"
                  borderRadius="s16"
                  borderWidth={measure.m1}
                  borderColor="primary100"
                  onPress={() => setNavModalVisible(true)}
                >
                  <LocalIcon iconName="location" size={measure.m24} color="primary100" />
                </TouchableOpacityBox>
              </Box>
            )}
          </Box>
        </MapErrorBoundary>

        <Box px="x16">
          {/* Tabs Local/Equipamentos */}
          <Box flexDirection="row" justifyContent="center" gap="x24" mb="y16" borderBottomWidth={1} borderBottomColor="gray200">
            <TouchableOpacityBox
              pb="y8"
              borderBottomWidth={tab === 'local' ? 2 : 0}
              borderBottomColor={tab === 'local' ? 'primary100' : 'transparent'}
              onPress={() => setTab('local')}
            >
              <Text
                preset="text15"
                color={tab === 'local' ? 'primary100' : 'gray400'}
                fontWeight={tab === 'local' ? '600' : '400'}
              >
                Local
              </Text>
            </TouchableOpacityBox>
            <TouchableOpacityBox
              pb="y8"
              borderBottomWidth={tab === 'equip' ? 2 : 0}
              borderBottomColor={tab === 'equip' ? 'primary100' : 'transparent'}
              onPress={() => setTab('equip')}
            >
              <Text
                preset="text15"
                color={tab === 'equip' ? 'primary100' : 'gray400'}
                fontWeight={tab === 'equip' ? '600' : '400'}
              >
                Equipamentos
              </Text>
            </TouchableOpacityBox>
          </Box>

          {/* ABA LOCAL */}
          {tab === 'local' && (
            <Box gap="y16" pb="y24">
              {/* Informações do Cliente */}
              <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Box flexDirection="row" alignItems="center" gap="x8">
                  <Box width={measure.x18} height={measure.y18} bg="gray300" borderRadius="s9" />
                  <Text preset="text15" fontWeightPreset='semibold' color="colorTextPrimary">
                    {nomeCliente}
                  </Text>
                  {service.identificationCode && (
                    <Text preset="text13" color="gray400">
                      #{service.identificationCode}
                    </Text>
                  )}
                </Box>
                <Box flexDirection="row" gap="x12">
                  {/* Botao de chat */}
                  <TouchableOpacityBox
                    backgroundColor="primary10"
                    padding="y8"
                    paddingHorizontal="x12"
                    borderRadius="s8"
                    borderWidth={measure.m1}
                    borderColor="primary20"
                    onPress={() => {
                      router.push('/(auth)/(tabs)/menu/chat');
                    }}
                  >
                    <LocalIcon iconName="chat" size={measure.m20} color="primary100" />
                  </TouchableOpacityBox>

                  {/* Botao de telefone */}
                  {service.clientPhone ? (
                    <TouchableOpacityBox
                      backgroundColor="tertiary10"
                      padding="y8"
                      paddingHorizontal="x12"
                      borderRadius="s8"
                      borderWidth={measure.m1}
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

              {/* Informações do Serviço */}
              <Box bg="gray50" p="y12" borderRadius="s12">
                <Text preset="text14" color="gray600">
                  Serviço: {tipoServico}
                </Text>
              </Box>

              {/* Objetivo/Observações */}
              {service.problemDescription && (
                <Box>
                  <Text preset="text14" fontWeightPreset='bold' color="gray600" mb="y8">
                    Observação
                  </Text>
                  <Box bg="gray50" p="y12" borderRadius="s12">
                    <Text preset="text14" color="colorTextPrimary">
                      {service.problemDescription}
                    </Text>
                  </Box>
                </Box>
              )}

              {/* Botões de Ação */}
              <Box gap="y12" mt="y16">
                {/* Se não é a próxima parada, mostrar apenas "Indo pra lá" (se ainda não iniciou) */}
                {!ehProximaParada && !isInProgress && (
                  <Button
                    title="Indo pra lá"
                    preset="outline"
                    onPress={handleIrParaLa}
                  />
                )}

                {/* Se é a próxima parada e ainda não iniciou */}
                {ehProximaParada && !isInProgress && !estouAquiClicado && (
                  <>
                    {hasOtherServiceInProgress && (
                      <Box bg="alertColor" p="y12" borderRadius="s12" mb="y8">
                        <Text preset="text13" color="alertColor" textAlign="center">
                          ⚠️ Já existe uma parada em andamento. Conclua a parada atual antes de iniciar outra.
                        </Text>
                      </Box>
                    )}
                    <Button
                      title="Indo pra lá"
                      preset="outline"
                      onPress={handleIrParaLa}
                      disabled={hasOtherServiceInProgress}
                    />
                    <Button
                      title="Estou aqui!"
                      onPress={handleEstouAqui}
                      disabled={hasOtherServiceInProgress}
                    />
                  </>
                )}

                {/* Se está em andamento e clicou em "Estou aqui" */}
                {isInProgress && estouAquiClicado && !isCompleted && (
                  <>
                    <Button
                      title="Realizado"
                      onPress={handleRealizado}
                    />
                    <Button
                      title="Não realizado"
                      preset="outline"
                      onPress={handleNaoRealizado}
                    />
                  </>
                )}

                {/* Se está em andamento mas ainda não clicou em "Estou aqui" */}
                {isInProgress && !estouAquiClicado && !isCompleted && (
                  <Button
                    title="Estou aqui!"
                    onPress={handleEstouAqui}
                  />
                )}

                {/* Se está concluída */}
                {isCompleted && (
                  <Box bg="tertiary10" p="y16" borderRadius="s12" alignItems="center">
                    <Text preset="text14" color="tertiary100" fontWeightPreset='semibold'>
                      Parada concluída com sucesso
                    </Text>
                  </Box>
                )}

                {/* Se está cancelada */}
                {isCanceled && (
                  <Box bg="redError" p="y16" borderRadius="s12" alignItems="center">
                    <Text preset="text14" color="redError" fontWeightPreset='semibold'>
                      Parada marcada como insucesso
                    </Text>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* ABA EQUIPAMENTOS */}
          {tab === 'equip' && (
            <Box gap="y16" pb="y24">
              {/* Lista de equipamentos se disponivel */}
              {service.equipments && service.equipments.length > 0 ? (
                <>
                  <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary" mb="y8">
                    Equipamentos ({service.equipments.length})
                  </Text>
                  {service.equipments.map((equipment: any, index: number) => (
                    <Box
                      key={equipment.id || index}
                      bg="gray50"
                      p="y12"
                      borderRadius="s12"
                      borderWidth={measure.m1}
                      borderColor="gray200"
                    >
                      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                        <Box flex={1}>
                          <Text preset="text14" fontWeightPreset="500" color="colorTextPrimary">
                            {equipment.name || equipment.type || 'Equipamento'}
                          </Text>
                          {equipment.serialNumber && (
                            <Text preset="text12" color="gray500" mt="y2">
                              S/N: {equipment.serialNumber}
                            </Text>
                          )}
                          {equipment.model && (
                            <Text preset="text12" color="gray400" mt="y2">
                              Modelo: {equipment.model}
                            </Text>
                          )}
                        </Box>
                        {equipment.quantity && (
                          <Box bg="primary100" px="x8" py="y4" borderRadius="s8">
                            <Text preset="text12" fontWeightPreset="bold" color="white">
                              x{equipment.quantity}
                            </Text>
                          </Box>
                        )}
                      </Box>
                      {equipment.description && (
                        <Text preset="text13" color="gray600" mt="y8">
                          {equipment.description}
                        </Text>
                      )}
                    </Box>
                  ))}
                </>
              ) : (
                <Box alignItems="center" py="y32">
                  <Box
                    width={measure.x64}
                    height={measure.y64}
                    borderRadius="s32"
                    bg="gray100"
                    justifyContent="center"
                    alignItems="center"
                    mb="y12"
                  >
                    <LocalIcon iconName="box" size={32} color="gray400" />
                  </Box>
                  <Text preset="text14" color="gray400" textAlign="center">
                    Nenhum equipamento registrado{'\n'}para esta parada.
                  </Text>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Modal de confirmação - Concluir parada */}
      <Modal
        isVisible={popupConcluirParada}
        title="Concluir parada"
        text="Deseja realmente concluir esta parada?"
        preset="action"
        buttonActionTitle={isCompletingService ? 'Concluindo...' : 'Concluir'}
        buttonCloseTitle="Cancelar"
        onPress={handleConcluirParada}
        onClose={() => setPopupConcluirParada(false)}
      />

      {/* Modal de confirmação - Marcar insucesso */}
      <Modal
        isVisible={popupInsucesso}
        title="Marcar como insucesso"
        text="Deseja realmente marcar esta parada como insucesso?"
        preset="action"
        buttonActionTitle={isFailingService ? 'Marcando...' : 'Confirmar'}
        buttonCloseTitle="Cancelar"
        onPress={handleMarcarInsucesso}
        onClose={() => setPopupInsucesso(false)}
      />

      {/* Modal de escolha de navegação */}
      <Modal
        isVisible={navModalVisible}
        onClose={() => setNavModalVisible(false)}
        title="Como você quer navegar?"
      >
        <Box padding="y10" alignItems="center">
          <Text preset="text14" color="gray600" mb="y20" textAlign="center">
            Escolha o aplicativo de navegação para ir até o endereço da parada.
          </Text>

          <Box flexDirection="row" justifyContent="space-around" width="100%" mb="y16">
            <TouchableOpacityBox
              alignItems="center"
              flex={1}
              onPress={() => handleOpenDeviceMap('waze')}
            >
              <Box
                borderRadius="s8"
                justifyContent="center"
                alignItems="center"
                width={measure.x48}
                height={measure.y48}
                bg="primary10"
                mb="y4"
              >
                <Text preset="text18" color="primary100">
                  W
                </Text>
              </Box>
              <Text preset="text13" color="gray700">
                Waze
              </Text>
            </TouchableOpacityBox>

            <TouchableOpacityBox
              alignItems="center"
              flex={1}
              onPress={() => handleOpenDeviceMap('googleMaps')}
            >
              <Box
                borderRadius="s8"
                justifyContent="center"
                alignItems="center"
                width={measure.x48}
                height={measure.y48}
                bg="primary10"
                mb="y4"
              >
                <Text preset="text18" color="primary100">
                  G
                </Text>
              </Box>
              <Text preset="text13" color="gray700">
                Google Maps
              </Text>
            </TouchableOpacityBox>

            {Platform.OS === 'ios' && (
              <TouchableOpacityBox
                alignItems="center"
                flex={1}
                onPress={() => handleOpenDeviceMap('appleMaps')}
              >
                <Box
                  borderRadius="s8"
                  justifyContent="center"
                  alignItems="center"
                  width={measure.x48}
                  height={measure.y48}
                  bg="primary10"
                  mb="y4"
                >
                  <Text preset="text18" color="primary100">
                    A
                  </Text>
                </Box>
                <Text preset="text13" color="gray700">
                  Apple Maps
                </Text>
              </TouchableOpacityBox>
            )}
          </Box>

          <Button
            preset="outline"
            title="Fechar"
            onPress={() => setNavModalVisible(false)}
          />
        </Box>
      </Modal>
    </ScreenBase>
  );
}
