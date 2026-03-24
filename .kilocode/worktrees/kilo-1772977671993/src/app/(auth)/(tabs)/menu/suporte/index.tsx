import { useState, useMemo } from 'react';
import { Alert } from 'react-native';

import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, Text, TouchableOpacityBox } from '@/components';
import { TextInputBox } from '@/components/RestyleComponent/RestyleComponent';
import { createDriverSupportChatService } from '@/domain/agility/chat/chatService';
import { useFindChatsByUser } from '@/domain/agility/chat/useCase';
import { useAuthCredentialsService } from '@/services';
import { measure } from '@/theme';

export default function SuporteScreen() {
  const router = useRouter();
  const { userAuth } = useAuthCredentialsService();
  const [busca, setBusca] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Usar keycloakUserId (userAuth.id) para buscar chats
  // O backend converte automaticamente keycloakUserId -> driverId interno
  const userId = userAuth?.id;

  // Log para debug
  console.log('[SuporteScreen] userAuth:', userAuth ? { id: userAuth.id, driverId: userAuth.driverId } : null);
  console.log('[SuporteScreen] userId usado para buscar chats:', userId);

  // Buscar chats do usuário
  const { chats, isLoading, refetch, response } = useFindChatsByUser(userId);

  // Log da resposta
  console.log('[SuporteScreen] chats retornados:', chats?.length, 'response:', response);

  // Filtrar chats pela busca
  const filtrados = useMemo(() => {
    if (!busca.trim()) return chats;

    const buscaLower = busca.toLowerCase();
    return chats.filter((chat: any) => {
      // Buscar por último conteúdo de mensagem ou assunto
      const lastMessage = chat.lastMessage?.content || chat.lastMessage?.message || '';
      const subject = chat.subject || '';
      const chatId = chat.id || '';

      return (
        lastMessage.toLowerCase().includes(buscaLower) ||
        subject.toLowerCase().includes(buscaLower) ||
        chatId.toLowerCase().includes(buscaLower)
      );
    });
  }, [chats, busca]);

  async function handleNovaConversa() {
    if (!userAuth?.id) {
      Alert.alert('Erro', 'Usuário não identificado');
      return;
    }

    try {
      setIsCreatingChat(true);

      // Criar chat de suporte com o driver
      const result = await createDriverSupportChatService({
        driverId: userAuth.id,
      });

      if (result.success && result.result) {
        const chatId = result.result.id;
        // Navegar para a tela de chat individual
        router.push(`/(auth)/(tabs)/menu/suporte/${chatId}`);
        // Refetch para atualizar a lista
        await refetch();
      } else {
        Alert.alert('Erro', 'Não foi possível criar a conversa de suporte');
      }
    } catch (error) {
      console.error('Erro ao criar chat:', error);
      Alert.alert('Erro', 'Não foi possível criar a conversa de suporte');
    } finally {
      setIsCreatingChat(false);
    }
  }

  return (
    <Box flex={1} bg="white" px="x16" pt="y12" pb="y24">
      {/* Header */}
      <Box flexDirection="row" alignItems="center" mb="y24">
        <TouchableOpacityBox onPress={() => router.back()} mr="x12">
          <Text preset="text18" color="primary100">←</Text>
        </TouchableOpacityBox>
        <Box flex={1}>
          <Text preset="text20" fontWeightPreset='bold' color="colorTextPrimary">
            Suporte
          </Text>
        </Box>
      </Box>

      {/* Botoes de Acao */}
      <Box flexDirection="row" gap="x12" mb="y24">
        <TouchableOpacityBox
          flex={1}
          height={measure.y50}
          bg="primary100"
          borderRadius="s12"
          alignItems="center"
          justifyContent="center"
          onPress={handleNovaConversa}
          disabled={isCreatingChat || isLoading}
          opacity={isCreatingChat || isLoading ? 0.5 : 1}
        >
          <Text preset="textLabelButton" color="white">
            {isCreatingChat ? 'Criando...' : 'Nova conversa'}
          </Text>
        </TouchableOpacityBox>
        <TouchableOpacityBox
          flex={1}
          height={measure.y50}
          bg="white"
          borderWidth={measure.m1}
          borderColor="gray300"
          borderRadius="s12"
          alignItems="center"
          justifyContent="center"
          onPress={() => router.push('/(auth)/(tabs)/menu/protocolos')}
          disabled={isLoading}
        >
          <Text preset="textLabelButton" color="colorTextPrimary">
            Historico
          </Text>
        </TouchableOpacityBox>
      </Box>

      {/* Barra de Busca */}
      <Box flexDirection="row" alignItems="center" gap="x12" mb="y24">
        <Box
          flex={1}
          flexDirection="row"
          alignItems="center"
          gap="x8"
          bg="white"
          borderWidth={measure.m1}
          borderColor="gray300"
          borderRadius="s12"
          px="x16"
          py="y12"
        >
          <TextInputBox
            placeholder="Buscar chamado"
            value={busca}
            onChangeText={setBusca}
            flex={1}
          />
        </Box>
        <TouchableOpacityBox
          borderWidth={measure.m1}
          borderColor="gray300"
          borderRadius="s12"
          p="y12"
        >
          {/* TODO: Adicionar ícone de filtro */}
          <Text>🔍</Text>
        </TouchableOpacityBox>
      </Box>

      {/* Loading */}
      {isLoading && (
        <Box py="y32" alignItems="center">
          <ActivityIndicator />
          <Text preset="text14" color="gray500" mt="y16">
            Carregando...
          </Text>
        </Box>
      )}

      {/* Sem chats */}
      {!isLoading && filtrados.length === 0 && (
        <Box py="y32" alignItems="center">
          <Text preset="text14" color="gray400" textAlign="center">
            {busca.trim()
              ? 'Nenhum chamado encontrado com essa busca.'
              : 'Nenhum chamado encontrado. Clique em "Nova conversa de suporte" para começar.'}
          </Text>
        </Box>
      )}

      {/* Lista de chats */}
      {!isLoading && filtrados.length > 0 && (
        <Box gap="y12">
          {filtrados.map((chat: any) => {
            const chatId = chat.id || chat.chatId;
            const lastMessage = chat.lastMessage?.content || chat.lastMessage?.message || '';
            const subject = chat.subject || 'Conversa de suporte';
            const unreadCount = chat.unreadCount || 0;
            const status = chat.status || 'ACTIVE';
            const isClosed = status === 'CLOSED';

            return (
              <TouchableOpacityBox
                key={chatId}
                bg="white"
                borderRadius="s12"
                p="y16"
                borderWidth={measure.m1}
                borderColor={isClosed ? "gray200" : "primary100"}
                onPress={() => {
                  router.push(`/(auth)/(tabs)/menu/suporte/${chatId}`);
                }}
              >
                <Box flexDirection="row" justifyContent="space-between" alignItems="flex-start" mb="y4">
                  <Box flex={1}>
                    <Text preset="text15" fontWeightPreset='semibold' color="colorTextPrimary" numberOfLines={1}>
                      {subject}
                    </Text>
                  </Box>
                  {unreadCount > 0 && (
                    <Box
                      bg="primary100"
                      borderRadius="s8"
                      px="x8"
                      py="y4"
                      alignItems="center"
                    >
                      <Text preset="text12" fontWeightPreset='bold' color="white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </Box>
                  )}
                  {isClosed && (
                    <Box
                      bg="gray300"
                      borderRadius="s8"
                      px="x8"
                      py="y4"
                      ml="x8"
                    >
                      <Text preset="text12" color="gray600">
                        Fechado
                      </Text>
                    </Box>
                  )}
                </Box>
                <Text preset="text13" color="gray400" numberOfLines={2}>
                  {lastMessage || 'Nenhuma mensagem'}
                </Text>
                {chat.lastMessageAt && (
                  <Text preset="text12" color="gray500" mt="y4">
                    {new Date(chat.lastMessageAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </TouchableOpacityBox>
            );
          })}
        </Box>
      )}
    </Box>
  );
}