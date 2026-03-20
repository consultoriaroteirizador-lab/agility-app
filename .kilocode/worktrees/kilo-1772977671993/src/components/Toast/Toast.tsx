import React, { useCallback, useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToastPosition } from '@/services/Toast/ToastType';
import { useToast, useToastService } from '@/services/Toast/useToast';

import { ToasContent } from './components/ToasContent';

const DEFAULT_DURATION = 4000;

export function Toast() {
    const toast = useToast();
    const position: ToastPosition = toast?.position || 'bottom';
    const { hideToast } = useToastService();
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const getPositionStyle = (position: ToastPosition) => {
        switch (position) {
            case 'top':
                return { top: insets.top + 30 };
            case 'bottom':
                return { bottom: insets.bottom + 20 };
            case 'center':
                return {
                    top: '50%' as const,
                    marginTop: -25
                };
            default:
                return { bottom: insets.bottom + 20 };
        }
    };

    const runEnteringAnimation = useCallback(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const runExitingAnimation = useCallback(
        (callback: Animated.EndCallback) => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            }).start(callback);
        },
        [fadeAnim],
    );

    useEffect(() => {
        if (toast) {
            runEnteringAnimation();
            setTimeout(() => {
                runExitingAnimation(hideToast);
            }, toast.duration || DEFAULT_DURATION);
        }
    }, [hideToast, runEnteringAnimation, runExitingAnimation, toast]);

    if (!toast) {
        return null;
    }

    return (
        <Animated.View
            testID={'toast-message'}
            style={[
                getPositionStyle(position),
                {
                    position: 'absolute',
                    alignSelf: 'center',
                    opacity: fadeAnim,
                },
            ]}>
            <ToasContent toast={toast} hideToast={hideToast} />
        </Animated.View>
    );
}
