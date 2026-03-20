import React, { useState } from 'react';
import { TextInput } from 'react-native';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { measure } from '@/theme';

import ChatAttachmentButton, { type Attachment } from '../ChatAttachmentButton';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  disableAttachments?: boolean;
}

export default function ChatInput({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = 'Digite uma mensagem...',
  disableAttachments = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [sending, setSending] = useState(false);

  const handleInputChange = (value: string) => {
    setMessage(value);
    onTyping(true);
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    const hasContent = trimmed || attachments.length > 0;

    if (!hasContent || disabled || sending) return;

    setSending(true);

    try {
      await onSendMessage(trimmed, attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
      setShowAttachments(false);
      onTyping(false);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  const handleAttachmentsSelected = (selectedAttachments: Attachment[]) => {
    setAttachments(prev => [...prev, ...selectedAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const hasAttachments = attachments.length > 0;
  const hasContent = message.trim() || hasAttachments;

  return (
    <Box backgroundColor="white" padding="y12" borderTopWidth={measure.m1} borderTopColor="borderColor">
      {/* Preview de Anexos */}
      {hasAttachments && (
        <Box flexDirection="row" flexWrap="wrap" gap="x8" marginBottom="y12">
          {attachments.map((attachment, index) => (
            <Box
              key={index}
              position="relative"
              flexDirection="row"
              alignItems="center"
              backgroundColor="gray50"
              borderRadius="s12"
              paddingHorizontal="x8"
              paddingVertical="y6"
              gap="x6">
              <Text preset="text14" color="colorTextPrimary" numberOfLines={1}>
                {attachment.type === 'image' ? '📷 Foto' : `📄 ${attachment.name || 'Documento'}`}
              </Text>
              <TouchableOpacityBox onPress={() => removeAttachment(index)}>
                <Text preset="text16" color="redError" fontWeight="bold">
                  ×
                </Text>
              </TouchableOpacityBox>
            </Box>
          ))}
        </Box>
      )}

      {/* Área de Input */}
      <Box flexDirection="row" alignItems="flex-end" gap="x8">
        {/* Botão de Anexos */}
        {!disableAttachments && (
          <ChatAttachmentButton
            disabled={disabled || sending}
            onAttachmentsSelected={handleAttachmentsSelected}
          />
        )}

        {/* Input de Texto */}
        <Box
          flex={1}
          backgroundColor="gray100"
          borderRadius="s16"
          paddingHorizontal="x12"
          paddingVertical="y8">
          <TextInput
            placeholder={placeholder}
            placeholderTextColor="gray400"
            value={message}
            onChangeText={handleInputChange}
            editable={!disabled && !sending}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Box>

        {/* Botão de Enviar */}
        <TouchableOpacityBox
          onPress={handleSend}
          disabled={!hasContent || disabled || sending}
          backgroundColor="primary100"
          borderRadius="s16"
          width={measure.x48}
          height={measure.y48}
          alignItems="center"
          justifyContent="center"
          opacity={hasContent && !disabled && !sending ? 1 : 0.5}>
          <Text preset="text20" color="white" fontWeight="bold">
            {sending ? '...' : '➤'}
          </Text>
        </TouchableOpacityBox>
      </Box>

      {/* Contador de Caracteres */}
      {message.length > 0 && (
        <Box marginTop="y4">
          <Text preset="text12" color="secondaryTextColor" textAlign="right">
            {message.length} caracteres
          </Text>
        </Box>
      )}
    </Box>
  );
}
