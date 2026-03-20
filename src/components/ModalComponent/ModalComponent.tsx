import React, { ReactElement } from 'react';
import { Modal } from 'react-native';

import { Portal } from 'react-native-paper';

import { useAppSafeArea } from '@/hooks';
import { measure, ThemeColors } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';


interface ModalComponentProps {
    children?: ReactElement,
    backgroundColor?: ThemeColors,
}

export default function ModalComponent({ children, backgroundColor = 'white' }: ModalComponentProps) {
    const { bottom } = useAppSafeArea()

    return (
        <Portal >
            <Modal
                animationType="slide"
                transparent={true}
            >
                <Box flex={1} justifyContent='flex-end' backgroundColor='blackOpaque' >
                    <Box
                        // height={measure.y220}
                        backgroundColor={backgroundColor}
                        borderTopEndRadius='s20'
                        borderTopStartRadius='s20'
                        borderWidth={measure.m2}
                        borderTopColor='primary10'
                        borderLeftColor='primary10'
                        borderRightColor='primary10'
                        padding='m4'
                        style={{ paddingBottom: bottom }}
                    >
                        {children}
                    </Box>
                </Box>
            </Modal>
        </Portal>

    );
}
