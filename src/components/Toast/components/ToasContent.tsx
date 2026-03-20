import React from 'react';
import { Dimensions } from 'react-native';


import { $shadowProps } from '@theme';

import { Box, BoxBackGroundProps } from '@/components/BoxBackGround/BoxBackGround';
import { LocalIcon, LocalIconProps } from '@/components/Icon/LocalIcon';
import { Text } from '@/components/Text/Text';
import { Toast, ToastType } from '@/services/Toast/ToastType';



const MAX_WIDTH = Dimensions.get('screen').width * 0.9;

interface Props {
    toast: Toast;
    hideToast: () => void;
}
export function ToasContent({ toast, hideToast }: Props) {
    const type: ToastType = toast?.type || 'success';

    return (
        <Box {...$boxStyle} style={$shadowProps} gap='x6'>
            <LocalIcon {...mapTypeToIcon[type]} />
            <Text style={{ flexShrink: 1 }} preset='text16' fontWeightPreset='bold'>
                {toast?.message}
            </Text>
            {toast?.action && (
                <Text
                    preset='text16' fontWeightPreset='bold'
                    onPress={() => {
                        toast?.action?.onPress();
                        hideToast();
                    }}>
                    {toast.action.title}
                </Text>
            )}
        </Box>
    );
}

const mapTypeToIcon: Record<ToastType, LocalIconProps> = {
    success: {
        color: 'greenSuccess',
        iconName: 'checkRound',
    },
    error: {
        color: 'redError',
        iconName: 'errorRound',
    },
};

const $boxStyle: BoxBackGroundProps = {
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 'm12',
    borderRadius: 's16',
    flexDirection: 'row',
    opacity: 0.95,
    maxWidth: MAX_WIDTH,
};