// components/CountdownButton/CountdownButton.tsx
import React, { useState, useEffect, ReactNode } from 'react';

import { measure } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';
import { TextButton } from '../Button';
import { LocalIcon } from '../Icon/LocalIcon';
import { Text } from '../Text/Text';

interface CountdownButtonProps {
    /**
     * O número inicial de segundos para o timer.
     * O botão começará desativado e será ativado após este tempo.
     * Padrão: 60 segundos.
     */
    initialSeconds?: number;
    /**
     * A função a ser chamada quando o botão é clicado (após o timer finalizar e o botão ser ativado).
     */
    onAction: () => void;
    /**
     * O texto a ser exibido no botão quando ele está ativo e clicável.
     */
    buttonActiveText: string;
    /**
     * O texto a ser exibido no botão enquanto o timer está ativo (desativado).
     * Se não for fornecido, o `buttonActiveText` será usado.
     */
    buttonCountingText?: string;
    /**
     * Uma mensagem opcional para exibir após a ação ser disparada.
     * Padrão: 'Ação realizada com sucesso'.
     */
    successMessage?: string;
    /**
     * O tempo em milissegundos que a mensagem de sucesso deve ser exibida.
     * Padrão: 3000ms (3 segundos).
     */
    successMessageDisplayTime?: number;
    /**
     * Componente opcional para renderizar dentro do botão.
     * Se fornecido, `buttonActiveText` e `buttonCountingText` serão ignorados.
     */
    children?: ReactNode;
    /**
     * Propriedades adicionais para o componente TextButton.
     * A prop 'disabled' passada aqui será combinada com a lógica interna do timer.
     */
    textButtonProps?: Omit<React.ComponentProps<typeof TextButton>, 'onPress' | 'title' | 'children'>;
}

const DEFAULT_TIMER_SECONDS = 60;
const DEFAULT_SUCCESS_MESSAGE_DISPLAY_TIME = 3000;

export function CountdownButton({
    initialSeconds = DEFAULT_TIMER_SECONDS,
    onAction,
    buttonActiveText,
    buttonCountingText,
    successMessage = 'Ação realizada com sucesso',
    successMessageDisplayTime = DEFAULT_SUCCESS_MESSAGE_DISPLAY_TIME,
    children,
    textButtonProps,
}: CountdownButtonProps) {
    const [timeLeft, setTimeLeft] = useState(initialSeconds);
    const [isTimerRunning, setIsTimerRunning] = useState(true); // O timer começa sempre rodando
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    // O botão está habilitado internamente se o timer não estiver rodando ou se o tempo acabou
    const isButtonInternallyEnabled = !isTimerRunning || timeLeft <= 0;
    // O botão está realmente desabilitado se a lógica interna o desabilita OU se uma prop externa o desabilita
    const isButtonTrulyDisabled = !isButtonInternallyEnabled || textButtonProps?.disabled;

    useEffect(() => {
        // Resetar o timer e iniciar ao montar ou quando initialSeconds muda
        setTimeLeft(initialSeconds);
        setIsTimerRunning(true); // Sempre começa com o timer rodando
    }, [initialSeconds]);

    useEffect(() => {
        if (!isTimerRunning) {
            return; // Se o timer não está rodando, não faz nada
        }

        if (timeLeft <= 0) {
            setIsTimerRunning(false); // Timer terminou, para de rodar
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft, isTimerRunning]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handleActionPress = () => {
        onAction();
        // Após a ação, o timer não é reiniciado automaticamente,
        // a menos que o componente seja remontado ou 'initialSeconds' mude.
        // Se você quiser que ele reinicie o timer após cada clique,
        // adicione setTimeLeft(initialSeconds); setIsTimerRunning(true); aqui.
        // Mas pelo seu pedido de "após o time finalizar", entendo que é uma ativação única.
        setShowSuccessMessage(true);
        setTimeout(() => {
            setShowSuccessMessage(false);
        }, successMessageDisplayTime);
    };

    // Texto do botão: se estiver desabilitado pelo timer, mostra o texto de contagem,
    // caso contrário, mostra o texto ativo.
    const currentButtonText = isButtonTrulyDisabled && isTimerRunning && timeLeft > 0
        ? (buttonCountingText || `${buttonActiveText} (${formatTime(timeLeft)})`) // Adiciona o tempo se buttonCountingText não for fornecido
        : buttonActiveText;

    return (
        <Box justifyContent="center" alignItems="center" gap='y4'>
            <TextButton
                preset="textPrimaryUnderline" // Preset padrão, pode ser sobrescrito via textButtonProps
                title={children ? "" : currentButtonText}
                onPress={handleActionPress}
                disabled={isButtonTrulyDisabled}
                {...textButtonProps}
            >
                {children}
            </TextButton>

            {isTimerRunning && timeLeft > 0 && !children && ( // Mostra o timer apenas se estiver ativo, com tempo restante e sem children
                <Text preset="textParagraphSmall">{formatTime(timeLeft)}</Text>
            )}

            {showSuccessMessage && (
                <Box
                    flexDirection="row"
                    gap="x4"
                    justifyContent="center"
                    alignItems="center"
                    mt="t16"
                >
                    <Text preset="textParagraphSmall" color="greenSuccess">
                        {successMessage}
                    </Text>
                    <LocalIcon iconName="check" color="greenSuccess" size={measure.x16} />
                </Box>
            )}
        </Box>
    );
}
