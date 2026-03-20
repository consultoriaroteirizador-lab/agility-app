import React from 'react';
import { FlatList, Dimensions, Image as RNImage } from 'react-native';

import {
  createRestyleComponent,
} from '@shopify/restyle';
import * as ImagePicker from 'expo-image-picker';

import { UploadProgress } from '@/domain/agility/service/serviceUploadUtils';
import { Theme, borderRadii, measure } from '@/theme';

import { Icon } from '../Icon/Icon';
import { TouchableOpacityBox, Box } from '../RestyleComponent/RestyleComponent';
import { Text } from '../Text/Text';


type MultiPhotoPickerProps = {
  photos: ImagePicker.ImagePickerAsset[];
  onPhotosChange: (photos: ImagePicker.ImagePickerAsset[]) => void;
  maxPhotos?: number;
  uploadProgress?: Map<number, UploadProgress>;
  label?: string;
  allowCamera?: boolean;
  labelPreset?: keyof Theme['textVariants'];
};

type ComposeProps = {
  backgroundColor?: string;
  padding?: string;
} & MultiPhotoPickerProps;

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_WIDTH - 64) / 3;

const PhotoItem = createRestyleComponent<{ width: number; height: number; position: 'relative' | undefined }, Theme>(
  ['width', 'height', 'position'],
  ({ children }) => children,
);

const PhotoOverlay = createRestyleComponent<{ position: 'absolute' }, Theme>(
  ['position'],
  ({ children }) => children,
);

const AddButtonBox = createRestyleComponent<{ backgroundColor: string; borderColor: string }, Theme>(
  ['backgroundColor', 'borderWidth'],
  ({ children }) => children,
);

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
  ...props
}: MultiPhotoPickerProps) {

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
      <PhotoItem
        width={PHOTO_SIZE}
        height={PHOTO_SIZE}
        position="relative"
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
          <PhotoOverlay position="absolute">
            <TouchableOpacityBox
              position="absolute"
              top="t4"
              right="r4"
              borderRadius="s12"
              width={measure.x24}
              height={measure.y24}
              justifyContent="center"
              alignItems="center"
              backgroundColor="redError"
              onPress={() => removePhoto(index)}
            >
              <Icon name="x" size={16} color="white" />
            </TouchableOpacityBox>
          </PhotoOverlay>
        )}

        {progress && (
          <PhotoOverlay position="absolute">
            <Box
              position="absolute"
              top={measure.t0}
              left={measure.l0}
             right={measure.r0}
              bottom={measure.b0}
              borderRadius="s8"
              justifyContent="center"
              alignItems="center"
              backgroundColor="rgba(0,0,0,0.7)"
            >
              <Text color="white" fontWeightPreset="bold" preset="text14">
                {progress.percentage}%
              </Text>
            </Box>
          </PhotoOverlay>
        )}
      </PhotoItem>
    );
  };

  const renderAddButton = () => {
    if (photos.length >= maxPhotos) return null;

    return (
      <AddButtonBox
        backgroundColor="gray50"
        borderWidth={measure.m2}
        borderColor="gray200"
        width={PHOTO_SIZE}
        height={PHOTO_SIZE}
        onPress={pickPhotos}
      >
        <Icon name="plus" size={32} color="gray700" />
      </AddButtonBox>
    );
  };

  const renderCameraButton = () => {
    if (!allowCamera || photos.length >= maxPhotos) return null;

    return (
      <AddButtonBox
        backgroundColor="gray50"
        borderWidth={measure.m2}
        borderColor="gray200"
        width={PHOTO_SIZE}
        height={PHOTO_SIZE}
        onPress={takePhoto}
      >
        <Icon name="camera" size={32} color="gray700" />
      </AddButtonBox>
    );
  };

  const Container = createRestyleComponent<ComposeProps, Theme>(
    ['backgroundColor', 'padding'],
    ({ children }) => children,
  );

  return (
    <Container
      backgroundColor={backgroundColor}
      padding={padding}
      {...props}
    >
      <Text
        preset={labelPreset}
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
          <Container
            backgroundColor="transparent"
            padding={undefined}
            style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}
          >
            {renderAddButton()}
            {renderCameraButton()}
          </Container>
        }
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      />
    </Container>
  );
}
