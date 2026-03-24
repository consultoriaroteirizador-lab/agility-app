import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Alert } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { jwtDecode } from 'jwt-decode';

import {
  ActivityIndicator,
  Box,
  Text,
  TouchableOpacityBox,
  ChatInput,
  ChatAttachmentView
} from '@/components';
import {
  ChatMessage,
  useGetChatMessages,
  usePostMessage,
  useChatWebSocket,
  useChatAttachmentUpload,
  postMessageService
} from '@/domain/agility/chat';
import { getChatService, markChatReadService } from '@/domain/agility/chat/chatService';
import { KEY_CHATS } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';
import { measure } from '@/theme';

// Helper functions
function mapSenderType(senderType?: string): "support" | "userId" | "driver" {
  if (!senderType) return "userId";
  const type = String(senderType).toUpperCase();
  if (type.includes("SUPPORT") || type.includes("AGENT") || type.includes("COLLABORATOR")) return "support";
  if (type.includes("DRIVER")) return "driver";
  return "userId";
}

function formatChatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  if (d.toDateString() === ontem.toDateString()) return "Ontem";

  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatChatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function SuporteChatPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const chatId = id ? String(id) : undefined;
  const queryClient = useQueryClient();

  const { userAuth, authCredentials } = useAuthCredentialsService();
  const [currentUserSenderId, setCurrentUserSenderId] = useState<string | null>(null);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [chatStatus, setChatStatus] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE');
  const messagesEndRef = useRef<ScrollView>(null);

  // Buscar mensagens do chat
  const { messages: messagesFromAPI, isLoading: isLoadingMessages, refetch: refetchMessages } = useGetChatMessages(chatId);

  // Estado local para mensagens (incluindo as recebidas via WebSocket)
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Mutation para enviar mensagem
  const { mutate: sendMessageMutation, isPending: isSending } = usePostMessage();

  // Hook para upload de anexos
  const { uploadAttachments, isLoading: uploadingAttachment } = useChatAttachmentUpload({
    onError: (error) => {
      console.error('Erro ao fazer upload:', error);
      Alert.alert('Erro', 'Não foi possível enviar o anexo');
    },
  });

  // Obter senderId do usuario atual e info do chat
  useEffect(() => {
    const getCurrentUserSenderId = async () => {
      if (!chatId || !userAuth?.id) return;

      try {
        const chatResult = await getChatService(chatId);
        if (chatResult.success && chatResult.result) {
          const chat = chatResult.result as any;
          setChatInfo(chat);
          setChatStatus(chat.status || 'ACTIVE');

          const participants = (chat.participants as any[]) || [];
          let userId: string | null = null;

          // Extrair userId do token
          if (authCredentials?.accessToken) {
            try {
              const payload = jwtDecode<any>(authCredentials.accessToken);
              userId = payload.sub || payload.userId || userAuth.id;
            } catch (error) {
              userId = userAuth.id;
            }
          } else {
            userId = userAuth.id;
          }

          // Encontrar o participante que corresponde ao usuario atual
          const userParticipant = participants.find((p: any) => {
            const pDriverId = p.driverId ? String(p.driverId) : null;
            const pCollaboratorId = p.collaboratorId ? String(p.collaboratorId) : null;
            const pKeycloakUserId = p.keycloakUserId ? String(p.keycloakUserId) : null;
            const normalizedUserId = userId ? String(userId) : null;

            return (
              (normalizedUserId && pDriverId === normalizedUserId) ||
              (normalizedUserId && pCollaboratorId === normalizedUserId) ||
              (normalizedUserId && pKeycloakUserId === normalizedUserId)
            );
          });

          const senderId = userParticipant?.driverId || userParticipant?.collaboratorId || userParticipant?.id;
          if (senderId) {
            setCurrentUserSenderId(String(senderId));
            console.log('[SuporteChatPage] Current user senderId found:', senderId);
          } else {
            setCurrentUserSenderId(userId);
            console.log('[SuporteChatPage] Using userId as fallback:', userId);
          }
        }
      } catch (error) {
        console.error('[SuporteChatPage] Error loading chat data:', error);
      }
    };

    getCurrentUserSenderId();
  }, [chatId, userAuth?.id, authCredentials?.accessToken]);

  // Sincronizar mensagens da API com o estado local
  useEffect(() => {
    if (messagesFromAPI && messagesFromAPI.length > 0) {
      const formattedMessages: ChatMessage[] = messagesFromAPI.map((msg: any) => ({
        id: msg.id,
        chatId: msg.chatId || chatId || '',
        senderId: msg.senderId || '',
        senderType: msg.senderType || 'DRIVER',
        content: msg.content || '',
        attachmentUrl: msg.attachmentUrl,
        attachmentType: msg.attachmentType,
        status: msg.status || 'SENT',
        createdAt: msg.createdAt || new Date().toISOString(),
      }));

      setMessages(formattedMessages);

      // Marcar mensagens como lidas
      if (userAuth?.id && chatId) {
        markChatReadService(chatId, userAuth.id).catch(console.error);
      }
    }
  }, [messagesFromAPI, chatId, userAuth?.id]);

  // Handler para mensagens recebidas via WebSocket
  const handleNewMessage = useCallback((wsMessage: any) => {
    console.log('[SuporteChatPage] handleNewMessage called:', {
      receivedChatId: wsMessage.chatId,
      currentChatId: chatId,
      messageId: wsMessage.id,
      content: wsMessage.content?.substring(0, 50),
      senderId: wsMessage.senderId,
      senderType: wsMessage.senderType,
    });

    // Verifica se a mensagem pertence ao chat atual
    if (wsMessage.chatId !== chatId) {
      console.log('[SuporteChatPage] Message filtered out - chatId mismatch');
      return;
    }

    console.log('[SuporteChatPage] Processing message for current chat');

    // Converte mensagem do WebSocket para o formato usado no componente
    const chatMessage: ChatMessage = {
      id: wsMessage.id,
      chatId: wsMessage.chatId || chatId || '',
      senderId: wsMessage.senderId || '',
      senderType: wsMessage.senderType || 'DRIVER',
      content: wsMessage.content || '',
      attachmentUrl: wsMessage.attachmentUrl,
      attachmentType: wsMessage.attachmentType,
      status: wsMessage.status || 'SENT',
      createdAt: wsMessage.createdAt || new Date().toISOString(),
    };

    // Atualiza a lista de mensagens
    setMessages((prevMessages) => {
      // Verifica se a mensagem ja existe (evitar duplicatas)
      const exists = prevMessages.some((msg) => msg.id === chatMessage.id);
      if (exists) {
        return prevMessages;
      }

      // Adiciona a nova mensagem e ordena por data
      const updated = [...prevMessages, chatMessage];
      return updated.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
      });
    });

    // Marcar como lida
    if (userAuth?.id && chatId) {
      markChatReadService(chatId, userAuth.id).catch(console.error);
    }

    // Scroll para o final
    setTimeout(() => {
      messagesEndRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [chatId, userAuth?.id]);

  // Handler para quando o chat for fechado pelo operador
  const handleChatClosed = useCallback((closedChatId: string) => {
    if (closedChatId === chatId) {
      console.log('[SuporteChatPage] Chat closed by operator');
      setChatStatus('CLOSED');
      // Recarregar info do chat
      refetchMessages();
    }
  }, [chatId, refetchMessages]);

  // WebSocket hook
  const { isConnected } = useChatWebSocket({
    enabled: !!chatId,
    chatId: chatId,
    onMessage: handleNewMessage,
    onChatClosed: handleChatClosed,
    onError: (error) => {
      console.error('[SuporteChatPage] WebSocket error:', error);
    },
  });

  // Scroll para o final quando mensagens mudarem
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Funcao para enviar mensagem com anexos
  const handleSendMessage = useCallback(async (content: string, tempAttachments?: any[]) => {
    if (!chatId || isSending || chatStatus === 'CLOSED') return;
    if (!content.trim() && !tempAttachments?.length) return;

    let attachmentUrls: string[] = [];
    let attachmentType: string | undefined;

    // Upload de anexos se houver
    if (tempAttachments && tempAttachments.length > 0) {
      try {
        const uris = tempAttachments.map(a => a.url);
        const uploadResult = await uploadAttachments({ files: uris });

        if (uploadResult.success && uploadResult.result?.urls) {
          attachmentUrls = uploadResult.result.urls;
          // Determinar tipo do primeiro anexo
          const firstAttachment = tempAttachments[0];
          attachmentType = firstAttachment.type === 'image' ? 'IMAGE' : 'DOCUMENT';
        } else {
          throw new Error('Erro ao fazer upload dos anexos');
        }
      } catch (error) {
        console.error('Erro no upload:', error);
        Alert.alert('Erro', 'Não foi possível enviar os anexos');
        return;
      }
    }

    // Enviar mensagem
    const payload: any = {
      chatId,
      content: content.trim() || (attachmentType === 'IMAGE' ? 'Imagem' : 'Anexo'),
    };

    if (attachmentUrls.length > 0) {
      payload.attachmentUrl = attachmentUrls[0];
      payload.attachmentType = attachmentType;
    }

    sendMessageMutation(payload, {
      onSuccess: () => {
        refetchMessages();
        queryClient.invalidateQueries({ queryKey: [KEY_CHATS] });
      },
      onError: (error) => {
        console.error('Erro ao enviar mensagem:', error);
        Alert.alert('Erro', 'Não foi possível enviar a mensagem');
      },
    });
  }, [chatId, isSending, chatStatus, uploadAttachments, sendMessageMutation, refetchMessages, queryClient]);

  // Handler para digitacao
  const handleTyping = useCallback((isTyping: boolean) => {
    // Pode ser usado para indicar "digitando..." via WebSocket
    console.log('Digitando:', isTyping);
  }, []);

  // Determinar se a mensagem e do usuario atual
  const isOwnMessage = (msg: ChatMessage) => {
    if (!currentUserSenderId || !msg.senderId) {
      // Fallback: se for do tipo DRIVER, assume que e do motorista atual
      return String(msg.senderType).toUpperCase().includes("DRIVER");
    }
    return String(msg.senderId) === String(currentUserSenderId);
  };

  // Agrupar mensagens por data
  const groupedMessages = messages.reduce((acc: any[], msg: ChatMessage) => {
    const date = formatChatDate(msg.createdAt);
    const lastGroup = acc[acc.length - 1];

    if (lastGroup && lastGroup.date === date) {
      lastGroup.messages.push(msg);
    } else {
      acc.push({ date, messages: [msg] });
    }

    return acc;
  }, []);

  // Verificar se chat esta fechado
  const isChatClosed = chatStatus === 'CLOSED' || chatInfo?.status === 'CLOSED';

  // Info do header
  const headerTitle = chatInfo?.routeId
    ? `Rota ${chatInfo.routeId}`
    : chatInfo?.subject || 'Suporte';
  const headerSubtitle = chatInfo?.serviceId
    ? `Servico #${chatInfo.serviceId}`
    : chatInfo?.ticketNumber
      ? `Protocolo: ${chatInfo.ticketNumber}`
      : (isConnected ? 'Online' : 'Offline');

  if (isLoadingMessages) {
    return (
      <Box flex={1} bg="white" alignItems="center" justifyContent="center">
        <ActivityIndicator />
        <Text preset="text14" color="gray500" mt="y16">
          Carregando conversa...
        </Text>
      </Box>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Box flex={1} bg="gray50">
        {/* Header */}
        <Box
          bg="white"
          px="x16"
          py="y12"
          borderBottomWidth={measure.m1}
          borderBottomColor="gray200"
        >
          <Box flexDirection="row" alignItems="center">
            <TouchableOpacityBox onPress={() => router.back()} mr="x12">
              <Text preset="text18" color="primary100">←</Text>
            </TouchableOpacityBox>
            <Box flex={1}>
              <Text preset="text16" fontWeightPreset='bold' color="colorTextPrimary">
                {headerTitle}
              </Text>
              <Box flexDirection="row" alignItems="center" gap="x8">
                <Text preset="text12" color="gray500">
                  {headerSubtitle}
                </Text>
              </Box>
            </Box>
          </Box>

          {/* Status badges */}
          <Box flexDirection="row" alignItems="center" gap="x8" mt="y8">
            <Box
              bg={isChatClosed ? "purple100" : "gray200"}
              px="x12"
              py="y4"
              borderRadius="s16"
            >
              <Text
                preset="text12"
                color={isChatClosed ? "purple700" : "gray600"}
                fontWeightPreset='semibold'
              >
                {isChatClosed ? 'Finalizado' : 'Em aberto'}
              </Text>
            </Box>
            {isConnected && !isChatClosed && (
              <Box flexDirection="row" alignItems="center" gap="x4">
                <Box
                  width={measure.x8}
                  height={measure.y8}
                  borderRadius="s4"
                  bg="greenSuccess"
                />
                <Text preset="text10" color="greenSuccess">Conectado</Text>
              </Box>
            )}
          </Box>
        </Box>

        {/* Messages */}
        <ScrollView
          ref={messagesEndRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: measure.y16 }}
          onContentSizeChange={() => {
            messagesEndRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {groupedMessages.length === 0 && (
            <Box py="y32" alignItems="center">
              <Text preset="text14" color="gray400" textAlign="center">
                Nenhuma mensagem ainda. Envie a primeira mensagem!
              </Text>
            </Box>
          )}

          {groupedMessages.map((group, groupIndex) => (
            <Box key={groupIndex} mb="y16">
              {/* Data header */}
              <Box alignItems="center" mb="y12">
                <Box bg="gray200" px="x12" py="y4" borderRadius="s8">
                  <Text preset="text12" color="gray600">
                    {group.date}
                  </Text>
                </Box>
              </Box>

              {/* Mensagens do grupo */}
              {group.messages.map((msg: ChatMessage, msgIndex: number) => {
                const isOwn = isOwnMessage(msg);
                const prevMsg = msgIndex > 0 ? group.messages[msgIndex - 1] : null;
                const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
                const showSenderName = !isOwn && (!isSameSender || msgIndex === 0);
                const hasAttachment = msg.attachmentUrl;
                const isImage = msg.attachmentType === 'IMAGE' ||
                  (msg.attachmentUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachmentUrl));

                return (
                  <Box
                    key={msg.id}
                    mb={msgIndex === group.messages.length - 1 ? "y0" : "y8"}
                    alignItems={isOwn ? "flex-end" : "flex-start"}
                  >
                    {showSenderName && (
                      <Text preset="text12" color="gray500" mb="y4" ml="x12">
                        {String(msg.senderType).toUpperCase().includes("SUPPORT") ||
                          String(msg.senderType).toUpperCase().includes("COLLABORATOR")
                          ? "Suporte" : "Voce"}
                      </Text>
                    )}
                    <Box
                      bg={isOwn ? "primary100" : "white"}
                      px="x16"
                      py="y12"
                      borderRadius="s16"
                      maxWidth="80%"
                      borderWidth={isOwn ? 0 : measure.m1}
                      borderColor="gray200"
                      shadowColor={isOwn ? "primary100" : "gray300"}
                      shadowOffset={{ width: 0, height: 1 }}
                      shadowOpacity={isOwn ? 0.3 : 0.1}
                      shadowRadius={2}
                      elevation={2}
                    >
                      {/* Anexo - Imagem */}
                      {hasAttachment && isImage && (
                        <Box mb="y8" borderRadius="s8" overflow="hidden">
                          <Image
                            source={{ uri: msg.attachmentUrl }}
                            style={{
                              width: 200,
                              height: 150,
                              borderRadius: 8
                            }}
                            resizeMode="cover"
                          />
                        </Box>
                      )}

                      {/* Anexo - Documento */}
                      {hasAttachment && !isImage && (
                        <TouchableOpacityBox
                          mb="y8"
                          bg={isOwn ? "primary80" : "gray100"}
                          borderRadius="s8"
                          px="x12"
                          py="y8"
                          flexDirection="row"
                          alignItems="center"
                          gap="x8"
                        >
                          <Text preset="text20">📄</Text>
                          <Text
                            preset="text13"
                            color={isOwn ? "white" : "primary100"}
                            fontWeightPreset='semibold'
                          >
                            Ver anexo
                          </Text>
                        </TouchableOpacityBox>
                      )}

                      {/* Texto da mensagem */}
                      {msg.content && (
                        <Text
                          preset="text14"
                          color={isOwn ? "white" : "colorTextPrimary"}
                        >
                          {msg.content}
                        </Text>
                      )}

                      {/* Hora */}
                      <Text
                        preset="text12"
                        color={isOwn ? "white" : "gray500"}
                        mt="y4"
                        textAlign="right"
                      >
                        {formatChatTime(msg.createdAt)}
                      </Text>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ))}
        </ScrollView>

        {/* Mensagem de chat finalizado */}
        {isChatClosed && (
          <Box bg="gray100" px="x16" py="y8">
            <Text preset="text13" color="gray600" textAlign="center">
              Atendimento finalizado pelo operador.
            </Text>
          </Box>
        )}

        {/* Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={isSending || uploadingAttachment || isChatClosed}
          placeholder={isChatClosed ? "Chat finalizado" : "Digite uma mensagem..."}
          disableAttachments={isChatClosed}
        />
      </Box>
    </KeyboardAvoidingView>
  );
}
