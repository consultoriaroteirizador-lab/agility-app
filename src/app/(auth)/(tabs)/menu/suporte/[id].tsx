import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FlatList, Image } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';

import {
  ActivityIndicator,
  Box,
  Text,
  TouchableOpacityBox,
  ChatInput,
  ScreenBase
} from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import {
  ChatMessage,
  ChatWithParticipants,
  ChatStatus,
  ParticipantType,
  MessageStatus,
  useGetChatMessages,
  usePostMessage,
  useChatWebSocket,
  useChatAttachmentUpload,
  useChatContext,
  useTypingUsers,
  useChatStore,
} from '@/domain/agility/chat';
import { getChatService, markChatReadService } from '@/domain/agility/chat/chatService';
import { generateTempId } from '@/domain/agility/chat/utils/messageUtils';
import { useGetTicketByChatId } from '@/domain/agility/ticket/useCase';
import { useAuthCredentialsService } from '@/services';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_EXTENSION_REGEX = new RegExp('\\.(jpg|jpeg|png|gif|webp)$', 'i');

// ─── Types ────────────────────────────────────────────────────────────────────

type FlatItem =
  | { type: 'date'; date: string }
  | { type: 'message'; msg: ChatMessage; isLast: boolean };

// ─── Helper functions ─────────────────────────────────────────────────────────

function formatChatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';

  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatChatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function convertToChatMessage(msg: any, chatId: string): ChatMessage {
  return {
    id: String(msg.id || ''),
    chatId: String(msg.chatId || chatId),
    senderId: String(msg.senderId || ''),
    senderType: msg.senderType as ParticipantType || ParticipantType.DRIVER,
    content: String(msg.content || ''),
    attachmentUrl: msg.attachmentUrl,
    attachmentType: msg.attachmentType,
    status: msg.status as MessageStatus || MessageStatus.SENT,
    readAt: msg.readAt,
    deliveredAt: msg.deliveredAt,
    createdAt: String(msg.createdAt || new Date().toISOString()),
    updatedAt: msg.updatedAt,
  };
}

// ─── MessageItem component ────────────────────────────────────────────────────

interface MessageItemProps {
  item: Extract<FlatItem, { type: 'message' }>;
  prevItem: FlatItem | undefined;
  isOwnMessage: (msg: ChatMessage) => boolean;
}

