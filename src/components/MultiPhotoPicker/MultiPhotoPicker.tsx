import React from 'react';
import { FlatList, Dimensions, Image as RNImage, TouchableOpacity, View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { UploadProgress } from '@/domain/agility/service/serviceUploadUtils';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Theme, measure } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';
import { Icon } from '../Icon/Icon';
import { Text } from '../Text/Text';


export type MultiPhotoPickerProps = {
  photos: ImagePicker.ImagePickerAsset[];
  onPhotosChange: (photos: ImagePicker.ImagePickerAsset[]) => void;
  maxPhotos?: number;
  uploadProgress?: Map<number, UploadProgress>;
  label?: string;
  allowCamera?: boolean;
  labelPreset?: keyof Theme['textVariants'];
  padding?: string;
  backgroundColor?: string;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_WIDTH - 64) / 3;

export default function MultiPhotoPicker({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  uploadProgress,
  label = 'Fotos',
  allowCamera = true,
  labelPreset = 'textParagraph',
  padding = 'm12',
  backgroundColor = 'transparent',
}: MultiPhotoPickerProps) {
  const { colors, borderRadii } = useAppTheme();

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Precisamos de permissão para acessar suas fotos');
      return false;
    }
    return true;
  };

  const pickPhotos = async () => {

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxPhotos - photos.length,
      quality: 0.8,
      orderedSelection: true,
    });

    if (!result.canceled && result.assets) {
      onPhotosChange([...photos, ...result.assets]);
    }
  };

  const takePhoto = async () => {
    if (!allowCamera) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Precisamos de permissão para acessar sua câmera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      onPhotosChange([...photos, result.assets[0]]);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onPhotosChange(newPhotos);
  };

  const renderPhoto = ({
    item,
    index
  }: {
    item: ImagePicker.ImagePickerAsset;
    index: number;
  }) => {
    const progress = uploadProgress?.get(index);

    return (
      <View
        style={{
          width: PHOTO_SIZE,
          height: PHOTO_SIZE,
          position: 'relative',
        }}
      >
        <RNImage
          source={{ uri: item.uri }}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: borderRadii.s8,
          }}
        />

        {!progress && (
          <View
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
            }}
          >
            <TouchableOpacity
              style={{
                width: measure.x24,
                height: measure.y24,
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.redError,
              }}
              onPress={() => removePhoto(index)}
            >
              <Icon name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {progress && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: borderRadii.s8,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colors.overlayBlack70,
            }}
          >
            <Text color="white" fontWeightPreset="bold" preset="text14">
              {progress.percentage}%
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAddButton = () => {
    if (photos.length >= maxPhotos) return null;

    return (
      <TouchableOpacity
        onPress={pickPhotos}
        style={{
          width: PHOTO_SIZE,
          height: PHOTO_SIZE,
          backgroundColor: colors.gray50,
          borderWidth: measure.m2,
          borderColor: colors.gray200,
          borderRadius: borderRadii.s8,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Icon name="add" size={32} color="gray700" />
      </TouchableOpacity>
    );
  };

  const renderCameraButton = () => {
    if (!allowCamera || photos.length >= maxPhotos) return null;

    return (
      <TouchableOpacity
        onPress={takePhoto}
        style={{
          width: PHOTO_SIZE,
          height: PHOTO_SIZE,
          backgroundColor: colors.gray50,
          borderWidth: measure.m2,
          borderColor: colors.gray200,
          borderRadius: borderRadii.s8,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Icon name="photo-camera" size={32} color="gray700" />
      </TouchableOpacity>
    );
  };

  return (
    <Box
      backgroundColor={backgroundColor as never}
      padding={padding as never}
    >
      <Text
        preset={labelPreset as never}
        marginBottom="y4"
        color="colorTextPrimary"
        fontWeightPreset="bold"
      >
        {label} ({photos.length}/{maxPhotos})
      </Text>

      <FlatList
        horizontal
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
            {renderAddButton()}
            {renderCameraButton()}
          </View>
        }
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      />
    </Box>
  );
}
