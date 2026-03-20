import React, { useRef, useState } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';

import { useTheme } from '@shopify/restyle';
import SignatureScreen from 'react-native-signature-canvas';

import { TextVariantsPreset, Theme } from '@/theme';
import { measure } from '@/theme/spacing';

import { ActivityIndicator } from '../ActivityIndicator/ActivityIndicator';
import { Box } from '../BoxBackGround/BoxBackGround';
import { TouchableOpacityBox } from '../RestyleComponent/RestyleComponent';
import { Text } from '../Text/Text';

type SignatureCanvasProps = {
  onClear: () => void;
  onSave: (signatureUri: string) => void;
  onEmpty?: () => void;
  height?: number;
  penColor?: string;
  backgroundColor?: keyof Theme['colors'];
  preset?: TextVariantsPreset;
  padding?: keyof Theme['spacing'];
  borderWidth?: number;
  borderColor?: keyof Theme['colors'];
  borderRadius?: keyof Theme['borderRadii'];
};

export default function SignatureCanvas({
  onClear,
  onSave,
  onEmpty,
  height = 200,
  penColor = 'black',
  backgroundColor = 'white',
  preset = 'textParagraph',
  padding = 'm12',
  borderWidth = 1,
  borderColor,
  borderRadius = 's20',
}: SignatureCanvasProps) {
  const ref = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme<Theme>();

  const handleOK = async (signature: string) => {
    setIsLoading(true);
    try {
      await onSave(signature);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmpty = () => {
    if (onEmpty) {
      onEmpty();
    }
  };

  const handleClear = () => {
    ref.current?.clearSignature();
    onClear();
  };

  const handleConfirm = () => {
    ref.current?.readSignature();
  };

  // Webview style - hide footer but keep canvas interactive
  const style = `
    .m-signature-pad--footer {
      display: none;
    }
    .m-signature-pad {
      border: none;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--canvas {
      touch-action: none;
    }
  `;

  // Get actual color values for the signature canvas
  const backgroundColorValue = theme.colors[backgroundColor];

  return (
    <Box
      backgroundColor={backgroundColor}
      height={height}
      borderWidth={borderWidth}
      borderColor={borderColor}
      borderRadius={borderRadius}
      overflow="hidden"
    >
      {/* Container View para garantir touch events funcionem corretamente */}
      <View style={styles.canvasContainer}>
        <SignatureScreen
          ref={ref}
          onOK={handleOK}
          onEmpty={handleEmpty}
          onClear={handleClear}
          autoClear={false}
          descriptionText=""
          clearText="Limpar"
          confirmText="Confirmar"
          webStyle={style}
          penColor={penColor}
          dataURL=""
          backgroundColor={backgroundColorValue}
        />
      </View>

      {isLoading && (
        <TouchableOpacityBox
          position="absolute"
          top={measure.t0}
          right={measure.r0}
          bottom={measure.b0}
          left={measure.l0}
          backgroundColor="overlayBlack50"
          justifyContent="center"
          alignItems="center"
        >
          <ActivityIndicator />
          <Text
            marginTop="y4"
            color="white"
            preset={preset}
          >
            Salvando assinatura...
          </Text>
        </TouchableOpacityBox>
      )}

      <TouchableOpacityBox
        backgroundColor="grayLight95"
        padding={padding}
        flexDirection="row"
        justifyContent="space-around"
      >
        <TouchableOpacity
          onPress={handleClear}
          disabled={isLoading}
        >
          <Text color="primary100" preset="text14">
            Limpar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={isLoading}
        >
          <Text
            color="primary100"
            preset="text14"
          >
            Confirmar
          </Text>
        </TouchableOpacity>
      </TouchableOpacityBox>
    </Box>
  );
}

const styles = StyleSheet.create({
  canvasContainer: {
    flex: 1,
    width: '100%',
  },
});
