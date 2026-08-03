import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Image as RNImage, Platform } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';

import { Box, Button, Text, TouchableOpacityBox, ActivityIndicator, ScreenBase, Input } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import type { OrderOccurrenceReasonResponse } from '@/domain/agility/order-occurrence-reason/dto';
import { useFindOccurrenceReasons } from '@/domain/agility/order-occurrence-reason/useCase';
import type { ApplyOccurrenceRequest } from '@/domain/agility/service/dto';
import { useFindOneService, useFindServicesByRoutingId, useRegisterOccurrence } from '@/domain/agility/service/useCase';
import { KEY_SERVICES, routeStopChangedKeys } from '@/domain/queryKeys';
import { loadOccurrenceReasonsMirror } from '@/services/storage/occurrenceReasonsStorage';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { resolvePedidosDaParada } from '../../../_utils';
import { useDestinoAposNota } from '../_hooks/useDestinoAposNota';
import { useInsucessoDraft } from '../_hooks/useInsucessoDraft';

import { occurrenceOutcomeMessage } from './occurrenceOutcome';

export default function FalhaScreen() {
  const queryClient = useQueryClient();
  const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
  const rotaId = id as string;
  const serviceId = pid as string;
  const { showToast } = useToastService();

  const { service, isLoading: isLoadingService } = useFindOneService(serviceId || '');

  // Pedidos da MESMA PARADA que este serviço (Camada 2/3) — esta tela não tem
  // `ParadaProvider` (ver comentário em `useInsucessoDraft.ts`: "tela isolada,
  // sem ParadaProvider"), então busca a lista da rota e monta o grupo com a
  // MESMA função (`resolvePedidosDaParada`) que `ParadaContext` usa por baixo
  // — não uma derivação nova, só o mesmo dado buscado localmente. Precisa
  // disso para saber, ao registrar o insucesso, se a porta ainda tem outra
  // nota por trabalhar (Task 5, `useDestinoAposNota`).
  const { services: routeServices } = useFindServicesByRoutingId(service?.routingId || rotaId || '');
  const pedidosDaParada = useMemo(
    () => resolvePedidosDaParada(routeServices, serviceId),
    [routeServices, serviceId],
  );
  const navegarAposFecharNota = useDestinoAposNota(pedidosDaParada, serviceId, rotaId);

  const {
    selectedReason,
    setSelectedReason,
    notes,
    setNotes,
    photos,
    addPhotos,
    removePhoto,
    clearDraft,
    getUploadedPhotoUrls,
  } = useInsucessoDraft(serviceId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Vira `true` quando o insucesso foi registrado com sucesso — dispara o
  // `useEffect` abaixo que navega. Ver comentário no `useEffect`: só um FLAG
  // aqui, não o `setTimeout`/navegação direto no `onSuccess` da mutation,
  // porque a decisão de PARA ONDE ir depende de `pedidosDaParada` (via
  // `navegarAposFecharNota`), e esse dado só fica atualizado depois do
  // `refetchQueries` — que roda DEPOIS deste `onSuccess` retornar, não antes.
  const [insucessoRegistrado, setInsucessoRegistrado] = useState(false);

  const { reasons, isLoading: isLoadingReasons, isError: isReasonsError } = useFindOccurrenceReasons('LAST_MILE');
  const [mirror, setMirror] = useState<OrderOccurrenceReasonResponse[]>([]);
  useEffect(() => {
    if (reasons.length === 0 && isReasonsError) {
      loadOccurrenceReasonsMirror('LAST_MILE').then(m => setMirror(m ?? []));
    }
  }, [reasons.length, isReasonsError]);
  const options = reasons.length > 0 ? reasons : mirror;

  // Limpa motivo restaurado do rascunho que não existe mais no catálogo atual
  // (enum antigo pré-deploy ou motivo desativado no servidor). Só roda depois
  // que o catálogo carregou, senão apagaríamos uma seleção válida ainda não hidratada.
  useEffect(() => {
    if (options.length > 0 && selectedReason && !options.some(o => o.id === selectedReason)) {
      setSelectedReason(null);
    }
  }, [options, selectedReason, setSelectedReason]);

  const { registerOccurrence, isLoading: isRegisteringOccurrence } = useRegisterOccurrence({
    onSuccess: async (resp) => {
      const outcome = resp?.result?.occurrenceOutcome;
      if (outcome) {
        showToast({
          message: occurrenceOutcomeMessage(outcome),
          type: ['FAILED_LIMIT', 'FAILED'].includes(outcome) ? 'error' : 'success',
        });
      }

      // Backend já limpa o draft em reportFailure; aqui limpamos o cache local
      // (best-effort; o cleanStaleParadaDrafts global também resolve no próximo open).
      await clearDraft();

      // Invalidar queries relacionadas — inclui o /map-data, de onde sai a trava
      // do "Cheguei no retorno" (ver `routeStopChangedKeys`). Sem ele, o retorno
      // continuava vendo esta parada como pendente e o botão ficava morto.
      for (const queryKey of routeStopChangedKeys(rotaId, serviceId)) {
        void queryClient.invalidateQueries({ queryKey });
      }

      // Aguardar refetch explícito para garantir que os dados sejam atualizados
      await queryClient.refetchQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });

      // NÃO navega aqui. `navegarAposFecharNota` foi capturado no closure
      // desta função no RENDER em que a mutation foi disparada — o `await`
      // acima atualiza o cache do react-query e pode re-renderizar o
      // componente com um `pedidosDaParada`/`navegarAposFecharNota` NOVOS, mas
      // este `onSuccess` já em execução continua com a versão VELHA no
      // closure. Chamar `navegarAposFecharNota()` diretamente aqui decidiria
      // com dado pré-refetch. Em vez disso, só sinaliza — o `useEffect`
      // abaixo roda no próximo render (já com o hook atualizado) e decide lá.
      setInsucessoRegistrado(true);
    },
    onError: (error) => {
      setIsSubmitting(false);
      console.error('Erro ao marcar como insucesso:', error);
      showToast({ message: 'Não foi possível marcar o serviço como insucesso. Tente novamente.', type: 'error' });
    },
  });

  // Navegar após o insucesso ser registrado — Task 5: índice da parada (a
  // porta ainda tem outra nota por trabalhar) ou lista de paradas da rota
  // (era a última nota). MESMO padrão reativo que `entrega`/`coleta`/
  // `service` usam para o próprio redirect de sucesso: a decisão mora aqui,
  // não dentro do `onSuccess` da mutation (comentário acima), porque
  // `navegarAposFecharNota` está nas dependências — se `pedidosDaParada`
  // mudar (o refetch do `onSuccess` chegando, ou qualquer outro motivo)
  // enquanto este efeito ainda não disparou, o cleanup cancela o timer velho
  // e um novo roda com a closure fresca. Pequeno delay para dar tempo da UI
  // (toast) aparecer antes de sair da tela.
  useEffect(() => {
    if (insucessoRegistrado) {
      const timer = setTimeout(() => {
        navegarAposFecharNota();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [insucessoRegistrado, navegarAposFecharNota]);

  // Solicitar permissões de mídia
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        await ImagePicker.requestCameraPermissionsAsync();
      }
    })();
  }, []);

  // Função para selecionar imagem da galeria
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        addPhotos([result.assets[0]]);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      showToast({ message: 'Não foi possível selecionar a imagem.', type: 'error' });
    }
  };

  // Função para tirar foto com a câmera
  const handleTakePhoto = async () => {
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

      if (!result.canceled && result.assets[0]) {
        addPhotos([result.assets[0]]);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      showToast({ message: 'Não foi possível tirar a foto.', type: 'error' });
    }
  };

  const handleSubmit = async () => {
    // Só submete um motivo confirmado no catálogo CARREGADO. Cobre o caso
    // offline-nunca-cacheado + draft antigo (enum legado ou motivo desativado):
    // sem catálogo carregado, `options` é vazio e o guard de reset (efeito acima)
    // não roda — sem esta checagem, um `selectedReason` restaurado inválido
    // passaria e mandaria um occurrenceReasonId lixo pro backend.
    if (!selectedReason || !options.some((o) => o.id === selectedReason)) {
      showToast({ message: 'Por favor, selecione um motivo para o insucesso.', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    // Fotos já foram enviadas incrementalmente pelo useInsucessoDraft — aqui só
    // colhemos as URLs S3 que já estão prontas em memória.
    const photoUrls = getUploadedPhotoUrls();

    const payload: ApplyOccurrenceRequest = {
      occurrenceReasonId: selectedReason,
    };

    if (notes.trim()) {
      payload.note = notes.trim();
    }

    if (photoUrls.length > 0) {
      payload.photoProof = photoUrls;
    }

    registerOccurrence({
      id: serviceId,
      payload,
    });
  };

  if (isLoadingService) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator />
        <Text mt="y16">Carregando...</Text>
      </Box>
    );
  }

  return (
    <ScreenBase buttonLeft={<ButtonBack />} title={
      <Text preset="textTitleScreen" >
        Registrar insucesso
      </Text>
    }>
      <Box flex={1} backgroundColor="white">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>


          <Box gap="y24" pt="y16">
            <Box>
              <Text preset="text16" fontWeightPreset='semibold' color="colorTextPrimary" mb="y12">
                Motivo do insucesso *
              </Text>
              {isLoadingReasons && options.length === 0 ? (
                <Box py="y16" alignItems="center">
                  <ActivityIndicator />
                </Box>
              ) : options.length === 0 ? (
                <Text preset="text14" color="gray400">
                  Não foi possível carregar os motivos — conecte-se uma vez ou peça para configurar na plataforma.
                </Text>
              ) : (
                <Box gap="y8">
                  {options.map((reason) => (
                    <TouchableOpacityBox
                      key={reason.id}
                      onPress={() => setSelectedReason(reason.id)}
                      flexDirection="row"
                      alignItems="center"
                      gap="x12"
                      p="y16"
                      borderWidth={measure.m2}
                      borderColor={selectedReason === reason.id ? 'primary100' : 'gray200'}
                      borderRadius="s12"
                      backgroundColor={selectedReason === reason.id ? 'primary10' : 'white'}
                    >
                      <Box
                        width={measure.x24}
                        height={measure.y24}
                        borderRadius="s12"
                        borderWidth={measure.m2}
                        borderColor={selectedReason === reason.id ? 'primary100' : 'gray400'}
                        backgroundColor={selectedReason === reason.id ? 'primary100' : 'transparent'}
                        justifyContent="center"
                        alignItems="center"
                      >
                        {selectedReason === reason.id && (
                          <Box width={measure.x12} height={measure.y12} borderRadius="s6" backgroundColor="white" />
                        )}
                      </Box>
                      <Text preset="text16" color="colorTextPrimary" fontWeight={selectedReason === reason.id ? '500' : '400'}>
                        {reason.name}
                      </Text>
                    </TouchableOpacityBox>
                  ))}
                </Box>
              )}
            </Box>

            <Box>
              <Text preset="text16" fontWeightPreset='semibold' color="colorTextPrimary" mb="y8">
                Observações
              </Text>
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder="Descreva o que aconteceu, dificuldades encontradas ou observações adicionais"
                multiline
                numberOfLines={4}
                height={measure.y100}

              />
            </Box>

            <Box>
              <Text preset="text16" fontWeightPreset='semibold' color="colorTextPrimary" mb="y12">
                Fotos (opcional)
              </Text>
              <Box flexDirection="row" gap="x12" flexWrap="wrap" mb="y12">
                {photos.map((foto, index) => (
                  <Box key={index} position="relative">
                    <RNImage
                      source={{ uri: foto.uri }}
                      style={{
                        width: 70,
                        height: 70,
                        borderRadius: 8,
                      }}
                      resizeMode="cover"
                    />
                    <TouchableOpacityBox
                      position="absolute"
                      top={-8}
                      right={-8}
                      width={measure.x24}
                      height={measure.y24}
                      backgroundColor="redError"
                      borderRadius="s12"
                      justifyContent="center"
                      alignItems="center"
                      onPress={() => removePhoto(index)}
                    >
                      <Text color="white" preset="text12">×</Text>
                    </TouchableOpacityBox>
                    {foto.__uploadStatus === 'uploading' && (
                      <Box
                        position="absolute"
                        bottom={0}
                        left={0}
                        right={0}
                        backgroundColor="overlayBlack70"
                        borderBottomLeftRadius="s8"
                        borderBottomRightRadius="s8"
                        alignItems="center"
                        py="y4"
                      >
                        <Text color="white" preset="text12" fontWeightPreset="bold">Enviando…</Text>
                      </Box>
                    )}
                    {foto.__uploadStatus === 'failed' && (
                      <Box
                        position="absolute"
                        bottom={0}
                        left={0}
                        right={0}
                        backgroundColor="redError"
                        borderBottomLeftRadius="s8"
                        borderBottomRightRadius="s8"
                        alignItems="center"
                        py="y4"
                      >
                        <Text color="white" preset="text12" fontWeightPreset="bold">Falhou</Text>
                      </Box>
                    )}
                  </Box>
                ))}
                <Box flexDirection="row" gap="x8">
                  <TouchableOpacityBox
                    width={measure.x70}
                    height={measure.y70}
                    borderWidth={measure.m1}
                    borderColor="gray300"
                    borderRadius="s8"
                    justifyContent="center"
                    alignItems="center"
                    onPress={handlePickImage}
                  >
                    <Text preset="text24" color="gray400">+</Text>
                  </TouchableOpacityBox>
                  <TouchableOpacityBox
                    width={measure.x70}
                    height={measure.y70}
                    borderWidth={measure.m1}
                    borderColor="primary100"
                    borderRadius="s8"
                    justifyContent="center"
                    alignItems="center"
                    onPress={handleTakePhoto}
                  >
                    <Text preset="text20" color="primary100">📷</Text>
                  </TouchableOpacityBox>
                </Box>
              </Box>
              <Text preset="text13" color="gray400">
                Máximo 10 photos permitidas
              </Text>
            </Box>

            <Box mt="y16">
              <Button
                title={isRegisteringOccurrence || isSubmitting ? 'Registrando...' : 'Registrar insucesso'}
                onPress={handleSubmit}
                disabled={isRegisteringOccurrence || isSubmitting || !selectedReason || !options.some((o) => o.id === selectedReason)}
                width={measure.x330}
              />
            </Box>
          </Box>
        </ScrollView>
      </Box>
    </ScreenBase>

  );
}
