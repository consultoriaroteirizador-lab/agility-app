import React, { useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';

import SignatureScreen from 'react-native-signature-canvas';

import { Theme } from '@/theme';

import { ActivityIndicator } from '../ActivityIndicator/ActivityIndicator';
import { TouchableOpacityBox } from '../RestyleComponent/RestyleComponent';
import { Text } from '../Text/Text';


type SignatureCanvasProps = {
  onClear: () => void;
  onSave: (signatureUri: string) => void;
  onEmpty?: () => void;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
  preset?: keyof Theme['textVariants'];
  padding?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: string;
};

interface SignatureCanvasPropsWithBox extends SignatureCanvasProps {
  title?: string;
}

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
  ...boxRest
}: SignatureCanvasPropsWithBox) {
  const ref = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  // Webview style to hide footer and controls
  const style = `.m-signature-pad--footer {display: none; margin: 0px;}`;

  return (
    <TouchableOpacityBox
      backgroundColor={backgroundColor}
      height={height}
      borderWidth={borderWidth}
      borderColor={borderColor}
      borderRadius={borderRadius}
      overflow="hidden"
    >
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
        backgroundColor={backgroundColor}
      />

      {isLoading && (
        <TouchableOpacityBox
          position="absolute"
          top={measure.t0}
         right={measure.r0}
          bottom={measure.b0}
          left={measure.l0}
          backgroundColor="rgba(0, 0, 0, 0.5)"
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
        backgroundColor="rgba(245, 245, 245, 0.95)"
        padding={padding}
        flexDirection="row"
        justifyContent="space-around"
      >
        <TouchableOpacity
          onPress={handleClear}
          disabled={isLoading}
        >
          <Text color="white" preset="text14">
            Limpar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => ref.current?.readSignature()}
          disabled={isLoading}
        >
          <Text
            color="white"
            preset="text14"
          >
            Confirmar
          </Text>
        </TouchableOpacity>
      </TouchableOpacityBox>
    </TouchableOpacityBox>
  );
}
