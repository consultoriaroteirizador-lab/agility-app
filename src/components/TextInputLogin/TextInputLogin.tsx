import React, { useState } from 'react';

import { useTheme } from '@shopify/restyle';

import { Theme, measure } from '@/theme';

import { Box, BoxBackGroundProps } from '../BoxBackGround/BoxBackGround';
import { IconButton } from '../Button/IconButton';
import { LocalIcon, LocalIconProps } from '../Icon/LocalIcon';
import {
  TextInputBox,
  TextInputBoxProps,
  TextInputMaskBox,
  TextInputMaskBoxProps,
} from '../RestyleComponent/RestyleComponent';
import { Text } from '../Text/Text';

export interface TextInputLoginProps extends Omit<TextInputBoxProps, 'style'> {
  placeholder: string;
  iconName: LocalIconProps['iconName'];
  messageError?: string;
  isPassword?: boolean;
  typeMask?: TextInputMaskBoxProps['type'];
  style?: BoxBackGroundProps['style'];
  title?: string
}

export function TextInputLogin({
  iconName,
  placeholder,
  typeMask,
  style,
  messageError,
  isPassword = false,
  title,
  ...TextInputBoxProps
}: TextInputLoginProps) {
  const theme = useTheme<Theme>();
  const [isFocused, setIsFocused] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  return (
    <Box style={style} alignItems='center'>
      {title && <Text mb='b6' preset='text15' fontWeightPreset='semibold' alignSelf='flex-start'>{title}</Text>}
      <Box
        backgroundColor={'white'}
        flexDirection="row"
        borderRadius="s8"
        alignItems="center"
        paddingLeft="l14"
        paddingRight='r14'
        width={measure.x330}
        borderWidth={measure.m1}
        borderColor={isFocused ? (messageError ? 'redError' : 'primary100') : 'gray400'}
        height={measure.y50}
      >
        <LocalIcon
          iconName={iconName}
          color={isFocused ? 'primary100' : 'gray200'}
          size={measure.m20}
        />
        {typeMask ? (
          <TextInputMaskBox
            type={typeMask!}
            flex={1}
            paddingLeft="l12"
            placeholder={placeholder}
            placeholderTextColor={theme.colors.gray200}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{ ...theme.textVariants.textParagraph14, color: theme.colors.black }}
            {...TextInputBoxProps}
          />
        ) : (
          <TextInputBox
            flex={1}
            paddingLeft="l12"
            placeholder={placeholder}
            placeholderTextColor={theme.colors.gray200}
            style={{ ...theme.textVariants.textParagraph14, color: theme.colors.black }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            secureTextEntry={isPassword ? secureTextEntry : false}
            {...TextInputBoxProps}
          />
        )}
        {isPassword &&
          <IconButton
            onPress={() => setSecureTextEntry(!secureTextEntry)}
            iconName={secureTextEntry ? 'visibility' : 'visibility-off'}
            color={isFocused ? 'primary100' : 'gray200'}
            size={measure.m24}
          />
        }
      </Box>
      {
        messageError && (
          <Box pt='t2' paddingHorizontal='x18' alignItems='center' width={measure.x330}>
            <Text textAlign='left' preset="textValidateError" color="redError" marginLeft="l4">
              {messageError}
            </Text>
          </Box>

        )
      }
    </Box >
  );
}
