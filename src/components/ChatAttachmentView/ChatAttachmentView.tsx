import React from 'react';
import { Image, Linking } from 'react-native';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { measure } from '@/theme';

import Modal from '../Modal/Modal';

export interface Attachment {
  url: string;
  type: 'image' | 'document';
  name?: string;
  size?: number;
}

interface ChatAttachmentViewProps {
  attachments: Attachment[];
  compact?: boolean;
}

export default function ChatAttachmentView({
  attachments,
  compact = false,
}: ChatAttachmentViewProps) {
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const handleImagePress = (index: number) => {
    if (attachments[index].type === 'image') {
      setSelectedImageIndex(index);
    } else {
      // Abrir link para documentos
      Linking.openURL(attachments[index].url);
    }
  };

  if (compact) {
    // Exibição compacta (para lista de mensagens)
    if (attachments.length === 0) return null;

    return (
      <Box flexDirection="row" flexWrap="wrap" gap="x8" marginTop="y8">
        {attachments.map((attachment, index) => (
          <TouchableOpacityBox
            key={index}
            onPress={() => handleImagePress(index)}
            backgroundColor="gray50"
            borderRadius="s8"
            paddingHorizontal="x8"
            paddingVertical="y6"
            flexDirection="row"
            alignItems="center"
            gap="x6">
            <Text preset="text14">
              {attachment.type === 'image' ? '📷' : '📄'}
            </Text>
            <Text preset="text12" color="colorTextPrimary" numberOfLines={1}>
              {attachment.type === 'image' ? 'Foto' : attachment.name || 'Documento'}
            </Text>
          </TouchableOpacityBox>
        ))}
      </Box>
    );
  }

  // Exibição completa (para preview)
  return (
    <>
      <Box flexDirection="row" flexWrap="wrap" gap="x8">
        {attachments.map((attachment, index) => (
          <TouchableOpacityBox
            key={index}
            onPress={() => handleImagePress(index)}
            backgroundColor="gray50"
            borderRadius="s12"
            padding="x12"
            minWidth={measure.x120}
            maxWidth={measure.x200}>
            {attachment.type === 'image' ? (
              <Box
                width={measure.x120}
                height={measure.y120}
                borderRadius="s8"
                overflow="hidden"
                backgroundColor="gray200">
                <Image
                  source={{ uri: attachment.url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </Box>
            ) : (
              <Box
                width={measure.x120}
                height={measure.y120}
                borderRadius="s8"
                backgroundColor="gray100"
                alignItems="center"
                justifyContent="center">
                <Text preset="text32">📄</Text>
              </Box>
            )}

            <Box marginTop="y6">
              <Text
                preset="text12"
                color="colorTextPrimary"
                fontWeight="bold"
                numberOfLines={1}>
                {attachment.type === 'image' ? 'Imagem' : attachment.name}
              </Text>
              {attachment.size && (
                <Text preset="text12" color="secondaryTextColor">
                  {formatFileSize(attachment.size)}
                </Text>
              )}
            </Box>
          </TouchableOpacityBox>
        ))}
      </Box>

      {/* Modal de Visualização de Imagem */}
      <Modal
        isVisible={selectedImageIndex !== null && attachments[selectedImageIndex!]?.type === 'image'}
        onClose={() => setSelectedImageIndex(null)}
        title=''
      >
        <Box flex={1} backgroundColor="overlayBlack90" alignItems="center" justifyContent="center">
          <Box width="100%" height="80%" alignItems="center" justifyContent="center">
            <TouchableOpacityBox
              onPress={() => setSelectedImageIndex(null)}
              position="absolute"
              top={measure.t20}
              right={measure.r20}
              backgroundColor="white"
              borderRadius="s20"
              width={measure.x40}
              height={measure.y40}
              alignItems="center"
              justifyContent="center">
              <Text preset="text24" color="gray700">
                ×
              </Text>
            </TouchableOpacityBox>

            <Image
              source={{ uri: attachments[selectedImageIndex!]?.url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </Box>
        </Box>
      </Modal>
    </>
  );
}
