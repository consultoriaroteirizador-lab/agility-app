import React, { useState, useCallback, useRef } from 'react';
import { TextInput as TextInputRN, type TextInput as TextInputRef } from 'react-native';
const TextInput = TextInputRN;

import { Box, Text, TouchableOpacityBox } from '@/components';
import { measure } from '@/theme';

import ChatAttachmentButton, { type Attachment } from '../ChatAttachmentButton';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
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

    const trimmed = message.trim();
    setSending(true);

    try {
      await onSendMessage(trimmed, hasAttachments ? attachments : undefined);
      setMessage('');
      setAttachments([]);
      onTyping(false);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  }, [canSend, message, attachments, hasAttachments, onSendMessage, onTyping]);

  const handleAttachmentsSelected = useCallback((selected: Attachment[]) => {
    setAttachments(prev => [...prev, ...selected]);
  }, []);

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
            ref={inputRef}
            placeholder={placeholder}
            placeholderTextColor="black"
            value={message}
            onChangeText={handleInputChange}
            onSubmitEditing={handleSend}
            editable={!isDisabled}
            multiline
            maxLength={maxLength}
            textAlignVertical="top"
            blurOnSubmit={false}
          />
        </Box>

        <TouchableOpacityBox
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