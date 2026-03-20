import { ViewStyle } from 'react-native';

import { createTheme } from '@shopify/restyle';

import { borderRadii } from './borderRadii';
import { colors } from './colors';
import { measure } from './spacing';
import { textVariants } from './textVariants';

export const theme = createTheme({
  colors,
  spacing: measure,
  borderRadii,
  borderWidths: {
    m0: measure.m0,
    m1: measure.m1,
    m1Dot5: measure.m1Dot5,
    m2: measure.m2,
    m3: measure.m3,
    m4: measure.m4,
    m5: measure.m5,
    m6: measure.m6,
  },
  textVariants: {
    ...textVariants,
    defaults: {
      color: 'colorTextPrimary',
      fontSize: measure.f16,
      fontFamily: 'Ubuntu_400Regular'
    },
  }
});

export type Theme = typeof theme;
export type ThemeColors = keyof Theme['colors'];
export type ThemeSpace = keyof Theme['spacing'];



export const $shadowProps: ViewStyle = {
  elevation: measure.m6,
  shadowColor: '#000',
  shadowOpacity: measure.m005,
  shadowOffset: { width: 0, height: measure.y3Negative },
  shadowRadius: measure.m4,
};

export const $shadowPropsButton: ViewStyle = {
  elevation: measure.m2,
  shadowColor: '#fff',
  shadowOpacity: measure.m005,
  shadowOffset: { width: 0, height: measure.y3Negative },
  shadowRadius: measure.m4,
};
