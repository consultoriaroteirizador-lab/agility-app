import { useState, useEffect } from 'react';
import { Platform, Linking } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Box, TouchableOpacityBox, Button, Text, ActivityIndicator, Input, ScreenBase, LocalIconButton, RecipientType } from '@/components';
import { DocumentCollectionForm, DocumentData } from '@/components/DocumentCollectionForm';
import { LocalIcon } from '@/components/Icon/LocalIcon';
import Modal from '@/components/Modal/Modal';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { formatAddress } from '@/domain/agility/address/dto';
import { ServiceStatus } from '@/domain/agility/service/dto';
import { serviceService } from '@/domain/agility/service/serviceService';
import { uploadMultipleServicePhotos, uploadSignature } from '@/domain/agility/service/serviceUploadUtils';
import { useCompleteServiceWithDetails, useFindOneService, useStartService } from '@/domain/agility/service/useCase';
import { KEY_ROUTINGS, KEY_SERVICES } from '@/domain/queryKeys';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';


type AppMap = 'waze' | 'googleMaps' | 'appleMaps';

export default function DadosEntregaScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
  const rotaId = id as string;
  const serviceId = pid as string;
  const { showToast } = useToastService();

  const { service, isLoading: isLoadingService, refetch } = useFindOneService(serviceId);

  // Estados do fluxo de 5 etapas
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [estouAqui, setEstouAqui] = useState(false);
  const [entreguei, setEntreguei] = useState(false);
  const [recipientType, setRecipientType] = useState<RecipientType | null>(null);

  // Estados do formulario
  const [documentData, setDocumentData] = useState<DocumentData>({
    recipientName: '',
    documentType: 'RG',
    documentNumber: '',
  });
  const [observation, setObservation] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [checklist, setChecklist] = useState({
    documento: false,
    foto: false,
    signature: false,
  });
  const [finalizing, setFinalizing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<number, { loaded: number; total: number; percentage: number }>>(new Map());
  const [navModalVisible, setNavModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  const { startService } = useStartService({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] });
      queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });
      refetch();
    },
    onError: (error: unknown) => {
      console.error('Erro ao iniciar servico:', error);
    },
  });

  const { completeServiceWithDetails, isLoading: isCompletingWithDetails } = useCompleteServiceWithDetails({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] }),
        queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] }),
        queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, rotaId] }),
      ]);
      queryClient.refetchQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });
      queryClient.refetchQueries({ queryKey: [KEY_ROUTINGS, rotaId] });

      setFinalizing(false);
      setShowSuccess(true);
      setTimeout(() => {
        router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}`);
      }, 2500);
    },
    onError: (error: unknown) => {
      setFinalizing(false);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        || (error as { message?: string })?.message
        || 'Erro ao enviar dados de finalizacao da entrega.';
      console.error('Erro ao completar entrega:', error);
      showToast({ message: errorMessage, type: 'error' });
    },
  });

  // Buscar localizacao do usuario
  useEffect(() => {
    let isMounted = true;

    async function getCurrentLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[DadosEntrega] Permissao de localizacao negada');
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          setUserLocation(location);
        }
      } catch (error) {
        console.error('[DadosEntrega] Erro ao obter localizacao:', error);
      }
    }

    getCurrentLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  // Se o servico ja esta em progresso, pular para ETAPA 2
  useEffect(() => {
    if (!service) return;

    const isServiceStarted = service.status === ServiceStatus.IN_PROGRESS || service.startDate;

    if (isServiceStarted && etapa === 1) {
      setEtapa(2);
      setEstouAqui(true);
    }
  }, [service, etapa]);

  // Preencher nome automaticamente quando selecionar "cliente"
  useEffect(() => {
    if (recipientType === 'cliente' && service) {
      const nomeCliente = service.fantasyName || service.responsible;
      if (nomeCliente) {
        setDocumentData(prev => ({ ...prev, recipientName: nomeCliente }));
      }
    } else if (recipientType !== 'cliente') {
      setDocumentData(prev => ({ ...prev, recipientName: '' }));
    }
  }, [recipientType, service]);

  // Atualizar checklist quando campos mudam
  useEffect(() => {
    const docOk = documentData.recipientName.trim().length > 0
      && documentData.documentType.trim().length > 0
      && documentData.documentNumber.trim().length > 0;
    setChecklist((prev) => ({ ...prev, documento: docOk }));
  }, [documentData]);

  useEffect(() => {
    setChecklist((prev) => ({ ...prev, foto: photos.length > 0 }));
  }, [photos]);

  useEffect(() => {
    setChecklist((prev) => ({ ...prev, signature: !!signature }));
  }, [signature]);

  // Solicitar permissoes de midia
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showToast({ message: 'Precisamos de permissao para acessar suas photos!', type: 'error' });
        }
      }
    })();
  }, []);

  // Abrir app de navegacao
  const handleOpenDeviceMap = async (app: AppMap) => {
    const latitude = service?.address?.latitude;
    const longitude = service?.address?.longitude;

    if (!latitude || !longitude) {
      showToast({ message: 'Coordenadas do endereco nao disponiveis.', type: 'error' });
      return;
    }

    const latLng = `${latitude},${longitude}`;
    const label = encodeURIComponent(service?.address?.formattedAddress || '');
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
          showToast({ message: 'Nao foi possivel abrir o aplicativo de mapas', type: 'error' });
        }
      }
    } catch {
      showToast({ message: 'Nao foi possivel abrir o aplicativo de mapas', type: 'error' });
    } finally {
      setNavModalVisible(false);
    }
  };

  // Upload de photos
  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0) return [];

    try {
      setUploadProgress(new Map());

      const onUploadProgress = (progress: { loaded: number; total: number; percentage: number } | null, index: number) => {
        if (progress) {
          setUploadProgress(new Map(uploadProgress).set(index, progress));
        }
      };

      const urls = await uploadMultipleServicePhotos(
        photos,
        serviceId,
        'before',
        onUploadProgress,
      );

      setUploadProgress(new Map());
      return urls;
    } catch (error) {
      console.error('Erro ao fazer upload de photos:', error);
      showToast({ message: 'Nao foi possivel fazer upload das photos.', type: 'error' });
      return [];
    }
  };

  // Upload de signature
  const uploadSignatureHandler = async (base64Signature: string): Promise<string | null> => {
    if (!base64Signature) return null;

    try {
      const url = await uploadSignature(base64Signature, serviceId);
      return url;
    } catch (error) {
      console.error('Erro ao fazer upload da signature:', error);
      showToast({ message: 'Nao foi possivel fazer upload da signature.', type: 'error' });
      return null;
    }
  };

  // Iniciar servico
  const handleStartService = () => {
    const isAlreadyStarted = service?.status === ServiceStatus.IN_PROGRESS || service?.startDate;
    if (!isAlreadyStarted) {
      startService(serviceId);
    }
  };

  // Finalizar entrega
  const handleFinalizar = async () => {
    if (!checklist.documento || !checklist.foto || !checklist.signature) {
      showToast({ message: 'Recolha todos os dados necessarios antes de finalizar.', type: 'error' });
      return;
    }

    try {
      setFinalizing(true);

      // Upload de photos
      const photoUrls = await uploadPhotos();

      // Upload de signature
      const signatureUrl = signature ? await uploadSignatureHandler(signature) : null;

      // Preparar payload
      const payload: Record<string, string> = {};

      if (observation.trim()) {
        payload.notes = observation.trim();
      }

      if (signatureUrl) {
        payload.customerSignature = signatureUrl;
      }

      if (documentData.recipientName.trim()) {
        payload.receivedBy = documentData.recipientName.trim();
      }

      if (photoUrls.length > 0) {
        payload.photoProof = photoUrls.length === 1 ? photoUrls[0] : photoUrls.join(',');
      }

      // Verificar se o servico precisa ser iniciado
      const needsToStart = !service ||
        (service.status !== ServiceStatus.IN_PROGRESS &&
          service.status !== ServiceStatus.COMPLETED);

      if (needsToStart) {
        showToast({ message: 'Servico precisa ser iniciado primeiro', type: 'error' });
        setFinalizing(false);
        return;
      }

      // PASSO 1: Completar o serviço (mudar status para COMPLETED)
      const needsToComplete = !service || service.status !== ServiceStatus.COMPLETED;

      if (needsToComplete) {
        await serviceService.complete(serviceId);
        await queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] });
        await queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });
      }

      // PASSO 2: Enviar detalhes de conclusão
      completeServiceWithDetails({
        id: serviceId,
        details: payload,
      });
    } catch (e) {
      console.error(e);
      showToast({ message: 'Ocorreu um erro ao finalizar a entrega.', type: 'error' });
      setFinalizing(false);
    }
  };

  // Dados do servico
  const nomeCliente = service?.fantasyName || service?.responsible || 'Cliente';
  const endereco = formatAddress(service?.address) || 'Endereco nao disponivel';
  const latitude = service?.address?.latitude;
  const longitude = service?.address?.longitude;
  const hasValidCoords = latitude && longitude;

  // Loading
  if (isLoadingService) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator />
        <Text preset="textParagraph" marginTop="y16">Carregando...</Text>
      </Box>
    );
  }

  // Tela de sucesso
  if (showSuccess) {
    return (
      <Box flex={1} backgroundColor="primary100" justifyContent="center" alignItems="center">
        <Box width={measure.x12} height={measure.y12} backgroundColor="tertiary100" borderRadius="s6" marginBottom="y40" />
        <Text preset="text18" color="white" textAlign="center">
          Entrega realizada{'\n'}com sucesso
        </Text>
      </Box>
    );
  }

  // ETAPA 1: "Indo pra la" e "Estou aqui!"
  const renderEtapa1 = () => (
    <ScreenBase
      scrollable
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
        <Text preset="text16" fontWeight="500" color="colorTextPrimary" textAlign="center" numberOfLines={2}>
          {endereco}
        </Text>
      }
    >
      <Box flex={1} backgroundColor="white" pt="y8">
        {/* Tag de tipo */}
        <Box flexDirection="row" justifyContent="center" gap="x12" marginBottom="y12" paddingHorizontal="x16">
          <Box backgroundColor="primary10" paddingHorizontal="x12" paddingVertical="y4" borderRadius="s20">
            <Text preset="text13" color="primary100">Entrega</Text>
          </Box>
          {service?.scheduledStartTime && (
            <Box backgroundColor="gray100" paddingHorizontal="x12" paddingVertical="y4" borderRadius="s20">
              <Text preset="text13" color="gray800">{service.scheduledStartTime}</Text>
            </Box>
          )}
        </Box>

        {/* Mapa placeholder */}
        <Box height={measure.y180} marginHorizontal="x16" marginBottom="y16" borderRadius="s12" overflow="hidden" backgroundColor="gray100">
          {hasValidCoords ? (
            <Box flex={1} justifyContent="center" alignItems="center">
              <Text preset="text14" color="gray400">Mapa</Text>
            </Box>
          ) : (
            <Box flex={1} justifyContent="center" alignItems="center">
              <Text preset="text14" color="gray400">Coordenadas nao disponiveis</Text>
            </Box>
          )}

          {/* Botao de navegacao */}
          {hasValidCoords && (
            <Box position="absolute" right={measure.r16} top={measure.y100}>
              <TouchableOpacityBox
                backgroundColor="white"
                padding="y10"
                borderRadius="s16"
                borderWidth={measure.m1}
                borderColor="primary100"
                onPress={() => setNavModalVisible(true)}
              >
                <LocalIcon iconName="location" size={24} color="primary100" />
              </TouchableOpacityBox>
            </Box>
          )}
        </Box>

        {/* Informacoes do destinatario */}
        <Box paddingHorizontal="x16">
          <Box backgroundColor="white" borderRadius="s12" padding="y16" borderWidth={measure.m1} borderColor="gray200">
            <Box flexDirection="row" alignItems="center" gap="x8" marginBottom="y8">
              <Box width={measure.x36} height={measure.y36} backgroundColor="gray300" borderRadius="s18" />
              <Box flex={1}>
                <Text preset="text15" fontWeight="500" color="colorTextPrimary">
                  {nomeCliente}
                </Text>
                {service?.identificationCode && (
                  <Text preset="text13" color="gray400">
                    #{service.identificationCode}
                  </Text>
                )}
              </Box>
            </Box>

            {/* Tags de volumes */}
            <Box flexDirection="row" gap="x8" marginTop="y8">
              <Box flexDirection="row" alignItems="center" gap="x4" paddingHorizontal="x12" paddingVertical="y6" backgroundColor="gray100" borderRadius="s20">
                <Text preset="text13">📦</Text>
                <Text preset="text13" color="gray700">Volumes</Text>
              </Box>
            </Box>

            {service?.problemDescription && (
              <Box marginTop="y12">
                <Text preset="text13" fontWeight="500" color="gray600" marginBottom="y4">Observacao</Text>
                <Text preset="text13" color="gray700">{service.problemDescription}</Text>
              </Box>
            )}
          </Box>

          {/* Botoes de acao */}
          <Box gap="y12" marginTop="y16" paddingBottom="y24">
            <Button
              title="Indo pra la"
              preset="outline"
              onPress={() => {
                handleStartService();
                router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}`);
              }}
            />
            <Button
              title="Estou aqui!"
              onPress={() => {
                handleStartService();
                setEstouAqui(true);
                setEtapa(2);
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Modal de navegacao */}
      <Modal
        isVisible={navModalVisible}
        onClose={() => setNavModalVisible(false)}
        title="Como voce quer navegar?"
      >
        <Box padding="y10" alignItems="center">
          <Text preset="text14" color="gray600" marginBottom="y20" textAlign="center">
            Escolha o aplicativo de navegacao para ir ate o endereco da parada.
          </Text>

          <Box flexDirection="row" justifyContent="space-around" width="100%" marginBottom="y16">
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
                backgroundColor="primary10"
                marginBottom="y4"
              >
                <Text preset="text18" color="primary100">W</Text>
              </Box>
              <Text preset="text13" color="gray700">Waze</Text>
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
                backgroundColor="primary10"
                marginBottom="y4"
              >
                <Text preset="text18" color="primary100">G</Text>
              </Box>
              <Text preset="text13" color="gray700">Google Maps</Text>
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
                  backgroundColor="primary10"
                  marginBottom="y4"
                >
                  <Text preset="text18" color="primary100">A</Text>
                </Box>
                <Text preset="text13" color="gray700">Apple Maps</Text>
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

  // ETAPA 2: "Entreguei" e "Nao entreguei"
  const renderEtapa2 = () => (
    <ScreenBase
      scrollable
      mtScreenBase="t0"
      mbScreenBase="b0"
      marginHorizontalScreenBase="x0"
      buttonLeft={
        <LocalIconButton
          size={measure.x24}
          onPress={() => {
            const isServiceStarted = service?.status === ServiceStatus.IN_PROGRESS || service?.startDate;
            if (isServiceStarted) {
              router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}`);
            } else {
              setEtapa(1);
              setEstouAqui(false);
            }
          }}
          iconName="backArrow"
          color="primary100"
        />
      }
      title={
        <Text preset="text16" fontWeight="500" color="colorTextPrimary" textAlign="center" numberOfLines={2}>
          {endereco}
        </Text>
      }
    >
      <Box flex={1} backgroundColor="white" pt="y8">
        {/* Tag de tipo */}
        <Box flexDirection="row" justifyContent="center" gap="x12" marginBottom="y12" paddingHorizontal="x16">
          <Box backgroundColor="primary10" paddingHorizontal="x12" paddingVertical="y4" borderRadius="s20">
            <Text preset="text13" color="primary100">Entrega</Text>
          </Box>
        </Box>

        {/* Mapa */}
        <Box height={measure.y180} marginHorizontal="x16" marginBottom="y16" borderRadius="s12" overflow="hidden" backgroundColor="gray100">
          {hasValidCoords ? (
            <Box flex={1} justifyContent="center" alignItems="center">
              <Text preset="text14" color="gray400">Mapa</Text>
            </Box>
          ) : (
            <Box flex={1} justifyContent="center" alignItems="center">
              <Text preset="text14" color="gray400">Coordenadas nao disponiveis</Text>
            </Box>
          )}

          {hasValidCoords && (
            <Box position="absolute" right={measure.r16} top={measure.y100}>
              <TouchableOpacityBox
                backgroundColor="white"
                padding="y10"
                borderRadius="s16"
                borderWidth={measure.m1}
                borderColor="primary100"
                onPress={() => setNavModalVisible(true)}
              >
                <LocalIcon iconName="location" size={24} color="primary100" />
              </TouchableOpacityBox>
            </Box>
          )}
        </Box>

        {/* Informacoes do destinatario */}
        <Box paddingHorizontal="x16">
          <Box backgroundColor="white" borderRadius="s12" padding="y16" borderWidth={measure.m1} borderColor="gray200">
            <Box flexDirection="row" alignItems="center" gap="x8">
              <Box width={measure.x36} height={measure.y36} backgroundColor="gray300" borderRadius="s18" />
              <Box flex={1}>
                <Text preset="text15" fontWeight="500" color="colorTextPrimary">
                  {nomeCliente}
                </Text>
                {service?.identificationCode && (
                  <Text preset="text13" color="gray400">
                    #{service.identificationCode}
                  </Text>
                )}
              </Box>
            </Box>
          </Box>

          {/* Botoes de acao */}
          <Box gap="y12" marginTop="y16" paddingBottom="y24">
            <Button
              title="Entreguei"
              onPress={() => {
                setEntreguei(true);
                setEtapa(3);
              }}
            />
            <Button
              title="Nao entreguei"
              preset="outline"
              onPress={() => {
                router.push({
                  pathname: '/rotas-detalhadas/[id]/parada/[pid]/nao-realizado',
                  params: { id: rotaId, pid: serviceId },
                });
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Modal de navegacao */}
      <Modal
        isVisible={navModalVisible}
        onClose={() => setNavModalVisible(false)}
        title="Como voce quer navegar?"
      >
        <Box padding="y10" alignItems="center">
          <Text preset="text14" color="gray600" marginBottom="y20" textAlign="center">
            Escolha o aplicativo de navegacao para ir ate o endereco da parada.
          </Text>

          <Box flexDirection="row" justifyContent="space-around" width="100%" marginBottom="y16">
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
                backgroundColor="primary10"
                marginBottom="y4"
              >
                <Text preset="text18" color="primary100">W</Text>
              </Box>
              <Text preset="text13" color="gray700">Waze</Text>
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
                backgroundColor="primary10"
                marginBottom="y4"
              >
                <Text preset="text18" color="primary100">G</Text>
              </Box>
              <Text preset="text13" color="gray700">Google Maps</Text>
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
                  backgroundColor="primary10"
                  marginBottom="y4"
                >
                  <Text preset="text18" color="primary100">A</Text>
                </Box>
                <Text preset="text13" color="gray700">Apple Maps</Text>
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

  // ETAPA 3: Selecao de recebedor
  const renderEtapa3 = () => (
    <ScreenBase
      scrollable
      mtScreenBase="t0"
      mbScreenBase="b0"
      marginHorizontalScreenBase="x0"
      buttonLeft={
        <LocalIconButton
          size={measure.x24}
          onPress={() => {
            setEtapa(2);
            setEntreguei(false);
          }}
          iconName="backArrow"
          color="primary100"
        />
      }
      title={
        <Text preset="text16" fontWeight="500" color="colorTextPrimary" textAlign="center">
          Dados do recebedor
        </Text>
      }
    >
      <Box flex={1} backgroundColor="white" paddingHorizontal="x16" paddingTop="y12" paddingBottom="y24">
        <Text preset="text14" color="gray600" marginBottom="y16">
          Escolha para quem foi entregue:
        </Text>

        {/* Opcoes de recebedor */}
        <Box gap="y12">
          {[
            { type: 'cliente' as RecipientType, label: nomeCliente },
            { type: 'porteiro' as RecipientType, label: 'Porteiro' },
            { type: 'vizinho' as RecipientType, label: 'Vizinho' },
            { type: 'familiar' as RecipientType, label: 'Familiar' },
            { type: 'outro' as RecipientType, label: 'Outro' },
          ].map((option) => (
            <TouchableOpacityBox
              key={option.type}
              onPress={() => setRecipientType(option.type)}
              flexDirection="row"
              alignItems="center"
              gap="x12"
              padding="y12"
              borderWidth={measure.m2}
              borderColor={recipientType === option.type ? 'primary100' : 'gray200'}
              borderRadius="s12"
              backgroundColor={recipientType === option.type ? 'primary10' : 'white'}
            >
              <Box
                width={measure.x24}
                height={measure.y24}
                borderRadius="s12"
                borderWidth={measure.m2}
                borderColor={recipientType === option.type ? 'primary100' : 'gray300'}
                backgroundColor={recipientType === option.type ? 'primary100' : 'transparent'}
                justifyContent="center"
                alignItems="center"
              >
                {recipientType === option.type && (
                  <Box width={measure.x12} height={measure.y12} borderRadius="s6" backgroundColor="white" />
                )}
              </Box>
              <Text
                preset="text16"
                color="colorTextPrimary"
                fontWeight={recipientType === option.type ? '700' : '400'}
              >
                {option.label}
              </Text>
            </TouchableOpacityBox>
          ))}
        </Box>

        <Box marginTop="y16">
          <Button
            title="Proximo"
            onPress={() => setEtapa(4)}
            disabled={!recipientType}
          />
        </Box>
      </Box>
    </ScreenBase>
  );

  // ETAPA 4: Formulario de dados
  const renderEtapa4 = () => (
    <ScreenBase
      scrollable
      mtScreenBase="t0"
      mbScreenBase="b0"
      marginHorizontalScreenBase="x0"
      buttonLeft={
        <LocalIconButton
          size={measure.x24}
          onPress={() => setEtapa(3)}
          iconName="backArrow"
          color="primary100"
        />
      }
      title={
        <Text preset="text16" fontWeight="500" color="colorTextPrimary" textAlign="center">
          Dados do recebedor
        </Text>
      }
    >
      <Box flex={1} backgroundColor="white" paddingHorizontal="x16" paddingTop="y12" paddingBottom="y24">
        {/* Documento */}
        <DocumentCollectionForm
          data={documentData}
          onChange={setDocumentData}
        />

        {/* Observacao */}
        <Box marginBottom="y12">
          <Text preset="text14" color="gray600" marginBottom="y4" fontWeight="700">
            Observacao
          </Text>
          <Input
            value={observation}
            onChangeText={setObservation}
            placeholder="Digite uma observation"
            multiline
            numberOfLines={4}
            style={{
              borderWidth: 1,
              borderColor: '#E5E5E5', // grayBorderLight - usado em estilo inline
              borderRadius: 12,
              padding: measure.y14,
              backgroundColor: 'white',
            }}
          />
        </Box>

        {/* Assinatura */}
        <Box marginBottom="y12">
          <Text preset="text14" color="gray600" marginBottom="y4" fontWeight="700">
            Assinatura
          </Text>
          <TouchableOpacityBox
            backgroundColor={signature ? 'primary10' : 'primary100'}
            onPress={() => setShowSignature(true)}
            padding="y16"
            borderRadius="s12"
            alignItems="center"
          >
            <Text preset="textLabelButton" color={signature ? 'primary100' : 'white'}>
              {signature ? 'Assinatura registrada' : 'Registrar signature'}
            </Text>
          </TouchableOpacityBox>
        </Box>

        {/* Fotos */}
        <Box marginBottom="y12">
          <Text preset="text14" color="gray600" marginBottom="y4" fontWeight="700">
            Imagens
          </Text>
          <MultiPhotoPicker
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={5}
            uploadProgress={uploadProgress}
            label="Fotos"
            allowCamera={true}
            labelPreset="textParagraph"
            padding="y4"
            backgroundColor="gray50"
          />
        </Box>

        <Box marginTop="y12">
          <Button
            title="Proximo"
            onPress={() => {
              if (documentData.recipientName.trim() && documentData.documentNumber.trim()) {
                setEtapa(5);
              } else {
                showToast({ message: 'Por favor, preencha pelo menos o nome e o documento antes de continuar.', type: 'error' });
              }
            }}
          />
        </Box>

        {/* Modal de Assinatura */}
        <Modal
          title="Assinatura"
          isVisible={showSignature}
          onClose={() => setShowSignature(false)}
        >
          <Box paddingHorizontal="x10" paddingTop="t10" paddingBottom="y10">
            <SignatureCanvas
              onClear={() => setSignature(null)}
              onSave={async (signatureUri: string) => {
                setSignature(signatureUri);
                setShowSignature(false);
                setChecklist((prev) => ({ ...prev, signature: true }));
              }}
              height={measure.y280}
              penColor="black"
              backgroundColor="white"
              preset="textParagraph"
            />
          </Box>
        </Modal>
      </Box>
    </ScreenBase>
  );

  // ETAPA 5: Checklist final
  const renderEtapa5 = () => (
    <ScreenBase
      scrollable
      mtScreenBase="t0"
      mbScreenBase="b0"
      marginHorizontalScreenBase="x0"
      buttonLeft={
        <LocalIconButton
          size={measure.x24}
          onPress={() => setEtapa(4)}
          iconName="backArrow"
          color="primary100"
        />
      }
      title={
        <Text preset="text16" fontWeight="500" color="colorTextPrimary" textAlign="center">
          Dados do recebedor
        </Text>
      }
    >
      <Box flex={1} backgroundColor="white" paddingHorizontal="x16" paddingTop="y12" paddingBottom="y24">
        <Text preset="text14" color="gray600" marginBottom="y16">
          Verifique se coletou todos os dados necessarios para finalizar esta entrega:
        </Text>

        {/* Checklist Items */}
        <Box gap="y12">
          {/* Documento preenchido */}
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            padding="y12"
            borderWidth={measure.m1}
            borderColor={checklist.documento ? 'primary100' : 'gray200'}
            borderRadius="s12"
            backgroundColor={checklist.documento ? 'primary10' : 'white'}
          >
            <Text
              preset="text16"
              color="colorTextPrimary"
              fontWeight={checklist.documento ? '700' : '400'}
            >
              Documento preenchido
            </Text>
            <Box flexDirection="row" gap="x12">
              <TouchableOpacityBox
                onPress={() => setChecklist((prev) => ({ ...prev, documento: false }))}
                width={measure.x44}
                height={measure.y44}
                borderRadius="s12"
                borderWidth={measure.m2}
                borderColor="redError"
                backgroundColor={!checklist.documento ? 'redError' : 'transparent'}
                justifyContent="center"
                alignItems="center"
              >
                <Text preset="text20" color={!checklist.documento ? 'white' : 'redError'} fontWeight="700">×</Text>
              </TouchableOpacityBox>
              <TouchableOpacityBox
                onPress={() => setChecklist((prev) => ({ ...prev, documento: true }))}
                width={measure.x44}
                height={measure.y44}
                borderRadius="s12"
                borderWidth={measure.m2}
                borderColor="primary100"
                backgroundColor={checklist.documento ? 'primary100' : 'transparent'}
                justifyContent="center"
                alignItems="center"
              >
                <Text preset="text20" color={checklist.documento ? 'white' : 'primary100'} fontWeight="700">✓</Text>
              </TouchableOpacityBox>
            </Box>
          </Box>

          {/* Foto tirada */}
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            padding="y12"
            borderWidth={measure.m1}
            borderColor={checklist.foto ? 'primary100' : 'gray200'}
            borderRadius="s12"
            backgroundColor={checklist.foto ? 'primary10' : 'white'}
          >
            <Text
              preset="text16"
              color="colorTextPrimary"
              fontWeight={checklist.foto ? '700' : '400'}
            >
              Foto tirada
            </Text>
            <Box flexDirection="row" gap="x12">
              <TouchableOpacityBox
                onPress={() => setPhotos([])}
                width={measure.x44}
                height={measure.y44}
                borderRadius="s12"
                borderWidth={measure.m2}
                borderColor="redError"
                backgroundColor={!checklist.foto ? 'redError' : 'transparent'}
                justifyContent="center"
                alignItems="center"
              >
                <Text preset="text20" color={!checklist.foto ? 'white' : 'redError'} fontWeight="700">×</Text>
              </TouchableOpacityBox>
              <TouchableOpacityBox
                width={measure.x44}
                height={measure.y44}
                borderRadius="s12"
                borderWidth={measure.m2}
                borderColor="primary100"
                backgroundColor={checklist.foto ? 'primary100' : 'transparent'}
                justifyContent="center"
                alignItems="center"
              >
                <Text preset="text20" color={checklist.foto ? 'white' : 'primary100'} fontWeight="700">✓</Text>
              </TouchableOpacityBox>
            </Box>
          </Box>

          {/* Assinatura coletada */}
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            padding="y12"
            borderWidth={measure.m1}
            borderColor={checklist.signature ? 'primary100' : 'gray200'}
            borderRadius="s12"
            backgroundColor={checklist.signature ? 'primary10' : 'white'}
          >
            <Text
              preset="text16"
              color="colorTextPrimary"
              fontWeight={checklist.signature ? '700' : '400'}
            >
              Assinatura coletada
            </Text>
            <Box flexDirection="row" gap="x12">
              <TouchableOpacityBox
                onPress={() => {
                  setSignature(null);
                  setChecklist((prev) => ({ ...prev, signature: false }));
                }}
                width={measure.x44}
                height={measure.y44}
                borderRadius="s12"
                borderWidth={measure.m2}
                borderColor="redError"
                backgroundColor={!checklist.signature ? 'redError' : 'transparent'}
                justifyContent="center"
                alignItems="center"
              >
                <Text preset="text20" color={!checklist.signature ? 'white' : 'redError'} fontWeight="700">×</Text>
              </TouchableOpacityBox>
              <TouchableOpacityBox
                onPress={() => setShowSignature(true)}
                width={measure.x44}
                height={measure.y44}
                borderRadius="s12"
                borderWidth={measure.m2}
                borderColor="primary100"
                backgroundColor={checklist.signature ? 'primary100' : 'transparent'}
                justifyContent="center"
                alignItems="center"
              >
                <Text preset="text20" color={checklist.signature ? 'white' : 'primary100'} fontWeight="700">✓</Text>
              </TouchableOpacityBox>
            </Box>
          </Box>
        </Box>

        <Box marginTop="y16">
          <Button
            title={finalizing || isCompletingWithDetails ? 'Finalizando...' : 'Entreguei'}
            onPress={handleFinalizar}
            disabled={finalizing || isCompletingWithDetails || !checklist.documento || !checklist.foto || !checklist.signature}
          />
        </Box>

        {/* Modal de Assinatura */}
        <Modal
          title="Assinatura"
          isVisible={showSignature}
          onClose={() => setShowSignature(false)}
        >
          <Box paddingHorizontal="x10" paddingTop="t10" paddingBottom="y10">
            <SignatureCanvas
              onClear={() => setSignature(null)}
              onSave={async (signatureUri: string) => {
                setSignature(signatureUri);
                setShowSignature(false);
                setChecklist((prev) => ({ ...prev, signature: true }));
              }}
              height={measure.y280}
              penColor="black"
              backgroundColor="white"
              preset="textParagraph"
            />
          </Box>
        </Modal>
      </Box>
    </ScreenBase>
  );

  // Renderizar etapa atual
  const isServiceStarted = service && (service.status === ServiceStatus.IN_PROGRESS || service.startDate);

  if (etapa === 1 && !isServiceStarted) {
    return renderEtapa1();
  }

  if ((etapa === 2 || (isServiceStarted && etapa === 1)) && !entreguei && estouAqui) {
    return renderEtapa2();
  }

  if ((etapa === 3 || entreguei) && !recipientType) {
    return renderEtapa3();
  }

  if (etapa === 4 && recipientType) {
    return renderEtapa4();
  }

  if (etapa === 5) {
    return renderEtapa5();
  }

  return renderEtapa1();
}
