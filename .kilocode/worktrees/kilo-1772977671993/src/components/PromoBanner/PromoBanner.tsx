import { useState } from 'react';
import { Modal, Dimensions } from 'react-native';

import { goWebViewExternalProductScreen } from '@/routes';
import { $shadowPropsButton, measure } from '@/theme';

import { TouchableOpacityBox } from '..';
import { Box } from '../BoxBackGround/BoxBackGround';
import { Icon } from '../Icon/Icon';
import { Image } from '../Image/Image';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface PromoBannerProps {
  imageUrl: string;
  linkUrl: string;
  linkTitle?: string;
  visible?: boolean;
  onClose?: () => void;
}

export function PromoBanner({
  imageUrl,
  linkUrl,
  linkTitle = 'Oferta',
  visible: externalVisible,
  onClose: externalOnClose,
}: PromoBannerProps) {
  const [internalVisible, setInternalVisible] = useState(true);

  const isVisible = externalVisible !== undefined ? externalVisible : internalVisible;

  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalVisible(false);
    }
  };

  const handleBannerPress = () => {
    handleClose();
    goWebViewExternalProductScreen(linkUrl, linkTitle);
  };

  if (!isVisible) {
    return null;
  }



  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Box 
      flex={1}
      backgroundColor='blackOpaque'
      justifyContent='center'
      alignItems='center'
      >
        <Box 
        width={screenWidth * 0.9}
        maxHeight={screenHeight * 0.7}
        position='relative'
        >
          <TouchableOpacityBox
            position='absolute'
            top={-15}
            left={-5}
            zIndex={10}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 100, right: 10 }}
          >
            <Box
              backgroundColor="white"
              borderRadius="s20"
              width={measure.x32}
              height={measure.y32}
              alignItems="center"
              justifyContent="center"
              style={$shadowPropsButton}
            >
              <Icon name="close" size={measure.m26} />
            </Box>
          </TouchableOpacityBox>

          <TouchableOpacityBox
            activeOpacity={0.9}
            onPress={handleBannerPress}
            width={"100%"}
            mt='t10'
          >
            <Image
              source={{ uri: imageUrl }}
              resizeMode="contain"
              width={'100%'}
              height={screenHeight * 0.65}
            />
          </TouchableOpacityBox>
        </Box>
      </Box>
    </Modal>
  );
}
