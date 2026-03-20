import { BorderProps, TextProps } from '@shopify/restyle';

import { Theme } from '@/theme';

import { TextButtonPreset } from './TextButton';

export interface TextButtonUI {
  textStyle: TextProps<Theme> & BorderProps<Theme>;
}

export const textButtonPresets: Record<TextButtonPreset, TextButtonUI> = {
  textPrimaryUnderline: {
    textStyle: {
      color: 'primary100',
      textDecorationLine: 'underline',
    },
  },

  primary: {
    textStyle: {
      color: 'primary100',
    },
  },

  textUnderline: {
    textStyle: {
      color: 'colorTextTitle',
      textDecorationLine: 'underline',
    },
  },

  TextWhite: {
    textStyle: {
      color: 'white',
    },
  },
};
