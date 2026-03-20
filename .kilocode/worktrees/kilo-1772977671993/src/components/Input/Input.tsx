import React, { useState } from 'react';
import { TextStyle, DimensionValue } from 'react-native'; // Importar DimensionValue

import { useTheme } from '@shopify/restyle';

import { measure, TextVariantsPreset, Theme } from '@/theme';

import { Box, BoxBackGroundProps } from '../BoxBackGround/BoxBackGround';
import { Icon, IconNameMaterial } from '../Icon/Icon';
import {
  TextInputBox,
  TextInputBoxProps,
  TextInputMaskBox,
  TextInputMaskBoxProps,
} from '../RestyleComponent/RestyleComponent';
import { Text } from '../Text/Text';

export interface InputProps extends Omit<TextInputBoxProps, 'style' | 'height'> {
  placeholder: string;
  iconName?: IconNameMaterial;
  messageError?: string;
  typeMask?: TextInputMaskBoxProps['type'];
  maskOptions?: TextInputMaskBoxProps['options'];
  multiline?: boolean;
  numberOfLines?: number;
  style?: BoxBackGroundProps['style'];
  height?: BoxBackGroundProps['height'];
  title?: string;
  borderType?: 'bottom' | 'all';
  width?: BoxBackGroundProps['width'];
  textPreset?: TextVariantsPreset;
  alignItems?: BoxBackGroundProps['alignItems'];
  justifyContent?: BoxBackGroundProps['justifyContent']
}

export function Input({
  iconName,
  placeholder,
  typeMask,
  maskOptions,
  style,
  messageError,
  multiline = false,
  height = undefined,
  width = measure.x330,
  numberOfLines = 1,
  borderType = 'all',
  title,
  textPreset = 'textParagraph',
  alignItems = multiline ? 'flex-start' : 'flex-end',
  justifyContent = 'flex-start',
  ...TextInputBoxProps
}: InputProps) {
  const theme = useTheme<Theme>();
  const [isFocused, setIsFocused] = useState(false);

  const isWidthAuto = width === 'auto';

  const inputTextStyle: TextStyle = {
    ...theme.textVariants[textPreset],
    color: isFocused ? theme.colors.gray700 : theme.colors.gray700,
  };

  return (
    <Box style={[style]} >
      <Box pl='l4' mb='b10'>
        {title && <Text color='gray600' preset='text14' fontWeightPreset='semibold'>{title}</Text>}
      </Box>
      <Box
        flexDirection="row"
        borderRadius="s8"
        alignItems={alignItems}
        justifyContent={justifyContent}
        paddingLeft="l14"
        paddingRight='r14'
        width={isWidthAuto ? undefined : width}
        borderBottomWidth={borderType === 'bottom' ? measure.y1dot5 : undefined}
        borderWidth={borderType === 'all' ? measure.y1dot5 : undefined}
        borderColor={isFocused ? (messageError ? 'redError' : 'primary100') : 'gray400'}
        height={height}
      >
        {iconName && <Icon
          name={iconName}
          color={isFocused ? 'primary100' : 'gray200'}
          size={measure.m20}
        />}
        {typeMask ? (
          <TextInputMaskBox
            type={typeMask!}
            flex={isWidthAuto ? undefined : 1}
            paddingLeft="l2"
            paddingVertical="y9"
            placeholder={placeholder}
            placeholderTextColor={theme.colors.gray200}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={inputTextStyle}
            options={maskOptions}
            {...TextInputBoxProps}
          />
        ) : (
          <TextInputBox
            flex={isWidthAuto ? undefined : 1}
            paddingLeft="l2"
            paddingVertical="y9"
            placeholder={placeholder}
            placeholderTextColor={theme.colors.gray200}
            style={[
              inputTextStyle,
              !multiline && { height: "100%" as DimensionValue },
            ]}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline={multiline}
            numberOfLines={numberOfLines}
            textAlignVertical={borderType === 'bottom' ? 'bottom' : 'auto'}
            {...TextInputBoxProps}
          />
        )}
      </Box>
      {
        messageError && (
          <Text mt='t6' preset="textValidateError" color="redError" marginLeft="l4">
            {messageError}
          </Text>
        )
      }
    </Box >
  );
}
