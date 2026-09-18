import React, { useState, useCallback, useRef } from 'react';
import { TextInput as TextInputRN, type TextInput as TextInputRef } from 'react-native';

import { Box, Text, TouchableOpacityBox } from '@/components';
import type { ChatSendOutcome } from '@/domain/agility/chat/dto/types';
import { appendAttachments, MAX_CHAT_ATTACHMENTS } from '@/domain/agility/chat/useCase/sendChatBatch';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import ChatAttachmentButton, { type Attachment } from '../ChatAttachmentButton';

const TextInput = TextInputRN;

interface ChatInputProps {
  /**
   * Devolve o que NÃO foi enviado; o campo fica só com isso.
   * Promessa rejeitada = erro inesperado: nada é apagado.
   */
  onSendMessage: (content: string, attachments?: Attachment[]) => Promise<ChatSendOutcome>;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  disableAttachments?: boolean;
  maxLength?: number;
}

const MAX_LENGTH_DEFAULT = 2000;

export default function ChatInput({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = 'Digite uma mensagem...',
  disableAttachments = false,
  maxLength = MAX_LENGTH_DEFAULT,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInputRef>(null);
  const { showToast } = useToastService();

  const hasAttachments = attachments.length > 0;
  const hasContent = message.trim().length > 0 || hasAttachments;
  const isDisabled = disabled || sending;
  const canSend = hasContent && !isDisabled;

  const handleInputChange = useCallback((value: string) => {
    setMessage(value);
    onTyping(value.length > 0);
  }, [onTyping]);

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    // O que estava escrito quando o envio começou. Como o campo continua editável,
    // o motorista pode digitar durante o envio — e aí o texto novo é dele, não pode
    // ser substituído pelo resultado do envio anterior.
    const textoEnviado = message;
    setSending(true);
    try {
      const outcome = await onSendMessage(message.trim(), hasAttachments ? attachments : undefined);
      setMessage(atual => (atual === textoEnviado ? outcome.unsentText : atual));
      setAttachments(outcome.unsentAttachments);
      if (!outcome.unsentText && outcome.unsentAttachments.length === 0) {
        onTyping(false);
      }
    } catch (error) {
      // Erro inesperado: mantém texto e anexos para o motorista tentar de novo.
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  }, [canSend, message, attachments, hasAttachments, onSendMessage, onTyping]);

  const handleAttachmentsSelected = useCallback((selected: Attachment[]) => {
    const { list, truncated } = appendAttachments(attachments, selected);
    setAttachments(list);
    if (truncated) {
      showToast({ message: `Envie no máximo ${MAX_CHAT_ATTACHMENTS} anexos por vez.`, type: 'error' });
    }
  }, [attachments, showToast]);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const nearLimit = message.length > maxLength * 0.8;

  return (
    <Box backgroundColor="white" padding="y12" borderTopWidth={measure.m1} borderTopColor="borderColor">

      {hasAttachments && (
        <Box flexDirection="row" flexWrap="wrap" gap="x8" marginBottom="y12">
          {attachments.map((attachment, index) => (
            <AttachmentPreview
              key={index}
              attachment={attachment}
              onRemove={() => removeAttachment(index)}
            />
          ))}
        </Box>
      )}

      <Box flexDirection="row" alignItems="flex-end" gap="x8">
        {!disableAttachments && (
          <ChatAttachmentButton
            disabled={isDisabled}
            onAttachmentsSelected={handleAttachmentsSelected}
          />
        )}

        <Box flex={1} backgroundColor="primary10" borderRadius="s16" paddingHorizontal="x12" paddingVertical="y8">
          <TextInput
            testID="chat-input-message"
            ref={inputRef}
            placeholder={placeholder}
            placeholderTextColor="black"
            value={message}
            onChangeText={handleInputChange}
            onSubmitEditing={handleSend}
            // NÃO usar `isDisabled` aqui: travar o campo durante o envio derrubava o
            // teclado e ele reabria em seguida, piscando por cima da conversa. Só o
            // `disabled` da tela (atendimento encerrado) trava de verdade.
            editable={!disabled}
            multiline
            maxLength={maxLength}
            textAlignVertical="top"
            blurOnSubmit={false}
          />
        </Box>

        <TouchableOpacityBox
          testID="chat-input-send"
          accessibilityLabel="Enviar mensagem"
          onPress={handleSend}
          disabled={!canSend}
          backgroundColor="primary100"
          borderRadius="s16"
          width={measure.x48}
          height={measure.y48}
          alignItems="center"
          justifyContent="center"
          opacity={canSend ? 1 : 0.5}>
          <Text preset="text20" color="white" fontWeight="bold">
            {sending ? '...' : '➤'}
          </Text>
        </TouchableOpacityBox>
      </Box>

      {message.length > 0 && (
        <Box marginTop="y4">
          <Text
            preset="text12"
            color={nearLimit ? 'redError' : 'secondaryTextColor'}
            textAlign="right">
            {message.length}/{maxLength}
          </Text>
        </Box>
      )}
    </Box>
  );
}

function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const label = attachment.type === 'image' ? '📷 Foto' : `📄 ${attachment.name ?? 'Documento'}`;

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor="gray50"
      borderRadius="s12"
      paddingHorizontal="x8"
      paddingVertical="y6"
      gap="x6">
      <Text preset="text14" color="colorTextPrimary" numberOfLines={1}>
        {label}
      </Text>
      <TouchableOpacityBox onPress={onRemove} hitSlop={8}>
        <Text preset="text16" color="redError" fontWeight="bold">×</Text>
      </TouchableOpacityBox>
    </Box>
  );
}