import { useState, useEffect } from 'react';
import { Platform, Alert, ScrollView, Linking } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Box, TouchableOpacityBox, Button, Text, ActivityIndicator, Input, ScreenBase, LocalIconButton } from '@/components';
import { DocumentCollectionForm, DocumentData } from '@/components/DocumentCollectionForm';
import { LocalIcon } from '@/components/Icon/LocalIcon';
import Modal from '@/components/Modal/Modal';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { ServiceStatus } from '@/domain/agility/service/dto/types';
import { uploadMultipleServicePhotos, uploadSignature } from '@/domain/agility/service/serviceUploadUtils';
import { useFindOneService, useCompleteServiceWithDetails, useStartService } from '@/domain/agility/service/useCase';
import { KEY_SERVICES, KEY_ROUTINGS } from '@/domain/queryKeys';
import { measure } from '@/theme';

type RecipientType = 'cliente' | 'porteiro' | 'vizinho' | 'familiar' | 'outro';

type AppMap = 'waze' | 'googleMaps' | 'appleMaps';

export default function DadosEntregaScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
  const rotaId = id as string;
  const serviceId = pid as string;

  const { service, isLoading: isLoadingService, refetch } = useFindOneService(serviceId);

  // Estados do fluxo de 5 etapas
  // ETAPA 1: "Indo pra la" e "Estou aqui!"
  // ETAPA 2: "Entreguei" e "Nao entreguei"
  // ETAPA 3: Selecao de recebedor
  // ETAPA 4: Formulario de dados
  // ETAPA 5: Checklist final
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
  const [observacao, setObservacao] = useState('');
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [fotos, setFotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [checklist, setChecklist] = useState({
    documento: false,
    foto: false,
    assinatura: false,
  });
  const [finalizando, setFinalizando] = useState(false);
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
    onError: (error: any) => {
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

      setFinalizando(false);
      setShowSuccess(true);
      setTimeout(() => {
        router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}`);
      }, 2500);
    },
    onError: (error: any) => {
      setFinalizando(false);
      const errorMessage = error?.response?.data?.message
        || error?.message
        || 'Erro ao enviar dados de finalizacao da entrega.';
      console.error('Erro ao completar entrega:', error);
      Alert.alert('Erro', errorMessage);
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
    setChecklist((prev) => ({ ...prev, foto: fotos.length > 0 }));
  }, [fotos]);

  useEffect(() => {
    setChecklist((prev) => ({ ...prev, assinatura: !!assinatura }));
  }, [assinatura]);

  // Solicitar permissoes de midia
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permissao necessaria',
            'Precisamos de permissao para acessar suas fotos!'
          );
        }
      }
    })();
  }, []);

  // Abrir app de navegacao
  const handleOpenDeviceMap = async (app: AppMap) => {
    const latitude = service?.address?.latitude;
    const longitude = service?.address?.longitude;

    if (!latitude || !longitude) {
      Alert.alert('Aviso', 'Coordenadas do endereco nao disponiveis.');
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
          Alert.alert('Erro', 'Nao foi possivel abrir o aplicativo de mapas');
        }
      }
    } catch {
      Alert.alert('Erro', 'Nao foi possivel abrir o aplicativo de mapas');
    } finally {
      setNavModalVisible(false);
    }
  };

  // Upload de fotos
  const uploadPhotos = async (): Promise<string[]> => {
    if (fotos.length === 0) return [];

    try {
      setUploadProgress(new Map());

      const onUploadProgress = (progress: any, index: number) => {
        if (progress) {
          setUploadProgress(new Map(uploadProgress).set(index, progress));
        }
      };

      const urls = await uploadMultipleServicePhotos(
        fotos,
        serviceId,
        'before',
        onUploadProgress,
      );

      setUploadProgress(new Map());
      return urls;
    } catch (error) {
      console.error('Erro ao fazer upload de fotos:', error);
      Alert.alert('Erro', 'Nao foi possivel fazer upload das fotos.');
      return [];
    }
  };

  // Upload de assinatura
  const uploadSignatureHandler = async (base64Signature: string): Promise<string | null> => {
    if (!base64Signature) return null;

    try {
      const url = await uploadSignature(base64Signature, serviceId);
      return url;
    } catch (error) {
      console.error('Erro ao fazer upload da assinatura:', error);
      Alert.alert('Erro', 'Nao foi possivel fazer upload da assinatura.');
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
    if (!checklist.documento || !checklist.foto || !checklist.assinatura) {
      Alert.alert('Atencao', 'Recolha todos os dados necessarios antes de finalizar.');
      return;
    }

    try {
      setFinalizando(true);

      // Upload de fotos
      const photoUrls = await uploadPhotos();

      // Upload de assinatura
      const signatureUrl = assinatura ? await uploadSignatureHandler(assinatura) : null;

      // Preparar payload
      const payload: Record<string, any> = {};

      if (observacao.trim()) {
        payload.notes = observacao.trim();
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
        Alert.alert('Aviso', 'Servico precisa ser iniciado primeiro');
        setFinalizando(false);
        return;
      }

      // Completar servico
      completeServiceWithDetails({
        id: serviceId,
        details: payload,
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Ocorreu um erro ao finalizar a entrega.');
      setFinalizando(false);
    }
  };

  // Dados do servico
  const nomeCliente = service?.fantasyName || service?.responsible || 'Cliente';
  const endereco = service?.address?.formattedAddress || 'Endereco nao disponivel';
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
                <Text preset="text15" fontWeightPreset="500" color="colorTextPrimary">
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
                <Text preset="text13" fontWeightPreset="500" color="gray600" marginBottom="y4">Observacao</Text>
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
        <Box width={measure.x24} />
      </Box>

      <Box flexDirection="row" justifyContent="center" gap="x12" marginBottom="y12">
        <Box backgroundColor="primary10" paddingHorizontal="x12" paddingVertical="y4" borderRadius="s20">
          <Text preset="text13" color="primary100">Entrega</Text>
        </Box>
      </Box>
    </Box>

        {/* Mapa */ }
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

  {/* Informacoes do destinatario */ }
  <Box paddingHorizontal="x16">
    <Box backgroundColor="white" borderRadius="s12" padding="y16" borderWidth={measure.m1} borderColor="gray200">
      <Box flexDirection="row" alignItems="center" gap="x8">
        <Box width={measure.x36} height={measure.y36} backgroundColor="gray300" borderRadius="s18" />
        <Box flex={1}>
          <Text preset="text15" fontWeightPreset="500" color="colorTextPrimary">
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
            pathname: '/rotas-detalhadas/[id]/parada/[pid]/tentativa-entrega',
            params: { id: rotaId, pid: serviceId },
          });
        }}
      />
    </Box>
  </Box>
      </ScrollView >

    {/* Modal de navegacao */ }
    < Modal
  isVisible = { navModalVisible }
  onClose = {() => setNavModalVisible(false)
}
title = "Como voce quer navegar?"
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
      </Modal >
    </Box >
  );

// ETAPA 3: Selecao de recebedor
const renderEtapa3 = () => (
  <Box flex={1} backgroundColor="white" paddingHorizontal="x16" paddingTop="y12" paddingBottom="y24">
    {/* Header */}
    <Box flexDirection="row" alignItems="center" marginBottom="y16">
      <TouchableOpacityBox
        onPress={() => {
          setEtapa(2);
          setEntreguei(false);
        }}
        marginRight="x12"
      >
        <Text preset="text18" color="primary100">←</Text>
      </TouchableOpacityBox>
      <Text preset="text20" fontWeightPreset="500" color="colorTextPrimary">
        Dados do recebedor
      </Text>
    </Box>

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
            fontWeightPreset={recipientType === option.type ? 'bold' : 'regular'}
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
);

// ETAPA 4: Formulario de dados
const renderEtapa4 = () => (
  <Box flex={1} backgroundColor="white" paddingHorizontal="x16" paddingTop="y12" paddingBottom="y24">
    {/* Header */}
    <Box flexDirection="row" alignItems="center" marginBottom="y16">
      <TouchableOpacityBox onPress={() => setEtapa(3)} marginRight="x12">
        <Text preset="text18" color="primary100">←</Text>
      </TouchableOpacityBox>
      <Text preset="text20" fontWeightPreset="500" color="colorTextPrimary">
        Dados do recebedor
      </Text>
    </Box>

    {/* Documento */}
    <DocumentCollectionForm
      data={documentData}
      onChange={setDocumentData}
    />

    {/* Observacao */}
    <Box marginBottom="y12">
      <Text preset="text14" color="gray600" marginBottom="y4" fontWeightPreset="bold">
        Observacao
      </Text>
      <Input
        value={observacao}
        onChangeText={setObservacao}
        placeholder="Digite uma observacao"
        multiline
        numberOfLines={4}
        style={{
          borderWidth: 1,
          borderColor: '#E5E5E5',
          borderRadius: 12,
          padding: measure.y14,
          backgroundColor: 'white',
        }}
      />
    </Box>

    {/* Assinatura */}
    <Box marginBottom="y12">
      <Text preset="text14" color="gray600" marginBottom="y4" fontWeightPreset="bold">
        Assinatura
      </Text>
      <TouchableOpacityBox
        backgroundColor={assinatura ? 'primary10' : 'primary100'}
        onPress={() => setShowSignature(true)}
        padding="y16"
        borderRadius="s12"
        alignItems="center"
      >
        <Text preset="textLabelButton" color={assinatura ? 'primary100' : 'white'}>
          {assinatura ? 'Assinatura registrada' : 'Registrar assinatura'}
        </Text>
      </TouchableOpacityBox>
    </Box>

    {/* Fotos */}
    <Box marginBottom="y12">
      <Text preset="text14" color="gray600" marginBottom="y4" fontWeightPreset="bold">
        Imagens
      </Text>
      <MultiPhotoPicker
        photos={fotos}
        onPhotosChange={setFotos}
        maxPhotos={5}
        uploadProgress={uploadProgress}
        label="Fotos"
        allowCamera={true}
        labelVariant="textParagraph"
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
            Alert.alert('Atencao', 'Por favor, preencha pelo menos o nome e o documento antes de continuar.');
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
          onClear={() => setAssinatura(null)}
          onSave={async (signatureUri: string) => {
            setAssinatura(signatureUri);
            setShowSignature(false);
            setChecklist((prev) => ({ ...prev, assinatura: true }));
          }}
          height={measure.y280}
          penColor="black"
          backgroundColor="white"
          preset="textParagraph"
        />
      </Box>
    </Modal>
  </Box>
);

// ETAPA 5: Checklist final
const renderEtapa5 = () => (
  <Box flex={1} backgroundColor="white" paddingHorizontal="x16" paddingTop="y12" paddingBottom="y24">
    {/* Header */}
    <Box flexDirection="row" alignItems="center" marginBottom="y16">
      <TouchableOpacityBox onPress={() => setEtapa(3)} marginRight="x12">
        <Text preset="text18" color="primary100">←</Text>
      </TouchableOpacityBox>
      <Text preset="text20" fontWeightPreset="500" color="colorTextPrimary">
        Dados do recebedor
      </Text>
    </Box>

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
          fontWeightPreset={checklist.documento ? 'bold' : 'regular'}
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
            <Text preset="text20" color={!checklist.documento ? 'white' : 'redError'} fontWeightPreset="bold">×</Text>
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
            <Text preset="text20" color={checklist.documento ? 'white' : 'primary100'} fontWeightPreset="bold">✓</Text>
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
          fontWeightPreset={checklist.foto ? 'bold' : 'regular'}
        >
          Foto tirada
        </Text>
        <Box flexDirection="row" gap="x12">
          <TouchableOpacityBox
            onPress={() => setFotos([])}
            width={measure.x44}
            height={measure.y44}
            borderRadius="s12"
            borderWidth={measure.m2}
            borderColor="redError"
            backgroundColor={!checklist.foto ? 'redError' : 'transparent'}
            justifyContent="center"
            alignItems="center"
          >
            <Text preset="text20" color={!checklist.foto ? 'white' : 'redError'} fontWeightPreset="bold">×</Text>
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
            <Text preset="text20" color={checklist.foto ? 'white' : 'primary100'} fontWeightPreset="bold">✓</Text>
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
        borderColor={checklist.assinatura ? 'primary100' : 'gray200'}
        borderRadius="s12"
        backgroundColor={checklist.assinatura ? 'primary10' : 'white'}
      >
        <Text
          preset="text16"
          color="colorTextPrimary"
          fontWeightPreset={checklist.assinatura ? 'bold' : 'regular'}
        >
          Assinatura coletada
        </Text>
        <Box flexDirection="row" gap="x12">
          <TouchableOpacityBox
            onPress={() => {
              setAssinatura(null);
              setChecklist((prev) => ({ ...prev, assinatura: false }));
            }}
            width={measure.x44}
            height={measure.y44}
            borderRadius="s12"
            borderWidth={measure.m2}
            borderColor="redError"
            backgroundColor={!checklist.assinatura ? 'redError' : 'transparent'}
            justifyContent="center"
            alignItems="center"
          >
            <Text preset="text20" color={!checklist.assinatura ? 'white' : 'redError'} fontWeightPreset="bold">×</Text>
          </TouchableOpacityBox>
          <TouchableOpacityBox
            onPress={() => setShowSignature(true)}
            width={measure.x44}
            height={measure.y44}
            borderRadius="s12"
            borderWidth={measure.m2}
            borderColor="primary100"
            backgroundColor={checklist.assinatura ? 'primary100' : 'transparent'}
            justifyContent="center"
            alignItems="center"
          >
            <Text preset="text20" color={checklist.assinatura ? 'white' : 'primary100'} fontWeightPreset="bold">✓</Text>
          </TouchableOpacityBox>
        </Box>
      </Box>
    </Box>

    <Box marginTop="y16">
      <Button
        title={finalizando || isCompletingWithDetails ? 'Finalizando...' : 'Entreguei'}
        onPress={handleFinalizar}
        disabled={finalizando || isCompletingWithDetails || !checklist.documento || !checklist.foto || !checklist.assinatura}
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
          onClear={() => setAssinatura(null)}
          onSave={async (signatureUri: string) => {
            setAssinatura(signatureUri);
            setShowSignature(false);
            setChecklist((prev) => ({ ...prev, assinatura: true }));
          }}
          height={measure.y280}
          penColor="black"
          backgroundColor="white"
          preset="textParagraph"
        />
      </Box>
    </Modal>
  </Box>
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

