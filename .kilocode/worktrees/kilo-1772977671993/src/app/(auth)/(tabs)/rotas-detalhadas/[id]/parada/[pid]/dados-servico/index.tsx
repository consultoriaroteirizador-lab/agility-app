import { useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Box, TouchableOpacityBox, Button, Text, ActivityIndicator, Input } from '@/components';
import { DocumentCollectionForm, DocumentData } from '@/components/DocumentCollectionForm';
import ModalComponent from '@/components/ModalComponent/ModalComponent';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { ServiceStatus } from '@/domain/agility/service/dto/types';
import { uploadMultipleServicePhotos, uploadSignature } from '@/domain/agility/service/serviceUploadUtils';
import { useFindOneService, useCompleteServiceWithDetails } from '@/domain/agility/service/useCase';
import { KEY_SERVICES, KEY_ROUTINGS } from '@/domain/queryKeys';
import { measure } from '@/theme';
import Modal from '@/components/Modal/Modal';

export default function DadosServicoScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
  const rotaId = id as string;
  const serviceId = pid as string;

  const { service, isLoading: isLoadingService } = useFindOneService(serviceId);

  // Estados do formulário - usando tipos do projeto
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [nome, setNome] = useState('');
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
        || 'Erro ao enviar dados de finalização do serviço.';
      console.error('Erro ao completar serviço:', error);
      Alert.alert('Erro', errorMessage);
    },
  });

  // Preencher nome automaticamente quando selecionar "cliente"
  useEffect(() => {
    if (selecionado === 'cliente' && service) {
      const nomeCliente = service.fantasyName || service.responsible;
      if (nomeCliente) {
        setNome(nomeCliente);
      }
    }
  }, [selecionado, service]);

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

  // Solicitar permissões de mídia
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permissão necessária',
            'Precisamos de permissão para acessar suas fotos!'
          );
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
        selectionLimit: 5 - fotos.length,
        quality: 0.8,
        orderedSelection: true,
      });

      if (!result.canceled && result.assets) {
        setFotos([...fotos, ...result.assets]);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  // Função para tirar foto com a câmera
  const _handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para usar a câmera!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setFotos([...fotos, result.assets[0]]);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
    }
  };

  // Função para remover foto
  const _removePhoto = (index: number) => {
    const newPhotos = [...fotos];
    newPhotos.splice(index, 1);
    setFotos(newPhotos);
  };

  // Função para upload de fotos com progresso
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
      Alert.alert('Erro', 'Não foi possível fazer upload das fotos.');
      return [];
    }
  };

  // Função para upload de assinatura
  const uploadSignatureHandler = async (base64Signature: string): Promise<string | null> => {
    if (!base64Signature) return null;

    try {
      setFinalizando(true);

      const url = await uploadSignature(base64Signature, serviceId);
      return url;
    } catch (error) {
      console.error('Erro ao fazer upload da assinatura:', error);
      Alert.alert('Erro', 'Não foi possível fazer upload da assinatura.');
      return null;
    } finally {
      setFinalizando(false);
    }
  };

  // Função para finalizar o serviço
  const handleFinalizar = async () => {
    if (!checklist.documento || !checklist.foto || !checklist.assinatura) {
      Alert.alert('Atenção', 'Recolha todos os dados necessários antes de finalizar.');
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
        // TODO: Iniciar serviço primeiro
        Alert.alert('Aviso', 'Serviço precisa ser iniciado primeiro');
        setFinalizando(false);
        return;
      }

      // Completar serviço
      completeServiceWithDetails({
        id: serviceId,
        details: payload,
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Ocorreu um erro ao finalizar o serviço.');
      setFinalizando(false);
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
        <Box paddingHorizontal="m12" paddingTop="y24" paddingBottom="y4">
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
                    setSelecionado('cliente');
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
                  borderColor={selecionado === 'cliente' ? 'primary100' : 'borderColor'}
                  borderRadius="s12"
                  backgroundColor={selecionado === 'cliente' ? 'primary10' : 'white'}
                >
                  <Box
                    width={measure.x24}
                    height={measure.y24}
                    borderRadius="s4"
                    borderWidth={measure.m2}
                    borderColor={selecionado === 'cliente' ? 'primary100' : 'mutedElementsColor'}
                    backgroundColor={selecionado === 'cliente' ? 'primary100' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    {selecionado === 'cliente' && (
                      <Box width={measure.x12} height={measure.y12} borderRadius="s4" backgroundColor="white" />
                    )}
                  </Box>
                  <Text preset="text16" color="colorTextPrimary" fontWeightPreset={selecionado === 'cliente' ? 'bold' : 'regular'}>
                    {service?.fantasyName || service?.responsible || 'Cliente'}
                  </Text>
                </TouchableOpacityBox>

                <TouchableOpacityBox
                  onPress={() => {
                    setSelecionado('familiar');
                    setNome('');
                  }}
                  flexDirection="row"
                  alignItems="center"
                  gap="y12"
                  padding="y4"
                  borderWidth={measure.m2}
                  borderColor={selecionado === 'familiar' ? 'primary100' : 'borderColor'}
                  borderRadius="s12"
                  backgroundColor={selecionado === 'familiar' ? 'primary10' : 'white'}
                >
                  <Box
                    width={measure.x24}
                    height={measure.y24}
                    borderRadius="s4"
                    borderWidth={measure.m2}
                    borderColor={selecionado === 'familiar' ? 'primary100' : 'mutedElementsColor'}
                    backgroundColor={selecionado === 'familiar' ? 'primary100' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    {selecionado === 'familiar' && (
                      <Box width={measure.x12} height={measure.y12} borderRadius="s4" backgroundColor="white" />
                    )}
                  </Box>
                  <Text preset="text16" color="colorTextPrimary" fontWeightPreset={selecionado === 'familiar' ? 'bold' : 'regular'}>
                    Familiar
                  </Text>
                </TouchableOpacityBox>
              </Box>

              <Box marginTop="y12">
                <Button
                  title="Próximo"
                  onPress={() => setEtapa(2)}
                  disabled={!selecionado}
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
                  backgroundColor={assinatura ? 'primary10' : 'colorBackgroundMainButton'}
                  onPress={() => setShowSignature(true)}
                  padding="y4"
                  borderRadius="s12"
                >
                  <Text>{assinatura ? 'Assinatura registrada ✓' : 'Registrar assinatura'}</Text>
                </TouchableOpacityBox>
              </Box>

              {/* Fotos */}
              <Box marginBottom="y12">
                <Text preset="text14" color="gray600" marginBottom="y4" fontWeightPreset="bold">
                  Fotos da entrega
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

              {/* Observações */}
              <Box>
                <Text preset="text14" color="gray600" marginBottom="y4" fontWeightPreset="bold">
                  Observações
                </Text>
                <Input
                  value={observacao}
                  onChangeText={setObservacao}
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
                  disabled={!checklist.documento || !checklist.foto || !checklist.assinatura}
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
                  borderColor={checklist.assinatura ? 'primary100' : 'borderColor'}
                  borderRadius="s12"
                  backgroundColor={checklist.assinatura ? 'primary10' : 'white'}
                >
                  <Text preset="text16" color="colorTextPrimary" fontWeightPreset={checklist.assinatura ? 'bold' : 'regular'}>
                    Assinatura coletada
                  </Text>
                  <Box flexDirection="row" gap="y12">
                    <TouchableOpacityBox
                      onPress={() => setAssinatura(null)}
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

              <Box marginTop="y12">
                <Button
                  title={finalizando || isCompletingWithDetails ? 'Finalizando...' : 'Finalizar'}
                  onPress={handleFinalizar}
                  disabled={finalizando || isCompletingWithDetails || !checklist.documento || !checklist.foto || !checklist.assinatura}
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
}
