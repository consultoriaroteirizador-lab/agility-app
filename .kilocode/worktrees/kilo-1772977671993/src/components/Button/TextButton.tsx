import { measure, ThemeColors } from '@/theme';

import {
  TouchableOpacityBox,
  TouchableOpacityBoxProps,
} from '../RestyleComponent/RestyleComponent';
import { FontWeightPreset, Text } from '../Text/Text';

import { textButtonPresets, TextButtonUI } from './textButtonPreset';

export type TextButtonPreset =
  | 'textPrimaryUnderline'
  | 'primary'
  | 'textUnderline'
  | 'TextWhite';

export interface TextButtonProps extends TouchableOpacityBoxProps {
  title: string;
  preset: TextButtonPreset;
  disabled?: boolean;
  fontWeight?: FontWeightPreset;
  fontSize?: number;
  color?: ThemeColors
}

export function TextButton({
  title,
  color,
  preset,
  disabled = false,
  style,
  fontWeight = 'semibold',
  fontSize = measure.f14,
  ...TouchableOpacityBoxProps
}: TextButtonProps) {

  const fontSizePreset: TextButtonUI = {
    textStyle: {
      fontSize
    },
  }


  const textButtonPreset = textButtonPresets[preset];

  return (
    <TouchableOpacityBox disabled={disabled} {...TouchableOpacityBoxProps}>
      <Text
        fontWeightPreset={fontWeight}
        preset="textLabelTextButton"
        {...textButtonPreset.textStyle}
        {...fontSizePreset.textStyle}
        // style={style}
        color={disabled ? 'gray200' : color ? color : textButtonPreset.textStyle.color}>
        {title}
      </Text>
    </TouchableOpacityBox>
  );
}
