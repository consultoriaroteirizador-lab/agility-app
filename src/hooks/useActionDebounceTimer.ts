// hooks/useActionDebounceTimer.ts (ou onde você guarda seus hooks)
import { useState, useEffect, useCallback } from 'react';

interface UseActionDebounceTimerProps {
    /**
     * O número de segundos para o timer de debounce.
     * Padrão: 30 segundos.
     */
    debounceSeconds?: number;
}

export function useActionDebounceTimer({ debounceSeconds = 30 }: UseActionDebounceTimerProps = {}) {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isDebouncing, setIsDebouncing] = useState(false);

    useEffect(() => {
        if (!isDebouncing || timeLeft <= 0) {
            if (timeLeft <= 0) {
                setIsDebouncing(false); // Garante que isDebouncing seja false quando o tempo acaba
            }
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [isDebouncing, timeLeft]);

    const startDebounce = useCallback(() => {
        setIsDebouncing(true);
        setTimeLeft(debounceSeconds);
    }, [debounceSeconds]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return {
        isDebouncing,
        timeLeft,
        startDebounce,
        formattedTime: formatTime(timeLeft),
    };
}
