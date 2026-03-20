import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Box, TouchableOpacityBox, Button, Text, ActivityIndicator, Input } from '@/components';
import { DocumentCollectionForm, DocumentData } from '@/components/DocumentCollectionForm';
import Modal from '@/components/Modal/Modal';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { ServiceStatus } from '@/domain/agility/service/dto/types';
import { uploadMultipleServicePhotos, uploadSignature } from '@/domain/agility/service/serviceUploadUtils';
import { useFindOneService, useCompleteServiceWithDetails } from '@/domain/agility/service/useCase';
import { KEY_SERVICES, KEY_ROUTINGS } from '@/domain/queryKeys';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

export default function DadosServicoScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
  const rotaId = id as string;
  const serviceId = pid as string;
  const { showToast } = useToastService();

  const { service, isLoading: isLoadingService } = useFindOneService(serviceId);

  // Estados do formulário - usando tipos do projeto
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [nome, setNome] = useState('');
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

  // Refs para controle de montagem e cleanup - previne crash ao reiniciar app
  const isMountedRef = useRef(true);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup ao desmontar o componente
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, []);

  const { completeServiceWithDetails, isLoading: isCompletingWithDetails } = useCompleteServiceWithDetails({
    onSuccess: async () => {
      // Verificar se componente ainda está montado
      if (!isMountedRef.current) return;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] }),
        queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] }),
        queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, rotaId] }),
      ]);
      queryClient.refetchQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });
      queryClient.refetchQueries({ queryKey: [KEY_ROUTINGS, rotaId] });

      if (!isMountedRef.current) return;

      setFinalizing(false);
      setShowSuccess(true);
      // Redirecionamento movido para useEffect separado com cleanup
    },
    onError: (error: any) => {
      if (!isMountedRef.current) return;

      setFinalizing(false);
      const errorMessage = error?.response?.data?.message
        || error?.message
        || 'Erro ao enviar dados de finalização do serviço.';
      console.error('Erro ao completar serviço:', error);
      showToast({ message: errorMessage, type: 'error' });
    },
  });

  // Redirecionar após sucesso - com cleanup para prevenir crash
  useEffect(() => {
    if (showSuccess) {
      navigationTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}`);
        }
      }, 2500);
      return () => {
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current);
          navigationTimeoutRef.current = null;
        }
      };
    }
  }, [showSuccess, router, rotaId]);

  // Preencher nome automaticamente quando selecionar "cliente"
  useEffect(() => {
    if (selected === 'cliente' && service) {
      const nomeCliente = service.fantasyName || service.responsible;
      if (nomeCliente) {
        setNome(nomeCliente);
      }
    }
  }, [selected, service]);

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

  // Solicitar permissões de mídia
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showToast({ message: 'Precisamos de permissão para acessar suas photos!', type: 'error' });
        }
      }
    })();
  }, []);

  // Função para selecionar imagem da galeria
  const handlePickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5 - photos.length,
        quality: 0.8,
        orderedSelection: true,
      });

      if (!result.canceled && result.assets) {
        setPhotos([...photos, ...result.assets]);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      showToast({ message: 'Não foi possível selecionar a imagem.', type: 'error' });
    }
  };

  // Função para tirar foto com a câmera
  const _handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast({ message: 'Precisamos de permissão para usar a câmera!', type: 'error' });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotos([...photos, result.assets[0]]);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      showToast({ message: 'Não foi possível tirar a foto.', type: 'error' });
    }
  };

  // Função para remover foto
  const _removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  // Função para upload de photos com progresso
  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0) return [];

    try {
      setUploadProgress(new Map());

      const onUploadProgress = (progress: any, index: number) => {
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
      showToast({ message: 'Não foi possível fazer upload das photos.', type: 'error' });
      return [];
    }
  };

  // Função para upload de signature
  const uploadSignatureHandler = async (base64Signature: string): Promise<string | null> => {
    if (!base64Signature) return null;

    try {
      setFinalizing(true);

      const url = await uploadSignature(base64Signature, serviceId);
      return url;
    } catch (error) {
      console.error('Erro ao fazer upload da signature:', error);
      showToast({ message: 'Não foi possível fazer upload da signature.', type: 'error' });
      return null;
    } finally {
      setFinalizing(false);
    }
  };

  // Função para finalizar o serviço
  const handleFinalizar = async () => {
    if (!checklist.documento || !checklist.foto || !checklist.signature) {
      showToast({ message: 'Recolha todos os dados necessários antes de finalizar.', type: 'error' });
      return;
    }

    try {
      setFinalizing(true);

      // Upload de photos
      const photoUrls = await uploadPhotos();

      // Upload de signature
      const signatureUrl = signature ? await uploadSignatureHandler(signature) : null;

      // Preparar payload
      const payload: Record<string, any> = {};

      if (observation.trim()) {
        payload.notes = observation.trim();
      }

      if (signatureUrl) {
        payload.customerSignature = signatureUrl;
      }

      if (nome.trim()) {
        payload.receivedBy = nome.trim();
      }

      if (photoUrls.length > 0) {
        // Converter URLs para o formato esperado pelo backend (array ou string separada por vírgula)
        payload.photoProof = photoUrls.length === 1 ? photoUrls[0] : photoUrls.join(',');
      }

      // Verificar se o serviço precisa ser iniciado
      const needsToStart = !service ||
        (service.status !== ServiceStatus.IN_PROGRESS &&
          service.status !== ServiceStatus.COMPLETED);

      if (needsToStart) {
        showToast({ message: 'Serviço precisa ser iniciado primeiro', type: 'error' });
        setFinalizing(false);
        return;
      }

      // Completar serviço
      completeServiceWithDetails({
        id: serviceId,
        details: payload,
      });
    } catch (e) {
      console.error(e);
      showToast({ message: 'Ocorreu um erro ao finalizar o serviço.', type: 'error' });
      setFinalizing(false);
    }
  };

  if (isLoadingService) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator />
        <Text preset="textParagraph" marginTop="t10">Carregando...</Text>
      </Box>
    );
  }

  // Tela de sucesso
  if (showSuccess) {
    return (
      <Box flex={1} backgroundColor="primary100" justifyContent="center" alignItems="center">
        <Box width={measure.x120} height={measure.y12} backgroundColor="white" borderRadius="s10" marginBottom="t10" />
        <Text preset="text18" color="white" textAlign="center">
          Serviço realizado{'\n'}com sucesso
        </Text>
      </Box>
    );
  }

  return (
    <Box flex={1} backgroundColor="white">
      <Box
        scrollable={true}
        style={{ paddingBottom: 32 }}
      >
        <Box paddingTop="y24" paddingBottom="y4">
          {/* Header */}
          <Box flexDirection="row" alignItems="center" marginBottom="y12">
            <TouchableOpacityBox
              onPress={() => {
                if (etapa === 1) {
                  router.back();
                } else {
                  setEtapa((prev) => (prev - 1) as 1 | 2 | 3);
                }
              }}
              marginRight="y12"
            >
              <Text preset="text18" color="primary100">←</Text>
            </TouchableOpacityBox>
            <Text preset="text20" fontWeightPreset="bold" color="colorTextPrimary">
              Dados do serviço
            </Text>
          </Box>

          {/* ETAPA 1: Escolher quem atendeu */}
          {etapa === 1 && (
            <Box gap="y12" paddingBottom="y24">
              <Text preset="text16" color="colorTextPrimary" fontWeightPreset="bold" marginBottom="y4">
                Escolha quem atendeu você
              </Text>

              <Box gap="y4">
                <TouchableOpacityBox
                  onPress={() => {
                    setSelected('cliente');
                    if (service) {
                      const nomeCliente = service.fantasyName || service.responsible;
                      if (nomeCliente) {
                        setNome(nomeCliente);
                      }
                    }
                  }}
                  flexDirection="row"
                  alignItems="center"
                  gap="y12"
                  padding="y4"
                  borderWidth={measure.m2}
                  borderColor={selected === 'cliente' ? 'primary100' : 'borderColor'}
                  borderRadius="s12"
                  backgroundColor={selected === 'cliente' ? 'primary10' : 'white'}
                >
                  <Box
                    width={measure.x24}
                    height={measure.y24}
                    borderRadius="s4"
                    borderWidth={measure.m2}
                    borderColor={selected === 'cliente' ? 'primary100' : 'mutedElementsColor'}
                    backgroundColor={selected === 'cliente' ? 'primary100' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    {selected === 'cliente' && (
                      <Box width={measure.x12} height={measure.y12} borderRadius="s4" backgroundColor="white" />
                    )}
                  </Box>
                  <Text preset="text16" color="colorTextPrimary" fontWeightPreset={selected === 'cliente' ? 'bold' : 'regular'}>
                    {service?.fantasyName || service?.responsible || 'Cliente'}
                  </Text>
                </TouchableOpacityBox>

                <TouchableOpacityBox
                  onPress={() => {
                    setSelected('familiar');
                    setNome('');
                  }}
                  flexDirection="row"
                  alignItems="center"
                  gap="y12"
                  padding="y4"
                  borderWidth={measure.m2}
                  borderColor={selected === 'familiar' ? 'primary100' : 'borderColor'}
                  borderRadius="s12"
                  backgroundColor={selected === 'familiar' ? 'primary10' : 'white'}
                >
                  <Box
                    width={measure.x24}
                    height={measure.y24}
                    borderRadius="s4"
                    borderWidth={measure.m2}
                    borderColor={selected === 'familiar' ? 'primary100' : 'mutedElementsColor'}
                    backgroundColor={selected === 'familiar' ? 'primary100' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    {selected === 'familiar' && (
                      <Box width={measure.x12} height={measure.y12} borderRadius="s4" backgroundColor="white" />
                    )}
                  </Box>
                  <Text preset="text16" color="colorTextPrimary" fontWeightPreset={selected === 'familiar' ? 'bold' : 'regular'}>
                    Familiar
                  </Text>
                </TouchableOpacityBox>
              </Box>

              <Box marginTop="y12">
                <Button
                  title="Próximo"
                  onPress={() => setEtapa(2)}
                  disabled={!selected}
                />
              </Box>
            </Box>
          )}

          {/* ETAPA 2: Formulário de dados */}
          {etapa === 2 && (
            <Box gap="y12" paddingBottom="y24">
              {/* Documento */}
              <DocumentCollectionForm
                data={documentData}
                onChange={setDocumentData}
              />

              {/* Assinatura */}
              <Box marginBottom="y12">
                <Text preset="text14" color="gray600" marginBottom="y4" fontWeightPreset="bold">
                  Assinatura
                </Text>
                <TouchableOpacityBox
                  backgroundColor={signature ? 'primary10' : 'colorBackgroundMainButton'}
                  onPress={() => setShowSignature(true)}
                  padding="y4"
                  borderRadius="s12"
                >
                  <Text>{signature ? 'Assinatura registrada ✓' : 'Registrar signature'}</Text>
                </TouchableOpacityBox>
              </Box>

              {/* Fotos */}
              <Box marginBottom="y12">
                <Text preset="text14" color="gray600" marginBottom="y4" fontWeightPreset="bold">
                  Fotos da entrega
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

              {/* Observações */}
              <Box>
                <Text preset="text14" color="gray600" marginBottom="y4" fontWeightPreset="bold">
                  Observações
                </Text>
                <Input
                  value={observation}
                  onChangeText={setObservation}
                  placeholder="Descreva o que foi feito, dificuldades ou observações"
                  multiline
                  numberOfLines={4}
                  style={{
                    borderWidth: 1,
                    borderColor: 'borderColor',
                    borderRadius: 12,
                    padding: measure.y14,
                    backgroundColor: 'white',
                  }}
                />
              </Box>

              <Box marginTop="y12">
                <Button
                  title="Próximo"
                  onPress={() => setEtapa(3)}
                  disabled={!checklist.documento || !checklist.foto || !checklist.signature}
                />
              </Box>
            </Box>
          )}

          {/* ETAPA 3: Checklist */}
          {etapa === 3 && (
            <Box gap="y12" paddingBottom="y24">
              <Text preset="text16" color="colorTextPrimary" fontWeightPreset="bold" marginBottom="y4">
                Verificação final
              </Text>
              <Text preset="text14" color="gray600" marginBottom="y4">
                Verifique se todos os dados foram coletados corretamente:
              </Text>

              {/* Checklist Items - usando componente customizado */}
              <Box gap="y12">
                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  padding="y4"
                  borderWidth={measure.m1}
                  borderColor={checklist.documento ? 'primary100' : 'borderColor'}
                  borderRadius="s12"
                  backgroundColor={checklist.documento ? 'primary10' : 'white'}
                >
                  <Text preset="text16" color="colorTextPrimary" fontWeightPreset={checklist.documento ? 'bold' : 'regular'}>
                    Documento preenchido
                  </Text>
                  <Box flexDirection="row" gap="y12">
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

                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  padding="y4"
                  borderWidth={measure.m1}
                  borderColor={checklist.foto ? 'primary100' : 'borderColor'}
                  borderRadius="s12"
                  backgroundColor={checklist.foto ? 'primary10' : 'white'}
                >
                  <Text preset="text16" color="colorTextPrimary" fontWeightPreset={checklist.foto ? 'bold' : 'regular'}>
                    Foto tirada
                  </Text>
                  <Box flexDirection="row" gap="y12">
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
                      <Text preset="text20" color={!checklist.foto ? 'white' : 'redError'} fontWeightPreset="bold">×</Text>
                    </TouchableOpacityBox>
                    <TouchableOpacityBox
                      onPress={handlePickImages}
                      width={measure.x44}
                      height={measure.y44}
                      borderRadius="s12"
                      borderWidth={measure.m1}
                      borderColor="borderColor"
                      backgroundColor="backgroundColor"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Text preset="text24" color="mutedElementsColor">+</Text>
                    </TouchableOpacityBox>
                  </Box>
                </Box>

                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  padding="y4"
                  borderWidth={measure.m1}
                  borderColor={checklist.signature ? 'primary100' : 'borderColor'}
                  borderRadius="s12"
                  backgroundColor={checklist.signature ? 'primary10' : 'white'}
                >
                  <Text preset="text16" color="colorTextPrimary" fontWeightPreset={checklist.signature ? 'bold' : 'regular'}>
                    Assinatura coletada
                  </Text>
                  <Box flexDirection="row" gap="y12">
                    <TouchableOpacityBox
                      onPress={() => setSignature(null)}
                      width={measure.x44}
                      height={measure.y44}
                      borderRadius="s12"
                      borderWidth={measure.m2}
                      borderColor="redError"
                      backgroundColor={!checklist.signature ? 'redError' : 'transparent'}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Text preset="text20" color={!checklist.signature ? 'white' : 'redError'} fontWeightPreset="bold">×</Text>
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
                      <Text preset="text20" color={checklist.signature ? 'white' : 'primary100'} fontWeightPreset="bold">✓</Text>
                    </TouchableOpacityBox>
                  </Box>
                </Box>
              </Box>

              <Box marginTop="y12">
                <Button
                  title={finalizing || isCompletingWithDetails ? 'Finalizando...' : 'Finalizar'}
                  onPress={handleFinalizar}
                  disabled={finalizing || isCompletingWithDetails || !checklist.documento || !checklist.foto || !checklist.signature}
                />
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Modal de Assinatura */}
      <Modal title='Assinatura'
        isVisible={showSignature}
        onClose={() => setShowSignature(false)}
      >
        <Box paddingHorizontal="x10" paddingTop="t10" paddingBottom="y10">
          <Text preset="text16" fontWeightPreset="bold" color="colorTextPrimary" marginBottom="b10" textAlign="center">
            Assinatura
          </Text>

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
  );
}
