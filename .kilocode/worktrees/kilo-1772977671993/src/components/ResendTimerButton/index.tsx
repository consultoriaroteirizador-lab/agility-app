// components/ResendTimerButton/ResendTimerButton.tsx
import React, { useState, useEffect } from 'react';

import { measure } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';
import { TextButton } from '../Button';
import { LocalIcon } from '../Icon/LocalIcon';
import { Text } from '../Text/Text';

interface ResendTimerButtonProps {
    initialSeconds?: number;
    onResendRequest: () => void;
}

const DEFAULT_RESEND_TIMER_SECONDS = 60;

export function ResendTimerButton({
    initialSeconds = DEFAULT_RESEND_TIMER_SECONDS,
    onResendRequest,
}: ResendTimerButtonProps) {
    const [timeLeft, setTimeLeft] = useState(initialSeconds);
    const [isButtonEnabled, setIsButtonEnabled] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    useEffect(() => {
        if (timeLeft === 0) {
            setIsButtonEnabled(true);
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handleResendPress = () => {
        onResendRequest();
        setTimeLeft(initialSeconds);
        setIsButtonEnabled(false);
        setShowSuccessMessage(true);

        setTimeout(() => {
            setShowSuccessMessage(false);
        }, 3000);
    };

    return (
        <Box justifyContent="center" alignItems="center" gap='y4'>
            <TextButton
                preset="textPrimaryUnderline"
                title="Reenviar código"
                onPress={handleResendPress}
                disabled={!isButtonEnabled}
            />
            {!isButtonEnabled && (
                <Text preset="textParagraphSmall">{formatTime(timeLeft)}</Text>
            )}

            {showSuccessMessage && (
                <Box
                    flexDirection="row"
                    gap="x4"
                    justifyContent="center"
                    alignItems="center"
                    mt="t16">
                    <Text preset="textParagraphSmall" color="greenSuccess">
                        Código reenviado com sucesso
                    </Text>
                    <LocalIcon iconName="check" color="greenSuccess" size={measure.x16} />
                </Box>
            )}
        </Box>
    );
}