function MessageItem({ item, prevItem, isOwnMessage }: MessageItemProps) {
  const { msg, isLast } = item;
  const prevMsg = prevItem?.type === 'message' ? prevItem.msg : null;
  const isOwn = isOwnMessage(msg);
  const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
  const showSenderName = !isOwn && !isSameSender;
  const hasAttachment = msg.attachmentUrl;
  const isImage =
    msg.attachmentType?.toLowerCase() === 'image' ||
    (msg.attachmentUrl && IMAGE_EXTENSION_REGEX.test(msg.attachmentUrl));
  const isOptimistic = msg.id.startsWith('temp-');

  // Debug log para anexos
  useEffect(() => {
    if (hasAttachment) {
      console.log('[MessageItem] Renderizando mensagem com anexo:', {
        messageId: msg.id,
        attachmentUrl: msg.attachmentUrl?.substring(0, 100),
        attachmentType: msg.attachmentType,
        isImage,
        hasExtension: msg.attachmentUrl ? IMAGE_EXTENSION_REGEX.test(msg.attachmentUrl) : false,
      });
    }
  }, [hasAttachment, msg.attachmentUrl, msg.attachmentType, isImage, msg.id]);

  return (
    <Box
      mb={isLast ? 'y0' : 'y8'}
      alignItems={isOwn ? 'flex-end' : 'flex-start'}
    // ✅ UX: Não mostrar diferença visual para mensagens otimísticas
    // O usuário não deve perceber demora - mensagem aparece como já enviada
    >
      {showSenderName && (
        <Text preset="text12" color="gray500" mb="y4" ml="x12">
          {String(msg.senderType).toUpperCase().includes('SUPPORT') ||
            String(msg.senderType).toUpperCase().includes('COLLABORATOR')
            ? 'Suporte'
            : 'Voce'}
        </Text>
      )}

      <Box
        backgroundColor={isOwn ? 'primary100' : 'white'}
        px="x16"
        py="y12"
        borderRadius="s16"
        maxWidth="80%"
        borderWidth={isOwn ? 0 : measure.m1}
        borderColor="gray200"
        shadowColor={isOwn ? 'primary100' : 'gray300'}
        shadowOffset={{ width: 0, height: 1 }}
        shadowOpacity={isOwn ? 0.3 : 0.1}
        shadowRadius={2}
        elevation={2}
      >
        {/* Anexo - Imagem */}
        {hasAttachment && isImage && (
          <Box mb="y8" borderRadius="s8" overflow="hidden" backgroundColor="gray100">
            <Image
              source={{ uri: msg.attachmentUrl }}
              style={{ width: 200, height: 150, borderRadius: 8 }}
              resizeMode="cover"
              onLoadStart={() => console.log('[MessageItem] Iniciando carregamento da imagem:', msg.attachmentUrl?.substring(0, 100))}
              onLoad={({ nativeEvent }) => console.log('[MessageItem] Imagem carregada:', {
                width: nativeEvent.source.width,
                height: nativeEvent.source.height,
              })}
              onError={(e) => console.error('[MessageItem] Erro ao carregar imagem:', {
                error: e.nativeEvent.error,
                attachmentUrl: msg.attachmentUrl,
              })}
            />
          </Box>
        )}

        {/* Anexo - Documento */}
        {hasAttachment && !isImage && (
          <TouchableOpacityBox
            mb="y8"
            backgroundColor={isOwn ? 'primary80' : 'gray100'}
            borderRadius="s8"
            px="x12"
            py="y8"
            flexDirection="row"
            alignItems="center"
            gap="x8"
          >
            <Text preset="text20">📄</Text>
            <Text preset="text13" color={isOwn ? 'white' : 'primary100'} fontWeight="500">
              Ver anexo
            </Text>
          </TouchableOpacityBox>
        )}

        {/* Texto da mensagem */}
        {msg.content && (
          <Text preset="text14" color={isOwn ? 'white' : 'colorTextPrimary'}>
            {msg.content}
          </Text>
        )}

        {/* Hora e status */}
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="flex-end"
          gap="x4"
          mt="y4"
        >
          {/* ✅ UX: Removido "Enviando..." - mensagem aparece como já enviada */}
          <Text preset="text12" color={isOwn ? 'white' : 'gray500'} textAlign="right">
            {formatChatTime(msg.createdAt)}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SuporteChatPage() {
  const { id } = useLocalSearchParams();
  const chatId = id ? String(id) : undefined;
  const queryClient = useQueryClient();

  const { userAuth, authCredentials } = useAuthCredentialsService();
  const { showToast } = useToastService();
  const [currentUserSenderId, setCurrentUserSenderId] = useState<string | null>(null);
  const [chatInfo, setChatInfo] = useState<ChatWithParticipants | null>(null);
  const [chatStatus, setChatStatus] = useState<ChatStatus>(ChatStatus.ACTIVE);
  const messagesEndRef = useRef<FlatList>(null);

  const { getMergedMessages, clearUnread } = useChatContext();
  const { optimisticMessages, addOptimisticMessage, removeOptimisticMessage } = useChatStore();
  const typingUsers = useTypingUsers(chatId);

  const {
    messages: messagesFromAPI,
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useGetChatMessages(chatId);

  const { ticket } = useGetTicketByChatId(chatId);

  const [wsMessages, setWsMessages] = useState<ChatMessage[]>([]);

  const convertedApiMessages = useMemo(
    () => (messagesFromAPI || []).map(msg => convertToChatMessage(msg, chatId || '')),
    [messagesFromAPI, chatId],
  );

  // ✅ PERFORMANCE: Memoizar mesclagem de mensagens para evitar recomputação
  const optimisticMessagesForChat = optimisticMessages[chatId || ''];
  const messages = useMemo(
    () => getMergedMessages(chatId || '', [...convertedApiMessages, ...wsMessages]),
    [chatId, convertedApiMessages, wsMessages, optimisticMessagesForChat]
  );

  const flatData = useMemo<FlatItem[]>(() => {
    const result: FlatItem[] = [];

    messages.forEach((msg, index) => {
      const date = formatChatDate(msg.createdAt);
      const prevMsg = messages[index - 1];
      const prevDate = prevMsg ? formatChatDate(prevMsg.createdAt) : null;

      if (date !== prevDate) {
        result.push({ type: 'date', date });
      }

      const nextMsg = messages[index + 1];
      const isLast = !nextMsg || formatChatDate(nextMsg.createdAt) !== date;

      result.push({ type: 'message', msg, isLast });
    });

    return result;
  }, [messages]);

  const { mutate: sendMessageMutation, isPending: isSending } = usePostMessage();

  const { uploadAttachments, isLoading: uploadingAttachment } = useChatAttachmentUpload({
    onError: (error) => {
      console.error('Erro ao fazer upload:', error);
      showToast({ message: 'Não foi possível enviar o anexo', type: 'error' });
    },
  });

  // ✅ OTIMIZAÇÃO: Usar driverId diretamente do userAuth em vez de buscar o chat
  // O userAuth já tem o driverId carregado no login via collaboratorService.getProfile()
  useEffect(() => {
    if (!userAuth?.id) return;

    // Usar driverId se disponível (motoristas), senão usar keycloakUserId
    const senderId = userAuth.driverId || userAuth.id;
    setCurrentUserSenderId(senderId);

    // Buscar info do chat apenas para status e subject (mais leve)
    if (chatId) {
      getChatService(chatId)
        .then((result) => {
          if (result.success && result.result) {
            const chat = result.result as unknown as ChatWithParticipants;
            setChatInfo(chat);
            setChatStatus(chat.status || ChatStatus.ACTIVE);
          }
        })
        .catch((error) => {
          console.error('[SuporteChatPage] Error loading chat info:', error);
        });
    }
  }, [chatId, userAuth?.id, userAuth?.driverId]);

  // Marcar como lida quando carregar mensagens
  useEffect(() => {
    if (messagesFromAPI && messagesFromAPI.length > 0 && chatId && userAuth?.id) {
      markChatReadService(chatId, userAuth.id).catch(console.error);
      clearUnread(chatId);
    }
  }, [messagesFromAPI, chatId, userAuth?.id, clearUnread]);

  // Handler para mensagens recebidas via WebSocket
  const handleNewMessage = useCallback(
    (wsMessage: ChatMessage) => {
      if (wsMessage.chatId !== chatId) return;

      console.log('[handleNewMessage] Nova mensagem recebida via WebSocket:', {
        id: wsMessage.id,
        senderId: wsMessage.senderId,
        content: wsMessage.content?.substring(0, 30),
        currentUserSenderId,
      });

      // Não adicionar mensagens enviadas pelo próprio usuário (já estão como otimistas)
      if (currentUserSenderId && String(wsMessage.senderId) === String(currentUserSenderId)) {
        console.log('[handleNewMessage] Ignorando mensagem própria - já existe como otimista');
        return;
      }

      setWsMessages(prevMessages => {
        const exists = prevMessages.some(msg => msg.id === wsMessage.id);
        if (exists) {
          console.log('[handleNewMessage] Mensagem já existe em wsMessages');
          return prevMessages;
        }
        console.log('[handleNewMessage] Adicionando nova mensagem');
        return [...prevMessages, wsMessage];
      });

      if (userAuth?.id && chatId) {
        markChatReadService(chatId, userAuth.id).catch(console.error);
        clearUnread(chatId);
      }

      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [chatId, userAuth?.id, clearUnread, currentUserSenderId],
  );

  // Handler para quando o chat for fechado pelo operador
  const handleChatClosed = useCallback(
    (closedChatId: string) => {
      if (closedChatId === chatId) {
        setChatStatus(ChatStatus.CLOSED);
        refetchMessages();
      }
    },
    [chatId, refetchMessages],
  );

  const { isConnected, emitTypingStart, emitTypingStop } = useChatWebSocket({
    enabled: !!chatId,
    chatId: chatId,
    onMessage: handleNewMessage,
    onChatClosed: handleChatClosed,
    onError: (error) => {
      console.error('[SuporteChatPage] WebSocket error:', error);
    },
  });

  // ✅ OTIMIZAÇÃO: Removido useEffect de scroll duplicado
  // O scroll já é feito no onContentSizeChange da FlatList (mais eficiente)

  // ✅ PERFORMANCE: Upload não-bloqueante
  // Mensagem aparece imediatamente com URI local, upload roda em background
  const handleSendMessage = useCallback(
    (content: string, tempAttachments?: any[]) => {
      if (!chatId || isSending || chatStatus === ChatStatus.CLOSED) return;
      if (!content.trim() && !tempAttachments?.length) return;

      const attachmentType = tempAttachments?.[0]?.type === 'image' ? 'image' : 'document';

      // Se tem anexos, criar mensagem otimística IMEDIATAMENTE com URI local
      if (tempAttachments && tempAttachments.length > 0) {
        const tempId = generateTempId();
        const localUri = tempAttachments[0].uri;

        // Criar mensagem otimística com URI local (aparece instantaneamente)
        const optimisticMsg: ChatMessage = {
          id: tempId,
          chatId: String(chatId),
          senderId: currentUserSenderId || '',
          senderType: ParticipantType.DRIVER,
          content: content.trim() || (attachmentType === 'image' ? 'Imagem' : 'Anexo'),
          attachmentUrl: localUri, // URI local para exibição imediata
          attachmentType: attachmentType as any,
          status: MessageStatus.SENT,
          createdAt: new Date().toISOString(),
        };

        // Adicionar mensagem otimística (aparece na tela IMEDIATAMENTE)
        addOptimisticMessage(chatId, optimisticMsg);

        // Fazer upload em BACKGROUND (não bloqueia)
        const uris = tempAttachments.map(a => a.uri);
        console.log('[handleSendMessage] Iniciando upload em background:', {
          tempId,
          attachmentsCount: tempAttachments.length,
        });

        uploadAttachments({ files: uris })
          .then((uploadResult) => {
            console.log('[handleSendMessage] Upload concluído:', {
              success: uploadResult.success,
              urls: uploadResult.result?.urls,
            });

            if (uploadResult.success && uploadResult.result?.urls?.[0]) {
              // Enviar mensagem com URL do S3
              const payload: any = {
                chatId,
                content: content.trim() || (attachmentType === 'image' ? 'Imagem' : 'Anexo'),
                senderId: currentUserSenderId,
                attachmentUrl: uploadResult.result.urls[0],
                attachmentType,
              };

              sendMessageMutation(payload, {
                onSuccess: () => {
                  // Remover mensagem otimística (a real já foi adicionada ao cache)
                  removeOptimisticMessage(chatId, tempId);
                  // ✅ PERFORMANCE: Não invalidar aqui - usePostMessage já gerencia o cache
                },
                onError: (error) => {
                  console.error('[handleSendMessage] Erro ao enviar:', error);
                  removeOptimisticMessage(chatId, tempId);
                  showToast({ message: 'Não foi possível enviar a mensagem', type: 'error' });
                },
              });
            } else {
              console.error('[handleSendMessage] Upload falhou - sem URLs');
              removeOptimisticMessage(chatId, tempId);
              showToast({ message: 'Não foi possível fazer upload dos anexos', type: 'error' });
            }
          })
          .catch((error: any) => {
            console.error('[handleSendMessage] Erro no upload:', error?.message);
            removeOptimisticMessage(chatId, tempId);
            showToast({ message: `Falha no upload: ${error?.message || 'Erro desconhecido'}`, type: 'error' });
          });

        return; // Não bloqueia - mensagem já aparece como otimística
      }

      // Mensagem sem anexo - comportamento normal
      const payload: any = {
        chatId,
        content: content.trim(),
        senderId: currentUserSenderId,
      };

      sendMessageMutation(payload, {
        // ✅ PERFORMANCE: Não invalidar aqui - usePostMessage já gerencia o cache
        onError: (error) => {
          console.error('Erro ao enviar mensagem:', error);
          showToast({ message: 'Não foi possível enviar a mensagem', type: 'error' });
        },
      });
    },
    [chatId, isSending, chatStatus, uploadAttachments, sendMessageMutation, queryClient, currentUserSenderId, addOptimisticMessage, removeOptimisticMessage],
  );

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (!chatId || !isConnected) return;

      if (isTyping) {
        emitTypingStart(chatId);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current as number);
        }

        typingTimeoutRef.current = setTimeout(() => {
          emitTypingStop(chatId);
        }, 3000);
      } else {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current as number);
        }
        emitTypingStop(chatId);
      }
    },
    [chatId, isConnected, emitTypingStart, emitTypingStop],
  );

  const isOwnMessage = useCallback(
    (msg: ChatMessage) => {
      if (!currentUserSenderId || !msg.senderId) {
        return String(msg.senderType).toUpperCase().includes('DRIVER');
      }
      return String(msg.senderId) === String(currentUserSenderId);
    },
    [currentUserSenderId],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FlatItem; index: number }) => {
      if (item.type === 'date') {
        return (
          <Box alignItems="center" mb="y12" mt="y16">
            <Box backgroundColor="gray200" px="x12" py="y4" borderRadius="s8">
              <Text preset="text12" color="gray600">
                {item.date}
              </Text>
            </Box>
          </Box>
        );
      }

      return (
        <MessageItem
          item={item}
          prevItem={flatData[index - 1]}
          isOwnMessage={isOwnMessage}
        />
      );
    },
    [flatData, isOwnMessage],
  );

  const keyExtractor = useCallback(
    (item: FlatItem, index: number) =>
      item.type === 'date'
        ? `date-${item.date}-${index}`
        : `msg-${item.msg.id}-${index}`,
    [],
  );

  const isChatClosed = chatStatus === 'CLOSED' || chatInfo?.status === 'CLOSED';

  const headerTitle = chatInfo?.routeId
    ? `Rota ${chatInfo.routeId}`
    : chatInfo?.subject || 'Suporte';

  const headerSubtitle = chatInfo?.serviceId
    ? `Servico #${chatInfo.serviceId}`
    : ticket?.ticketNumber
      ? `Protocolo: ${ticket.ticketNumber}`
      : isConnected
        ? 'Online'
        : 'Offline';

  const typingIndicatorText =
    typingUsers.length > 0
      ? typingUsers.length === 1
        ? 'Digitando...'
        : `${typingUsers.length} pessoas digitando...`
      : null;

  if (isLoadingMessages) {
    return (
      <Box flex={1} backgroundColor="white" alignItems="center" justifyContent="center">
        <ActivityIndicator />
        <Text preset="text14" color="gray500" mt="y16">
          Carregando conversa...
        </Text>
      </Box>
    );
  }

  return (
    <ScreenBase
      buttonLeft={<ButtonBack />}
      title={
        <Text preset="text16" fontWeight="600" color="colorTextPrimary">
          {headerTitle}
        </Text>
      }
    >
      <Box flex={1} backgroundColor="gray50" mt='t10'>
        {/* Header */}

        <Box
          backgroundColor="white"
          px="x16"
          py="y12"
          borderBottomWidth={measure.m1}
          borderBottomColor="gray200"
        >
          <Box flexDirection="row" alignItems="center" gap="x8">
            <Text preset="text12" color="gray500">
              {headerSubtitle}
            </Text>
          </Box>
          <Box flexDirection="row" alignItems="center" gap="x8" mt="y8">

            <Box
              backgroundColor={isChatClosed ? 'gray300' : 'gray200'}
              px="x12"
              py="y4"
              borderRadius="s16"
            >
              <Text
                preset="text12"
                color={isChatClosed ? 'gray700' : 'gray600'}
                fontWeight="500"
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
                  backgroundColor="greenSuccess"
                />
                <Text preset="text10" color="greenSuccess">
                  Conectado
                </Text>
              </Box>
            )}
          </Box>
        </Box>

        {/* Messages */}
        <FlatList
          ref={messagesEndRef}
          data={flatData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ padding: measure.y16, flexGrow: 1 }}
          onContentSizeChange={() => {
            messagesEndRef.current?.scrollToEnd({ animated: true });
          }}
          // ✅ REMOVIDO: getItemLayout com altura fixa incorreta causava bugs de scroll
          // Mensagens têm alturas variáveis (texto, imagens, documentos)
          ListEmptyComponent={
            <Box flex={1} py="y32" alignItems="center" justifyContent="center">
              <Text preset="text14" color="gray400" textAlign="center">
                Nenhuma mensagem ainda. Envie a primeira mensagem!
              </Text>
            </Box>
          }
        />

        {/* Typing indicator */}
        {typingIndicatorText && (
          <Box px="x16" py="y8" backgroundColor="gray50">
            <Text preset="text12" color="gray500">
              {typingIndicatorText}
            </Text>
          </Box>
        )}

        {/* Chat finalizado */}
        {isChatClosed && (
          <Box backgroundColor="gray100" px="x16" py="y8">
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
          placeholder={isChatClosed ? 'Chat finalizado' : 'Digite uma mensagem...'}
          disableAttachments={isChatClosed}
        />
      </Box>
    </ScreenBase>
  );
}