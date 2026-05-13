import React, { ReactElement, useEffect, useState } from 'react';
import { Animated, Keyboard, Modal, Platform } from 'react-native';

import { Portal } from 'react-native-paper';

import { useAppSafeArea } from '@/hooks';
import { ThemeColors } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';


interface ModalComponentProps {
    children?: ReactElement,
    backgroundColor?: ThemeColors,
}

export default function ModalComponent({ children, backgroundColor = 'white' }: ModalComponentProps) {
    const { bottom } = useAppSafeArea()
    const [translateY] = useState(new Animated.Value(0))

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                Animated.timing(translateY, {
                    toValue: -e.endCoordinates.height,
                    duration: Platform.OS === 'ios' ? e.duration : 200,
                    useNativeDriver: true,
                }).start();
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (e) => {
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: Platform.OS === 'ios' ? e.duration : 200,
                    useNativeDriver: true,
                }).start();
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, [translateY]);

    return (
        <Portal >
            <Modal
                animationType="slide"
                transparent={true}
            >
                <Box flex={1} justifyContent='flex-end' backgroundColor='blackOpaque' >
                    <Animated.View style={{ transform: [{ translateY }] }}>
                        <Box
                            backgroundColor={backgroundColor}
                            borderTopEndRadius='s20'
                            borderTopStartRadius='s20'
                            borderWidth={2}
                            borderTopColor='primary10'
                            borderLeftColor='primary10'
                            borderRightColor='primary10'
                            padding='m4'
                            style={{ paddingBottom: bottom }}
                        >
                            {children}
                        </Box>
                    </Animated.View>
                </Box>
            </Modal>
        </Portal>

    );
}
