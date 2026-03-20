import React, { useState } from 'react';
import {
  Alert,
  Image,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { useAuthCredentialsService } from '@/services';
import { measure } from '@/theme';
import { moderateScale } from '@/theme/functions/Metrics';

interface ProfilePhotoPickerProps {
  size?: number;
  editable?: boolean;
  onPhotoChange?: (uri: string) => void;
  initialUri?: string;
}

export default function ProfilePhotoPicker({
  size = 100,
  editable = true,
  onPhotoChange,
  initialUri,
}: ProfilePhotoPickerProps) {
  const { userAuth } = useAuthCredentialsService();
  const [photoUri, setPhotoUri] = useState<string | undefined>(initialUri || userAuth?.photo);
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos da permissão para acessar sua galeria de fotos.',
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (!editable) return;

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);

        // Callback opcional
        if (onPhotoChange) {
          onPhotoChange(uri);
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
      console.error('Erro ao selecionar imagem:', error);
    }
  };

  const removePhoto = async () => {
    Alert.alert('Remover foto', 'Deseja remover sua foto de perfil?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setPhotoUri(undefined);
          if (onPhotoChange) {
            onPhotoChange('');
          }
        },
      },
    ]);
  };

  const hasPhoto = !!photoUri;

  return (
    <Box>
      <TouchableOpacityBox
        onPress={pickImage}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
        }}
        disabled={!editable || loading}>
        {hasPhoto ? (
          <Image
            source={{ uri: photoUri }}
            style={[
              {
                width: '100%',
                height: '100%',
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <Box
            width={moderateScale(size)}
            height={moderateScale(size)}
            backgroundColor="gray100"
            alignItems="center"
            justifyContent="center"
            borderWidth={measure.m1}
            borderColor="borderColor">
            <Text preset="text24" color="gray500">
              {userAuth?.fullname?.charAt(0).toUpperCase() ||
                userAuth?.nickname?.charAt(0).toUpperCase() ||
                'U'}
            </Text>
          </Box>
        )}
      </TouchableOpacityBox>

      {editable && (
        <Box
          position="absolute"
          bottom={measure.b0}
         right={measure.r0}
          width={measure.x32}
          height={measure.y32}
          borderRadius="s16"
          backgroundColor="primary100"
          alignItems="center"
          justifyContent="center"
          borderWidth={measure.m2}
          borderColor="white">
          <Text preset="text18" color="white">
            {hasPhoto ? '✎' : '+'}
          </Text>
        </Box>
      )}

      {hasPhoto && editable && (
        <TouchableOpacityBox
          onPress={removePhoto}
          position="absolute"
          top="t-5"
          right="r-5"
          width={measure.x24}
          height={measure.y24}
          borderRadius="s12"
          backgroundColor="redError"
          alignItems="center"
          justifyContent="center"
          borderWidth={measure.m2}
          borderColor="white">
          <Text preset="text14" color="white" fontWeight="bold">
            ×
          </Text>
        </TouchableOpacityBox>
      )}
    </Box>
  );
}
