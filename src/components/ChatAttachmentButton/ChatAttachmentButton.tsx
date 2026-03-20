import React, { useState } from 'react';

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import Modal from '../Modal/Modal';

export interface Attachment {
  uri: string;
  type: 'image' | 'document';
  name?: string;
  size?: number;
}

interface ChatAttachmentButtonProps {
  disabled?: boolean;
  onAttachmentsSelected: (attachments: Attachment[]) => void;
}

export default function ChatAttachmentButton({
  disabled = false,
  onAttachmentsSelected,
}: ChatAttachmentButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);
  const { showToast } = useToastService();

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' && mediaStatus !== 'granted') {
      showToast({ message: 'Precisamos da permissão para acessar sua galeria e câmera.', type: 'error' });
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    setShowMenu(false);
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const attachments: Attachment[] = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image' as const,
        }));
        setSelectedAttachments(attachments);
        onAttachmentsSelected(attachments);
      }
    } catch (error) {
      showToast({ message: 'Não foi possível selecionar a imagem', type: 'error' });
      console.error('Erro ao selecionar imagem:', error);
    }
  };

  const handleTakePhoto = async () => {
    setShowMenu(false);
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const attachment: Attachment = {
          uri: result.assets[0].uri,
          type: 'image',
        };
        setSelectedAttachments([attachment]);
        onAttachmentsSelected([attachment]);
      }
    } catch (error) {
      showToast({ message: 'Não foi possível tirar a foto', type: 'error' });
      console.error('Erro ao tirar foto:', error);
    }
  };

  const handlePickDocument = async () => {
    setShowMenu(false);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/*',
        ],
        multiple: true,
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const attachments: Attachment[] = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'document' as const,
          name: asset.name,
          size: asset.size,
        }));
        setSelectedAttachments(attachments);
        onAttachmentsSelected(attachments);
      }
    } catch (error) {
      showToast({ message: 'Não foi possível selecionar o documento', type: 'error' });
      console.error('Erro ao selecionar documento:', error);
    }
  };

  return (
    <>
      <TouchableOpacityBox onPress={() => setShowMenu(true)} disabled={disabled}>
        <Box width={measure.x40} height={measure.y40} alignItems="center" justifyContent="center">
          <Text preset="text24" color={disabled ? 'gray400' : 'primary100'}>
            📎
          </Text>
        </Box>
      </TouchableOpacityBox>

      <Modal
        isVisible={showMenu}
        onClose={() => setShowMenu(false)}
        title='Adicionar Anexo'
      >
        <Box gap="y12">
          {/* Opção: Tirar Foto */}
          <TouchableOpacityBox
            onPress={handleTakePhoto}
            backgroundColor="gray50"
            borderRadius="s16"
            padding="y16"
            flexDirection="row"
            alignItems="center"
            gap="x12">
            <Box
              width={measure.x40}
              height={measure.y40}
              backgroundColor="primary100"
              borderRadius="s20"
              alignItems="center"
              justifyContent="center">
              <Text preset="text20">📷</Text>
            </Box>
            <Box flex={1}>
              <Text preset="text16" color="colorTextPrimary" fontWeight="bold">
                Tirar Foto
              </Text>
              <Text preset="text12" color="secondaryTextColor">
                Usar câmera do dispositivo
              </Text>
            </Box>
          </TouchableOpacityBox>

          {/* Opção: Selecionar Imagem */}
          <TouchableOpacityBox
            onPress={handlePickImage}
            backgroundColor="gray50"
            borderRadius="s16"
            padding="y16"
            flexDirection="row"
            alignItems="center"
            gap="x12">
            <Box
              width={measure.x40}
              height={measure.y40}
              backgroundColor="primary100"
              borderRadius="s20"
              alignItems="center"
              justifyContent="center">
              <Text preset="text20">🖼️</Text>
            </Box>
            <Box flex={1}>
              <Text preset="text16" color="colorTextPrimary" fontWeight="bold">
                Galeria
              </Text>
              <Text preset="text12" color="secondaryTextColor">
                Selecionar da galeria
              </Text>
            </Box>
          </TouchableOpacityBox>

          {/* Opção: Selecionar Documento */}
          <TouchableOpacityBox
            onPress={handlePickDocument}
            backgroundColor="gray50"
            borderRadius="s16"
            padding="y16"
            flexDirection="row"
            alignItems="center"
            gap="x12">
            <Box
              width={measure.x40}
              height={measure.y40}
              backgroundColor="primary100"
              borderRadius="s20"
              alignItems="center"
              justifyContent="center">
              <Text preset="text20">📄</Text>
            </Box>
            <Box flex={1}>
              <Text preset="text16" color="colorTextPrimary" fontWeight="bold">
                Documento
              </Text>
              <Text preset="text12" color="secondaryTextColor">
                PDF, Word, etc.
              </Text>
            </Box>
          </TouchableOpacityBox>

          {/* Botão Cancelar */}
          <TouchableOpacityBox
            onPress={() => setShowMenu(false)}
            backgroundColor="redError"
            borderRadius="s16"
            padding="y16"
            marginTop="y12">
            <Text preset="text16" color="white" fontWeight="bold" textAlign="center">
              Cancelar
            </Text>
          </TouchableOpacityBox>
        </Box>
      </Modal>
    </>
  );
}