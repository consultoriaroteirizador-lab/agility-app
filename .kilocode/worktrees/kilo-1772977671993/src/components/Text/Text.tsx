import React from 'react';
import { StyleProp, TextStyle } from 'react-native';

import { createText } from '@shopify/restyle';

import { TextVariantsPreset, Theme } from '@/theme';

const SRText = createText<Theme>();
type SRTextProps = React.ComponentProps<typeof SRText>;

export type FontWeightPreset = 'light' | 'regular' | 'semibold' | 'bold'

export interface TextProps extends SRTextProps {
  preset?: TextVariantsPreset;
  fontWeightPreset?: FontWeightPreset;
  fontSize?: number
}

export function Text({
  children,
  preset = 'textParagraph',
  style,
  fontWeightPreset,
  fontSize,
  ...sRTextProps
}: TextProps) {

  const FontWeight = {
    light: 'Ubuntu_300Light',
    regular: 'Ubuntu_400Regular',
    semibold: 'Ubuntu_500Medium',
    bold: 'Ubuntu_700Bold',
  }

  const fontStyleWeight: TextStyle | undefined = fontWeightPreset ? { fontFamily: FontWeight[fontWeightPreset] } : undefined;
  const fontStyleSize: TextStyle | undefined = fontSize ? { fontSize } : undefined;

  const combinedStyles: StyleProp<TextStyle>[] = [
    style,
    fontStyleWeight,
    fontStyleSize,
  ].filter(Boolean) as StyleProp<TextStyle>[];

  return (
    <SRText
      variant={preset}
      {...sRTextProps}
      style={combinedStyles}
    >
      {children}
    </SRText>
  );
}
