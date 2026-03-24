import { useState, useMemo } from 'react';

import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, Button, Input, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { Dropdown } from '@/components/DropDown/DropDown';
import { MyItemTypeDropDown } from '@/components/RestyleComponent/RestyleComponent';
import { createDriverSupportChatService } from '@/domain/agility/chat/chatService';
import { ChatStatus } from '@/domain/agility/chat/dto/types';
import { useFindActiveChatByUser } from '@/domain/agility/chat/useCase';
import { ServiceStatus } from '@/domain/agility/service/dto/types';
import { useFindPendingServices } from '@/domain/agility/service/useCase';
import { useAuthCredentialsService } from '@/services';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

export default function SuporteScreen() {
  const router = useRouter();
  const { userAuth } = useAuthCredentialsService();
  const { showToast } = useToastService();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<MyItemTypeDropDown>();
  const [customSubject, setCustomSubject] = useState('');

  // Usar keycloakUserId (userAuth.id) para buscar chats
  // O backend converte automaticamente keycloakUserId -> driverId interno
  const userId = userAuth?.id;

  // Buscar chat ativo do usuário
  const {
    activeChat: chatAberto,
    isLoading,
    isError,
    refetch
  } = useFindActiveChatByUser(userId);

  // Buscar serviços pendentes para verificar se há algum em andamento
  const { services: pendingServices } = useFindPendingServices();
  const serviceInProgress = pendingServices?.find((s: { status: string }) => s.status === ServiceStatus.IN_PROGRESS);

  // Opções de assunto
  const subjectOptions: MyItemTypeDropDown[] = useMemo(() => {
    const options: MyItemTypeDropDown[] = [
      { label: 'Selecione um assunto (opcional)', value: '' },
      { label: 'Dúvida geral', value: 'Dúvida geral' },
      { label: 'Problema com rota', value: 'Problema com rota' },
      { label: 'Problema com cliente', value: 'Problema com cliente' },
      { label: 'Problema com veículo', value: 'Problema com veículo' },
      { label: 'Outro (escrever)', value: 'custom' },
    ];

    // Adicionar serviço em andamento se existir
    if (serviceInProgress) {
      options.splice(1, 0, {
        label: `Serviço #${serviceInProgress.id} (em andamento)`,
        value: `service:${serviceInProgress.id}`
      });
    }

    return options;
  }, [serviceInProgress]);

  async function handleNovaConversa() {
    // Se já existe chat ativo (status === ACTIVE), navegar para ele
    // Defesa extra: verificar status mesmo que o backend já deva filtrar
    if (chatAberto && chatAberto.status === ChatStatus.ACTIVE) {
      const chatId = chatAberto.id;
      if (chatId) {
        router.push(`/(auth)/(tabs)/menu/suporte/${chatId}`);
        return;
      }
    }

    if (!userAuth?.id) {
      showToast({ message: 'Usuário não identificado', type: 'error' });
      return;
    }

    // Determinar assunto e serviceId com base na seleção
    let finalSubject = '';
    let serviceId = undefined;

    if (selectedSubject?.value === 'custom') {
      finalSubject = customSubject.trim();
    } else if (selectedSubject?.value?.startsWith('service:')) {
      serviceId = selectedSubject.value.split(':')[1];
      finalSubject = `Problema no serviço #${serviceId}`;
    } else if (selectedSubject?.value) {
      finalSubject = selectedSubject.value;
    }

    try {
      setIsCreatingChat(true);

      // Criar chat de suporte com o driver
      const result = await createDriverSupportChatService({
        driverId: userAuth.id,
        subject: finalSubject || undefined,
        serviceId: serviceId,
      });

      if (result.success && result.result) {
        const chatId = result.result.id;
        // Limpar seleção
        setSelectedSubject(undefined);
        setCustomSubject('');
        // Navegar para a tela de chat individual
        router.push(`/(auth)/(tabs)/menu/suporte/${chatId}`);
        // Refetch para atualizar a lista
        await refetch();
      } else {
        showToast({ message: 'Não foi possível criar a conversa de suporte', type: 'error' });
      }
    } catch (error) {
      showToast({ message: 'Não foi possível criar a conversa de suporte', type: 'error' });
    } finally {
      setIsCreatingChat(false);
    }
  }

  function handleRetry() {
    refetch();
  }

  return (
    <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Suporte</Text>}>
      <Box flex={1} backgroundColor="white" px="x16" pt="y12" pb="y24">

        {/* Texto - sempre visível */}
        <Box mb="b40">
          <Text textAlign="justify">
            Precisa de ajuda ou tem alguma dúvida? Nossa equipe de suporte está pronta para te
            atender e resolver qualquer questão da melhor forma possível. Entre em contato pelo
            chat abaixo e retornaremos o mais breve possível. Nosso horário de atendimento é de
            segunda a sexta, das 7h às 20h.
          </Text>
          <Text fontWeightPreset="semibold" textAlign="justify">
            {"\n"}
            Escolha o assunto que desejar receber atendimento!
          </Text>
        </Box>

        {/* Loading inicial */}
        {isLoading && (
          <Box flex={1} alignItems="center" justifyContent="center" py="y32">
            <ActivityIndicator />
            <Text preset="text14" color="gray500" mt="y16">
              Carregando...
            </Text>
          </Box>
        )}

        {/* Erro */}
        {isError && !isLoading && (
          <Box flex={1} alignItems="center" justifyContent="center" px="x16">
            <Text preset="text14" color="colorTextError" textAlign="center" mb="y16">
              Erro ao carregar dados. Por favor, tente novamente.
            </Text>
            <TouchableOpacityBox
              backgroundColor="primary100"
              px="x24"
              py="y12"
              borderRadius="s8"
              onPress={handleRetry}
            >
              <Text preset="text14" fontWeightPreset='bold' color="white">
                Tentar novamente
              </Text>
            </TouchableOpacityBox>
          </Box>
        )}

        {/* Dropdown, campo customizado e botões */}
        {!isLoading && !isError && (
          <>
            {/* Ocultar assunto quando já houver chamado aberto */}
            {!(chatAberto && chatAberto.status === ChatStatus.ACTIVE) && (
              <>
                <Box mb="y16">
                  <Dropdown
                    title="Assunto"
                    data={subjectOptions}
                    value={selectedSubject}
                    setItemSelected={setSelectedSubject}
                    onChange={(item: MyItemTypeDropDown) => setSelectedSubject(item)}
                    labelField="label"
                    valueField="value"
                    placeholder="Selecione um assunto (opcional)"
                    search={false}
                    selectedItemTextStyle={{ fontSize: measure.f14 }}
                    widthIcon={measure.x20}
                    heightIcon={measure.y20}
                    width={measure.x300}
                  />
                </Box>

                {selectedSubject?.value === 'custom' && (
                  <Box mb="y16">
                    <Box
                      borderWidth={measure.m1}
                      borderColor="gray300"
                      borderRadius="s12"
                      px="x12"
                      py="y8"
                    >
                      <Input
                        title='Assunto'
                        placeholder="Digite o assunto..."
                        value={customSubject}
                        onChangeText={setCustomSubject}
                      />
                    </Box>
                  </Box>
                )}
              </>
            )}

            <Box gap="x12" mb="y24" alignItems="center">
              <Button
                title={
                  isCreatingChat
                    ? 'Criando...'
                    : chatAberto && chatAberto.status === ChatStatus.ACTIVE
                      ? 'Continuar chamado'
                      : 'Nova conversa'
                }
                onPress={handleNovaConversa}
                disabled={isCreatingChat}
                width={measure.x330}
              />

              <Button
                title="Histórico"
                preset="outline"
                width={measure.x330}
                onPress={() => router.push('/(auth)/(tabs)/menu/protocolos')}
                disabled={isCreatingChat}
              />
            </Box>
          </>
        )}

      </Box>
    </ScreenBase>
  );
}
