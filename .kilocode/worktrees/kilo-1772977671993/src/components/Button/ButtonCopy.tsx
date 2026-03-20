import React from 'react';

import * as Clipboard from 'expo-clipboard';



import { measure } from '@/theme';

import { LocalIcon, LocalIconName } from '../Icon/LocalIcon';
import { TouchableOpacityBox, TouchableOpacityBoxProps } from '../RestyleComponent/RestyleComponent';
import { FontWeightPreset, Text, TextProps } from '../Text/Text';

interface ButtonBackProps extends TouchableOpacityBoxProps {
    textToCopy: string;
    fontWeight?: FontWeightPreset;
    fontSize?: number;
    disabled?: boolean;
    title?: string;
    icon?: LocalIconName;
    iconSize?: number;
    titleStyle?: TextProps
}

export function ButtonCopy({ textToCopy, disabled = false, title, icon, iconSize = measure.m15, titleStyle, ...touchableOpacityBoxProps }: ButtonBackProps) {

    async function copyToClipboard() {
        if (!textToCopy) {
            return;
        }
        try {
            await Clipboard.setStringAsync(textToCopy);
        } catch {
            // Erro tratado silenciosamente
        }
    }

    return (
        <TouchableOpacityBox gap='x4' flexDirection='row' alignItems='center' onPress={copyToClipboard} disabled={disabled} {...touchableOpacityBoxProps}>
            {title && (
                <Text preset='text14' color="primary100" fontWeightPreset='semibold' {...titleStyle}>
                    {title}
                </Text>
            )}
            {
                icon && (
                    <LocalIcon
                        iconName={icon}
                        color='primary100'
                        size={iconSize}
                    />
                )
            }
        </TouchableOpacityBox>

    );
}
