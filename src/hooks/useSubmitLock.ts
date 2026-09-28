import { useCallback, useRef, useState } from 'react';

/**
 * Trava de envio para gesto de dinheiro. O ref trava no MESMO tick (o `isPending` da
 * mutation só vira true depois de a request sair). O estado existe para desabilitar o
 * botão e esconder o modal enquanto houver envio em voo.
 *
 * Com a trava fechada, `run` devolve `undefined` sem chamar `fn`. O erro de `fn` é
 * relançado, e a trava abre no `finally`, com sucesso ou erro.
 */
export function useSubmitLock() {
    const lockRef = useRef(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
        if (lockRef.current) return undefined;
        lockRef.current = true;
        setIsSubmitting(true);
        try {
            return await fn();
        } finally {
            lockRef.current = false;
            setIsSubmitting(false);
        }
    }, []);

    const isLocked = useCallback(() => lockRef.current, []);

    return { run, isSubmitting, isLocked };
}
