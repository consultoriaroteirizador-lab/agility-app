import React, { useState, useCallback } from 'react';
import { Alert } from 'react-native';

import { useRouter } from 'expo-router';

import {
  Box,
  Text,
  TouchableOpacityBox,
  ActivityIndicator,
  ChatInput,
  ChatAttachmentView,
} from '@/components';
import {
  useChatAttachmentUpload,
  postMessageService,
  type MessageItem,
} from '@/domain/agility/chat';
import { useAuthCredentialsService } from '@/services';

export type Attachment = {
  url: string;
  type: 'image' | 'document';
  name?: string;
  size?: number;
};

export default function ChatScreen() {
  const router = useRouter();
  const { userAuth } = useAuthCredentialsService();
  const { uploadAttachments, isLoading: uploading } = useChatAttachmentUpload({
    onSuccess: data => {
      console.log('Upload bem-sucedido:', data);
    },
    onError: error => {
      console.error('Erro ao fazer upload:', error);
      Alert.alert('Erro', 'Não foi possível enviar os anexos');
    },
  });

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSendMessage = useCallback(
    async (content: string, tempAttachments?: Attachment[]) => {
      if (!content && !tempAttachments?.length) return;

      setSending(true);

      try {
        let attachmentUrls: string[] = [];

        // Fazer upload dos anexos se houver
        if (tempAttachments && tempAttachments.length > 0) {
          const uris = tempAttachments.map(a => a.url);
          const uploadResult = await uploadAttachments({ files: uris });

          if (uploadResult.success && uploadResult.result?.urls) {
            attachmentUrls = uploadResult.result.urls;
          } else {
            throw new Error('Erro ao fazer upload dos anexos');
          }
        }

        // Enviar mensagem com anexos
        const payload = {
          content,
          chatId: 'chat-id-here', // Substituir pelo ID do chat real
          attachments: attachmentUrls,
        };

        const response = await postMessageService(payload);

        if (response.success && response.result) {
          setMessages(prev => [...prev, response.result!]);
        } else {
          throw new Error('Erro ao enviar mensagem');
        }
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        Alert.alert('Erro', 'Não foi possível enviar a mensagem');
      } finally {
        setSending(false);
      }
    },
    [uploadAttachments],
  );

  const handleTyping = useCallback((isTyping: boolean) => {
    // Enviar evento de "digitando" via WebSocket
    console.log('Digitando:', isTyping);
  }, []);

  return (
    <Box flex={1} backgroundColor="backgroundColor">
      {/* Header */}
      <Box backgroundColor="white" paddingHorizontal="x16" paddingTop="y12" paddingBottom="y16" marginBottom="y16">
        <Box flexDirection="row" alignItems="center" justifyContent="center" width="100%">
          <TouchableOpacityBox onPress={() => router.back()} marginRight="x12">
            <Text preset="text18" color="primary100">
              ←
            </Text>
          </TouchableOpacityBox>
          <Box flex={1}>
            <Text preset="text20" fontWeight="bold" color="colorTextPrimary">
              Chat
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Conteúdo do Chat */}
      {loading ? (
        <Box flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator />
          <Text preset="text14" marginTop="y12">
            Carregando mensagens...
          </Text>
        </Box>
      ) : (
        <Box flex={1} paddingHorizontal="x16">
          {/* Mensagens */}
          <Box flex={1} paddingBottom="y12">
            {messages.length === 0 ? (
              <Box flex={1} alignItems="center" justifyContent="center">
                <Text preset="text14" color="secondaryTextColor" textAlign="center">
                  Nenhuma mensagem ainda.
                </Text>
                <Text preset="text12" color="secondaryTextColor" marginTop="y8" textAlign="center">
                  Seja o primeiro a enviar uma mensagem!
                </Text>
              </Box>
            ) : (
              <Box gap="y8">
                {messages.map((message, index) => (
                  <Box
                    key={message.id || index}
                    alignSelf={message.senderId === userAuth?.id ? 'flex-end' : 'flex-start'}
                    maxWidth="80%">
                    <Box
                      backgroundColor={
                        message.senderId === userAuth?.id ? 'primary100' : 'gray100'
                      }
                      borderRadius="s16"
                      padding="x12"
                      paddingVertical="y8">
                      {message.content && (
                        <Text
                          preset="text14"
                          color={
                            message.senderId === userAuth?.id ? 'white' : 'colorTextPrimary'
                          }>
                          {message.content}
                        </Text>
                      )}

                      {/* Exibir anexos da mensagem */}
                      {message.attachments && message.attachments.length > 0 && (
                        <ChatAttachmentView
                          attachments={message.attachments.map(url => ({
                            url,
                            type: url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                              ? 'image'
                              : 'document',
                          }))}
                          compact={true}
                        />
                      )}

                      {/* Timestamp */}
                      {message.createdAt && (
                        <Text
                          preset="text12"
                          color={
                            message.senderId === userAuth?.id ? 'white' : 'gray500'
                          }
                          marginTop="y4"
                          textAlign="right">
                          {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Input de Mensagem */}
          <ChatInput
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            disabled={sending || uploading}
            placeholder="Digite uma mensagem..."
          />
        </Box>
      )}
    </Box>
  );
}
