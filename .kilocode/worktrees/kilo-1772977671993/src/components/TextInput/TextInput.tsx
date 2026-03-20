import { ReactElement } from 'react';

import { useTheme } from '@shopify/restyle';

import { textVariants, TextVariantsPreset, Theme } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';
import {
  TextInputBox,
  TextInputBoxProps,
} from '../RestyleComponent/RestyleComponent';
import { Text } from '../Text/Text';

export interface TextInputProps extends TextInputBoxProps {
  title: string;
  element?: ReactElement;
  textPreset?: TextVariantsPreset;
  placeholder: string;
  messageError?: string;
  isPassword?: boolean;
  widthBox?: number
}

export function TextInput({
  element,
  title,
  widthBox,
  placeholder,
  style,
  messageError,
  value,
  textPreset = 'textParagraph',
  textAlign = 'left',
  isPassword = false,
  ...TextInputBoxProps
}: TextInputProps) {
  const theme = useTheme<Theme>();
  return (
    <Box width={widthBox ?? 'auto'}>
      <Text preset="textTitleCheckBox" mb="b14" ml="l2">
        {title}
      </Text>
      <Box
        width="100%"
        flexDirection="column"
        alignItems="flex-start"
        justifyContent="flex-start"
        // borderBottomWidth={measure.m1}
        borderBottomColor={value ? 'primary100' : 'gray300'}
      >
        <TextInputBox
          pl='l6'
          width={'100%'}
          textAlign={textAlign}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.colorTextInfo}
          value={value}
          paddingVertical='y0'
          style={[
            textVariants[textPreset]
          ]}
          {...TextInputBoxProps}
        />
        {element && element}
        {messageError && (
          <Text mt="t4" preset="textValidateError">
            {messageError}
          </Text>
        )}
      </Box>

    </Box>
  );
}
