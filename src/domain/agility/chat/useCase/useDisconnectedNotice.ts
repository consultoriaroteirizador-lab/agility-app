import { useEffect, useState } from 'react';

export const DISCONNECTED_NOTICE_DELAY_MS = 3_000;

/**
 * `true` quando o socket está fora há pelo menos `delayMs`. O atraso evita que o
 * aviso pisque na conexão inicial, que leva um instante.
 */
export function useDisconnectedNotice(isConnected: boolean, delayMs: number = DISCONNECTED_NOTICE_DELAY_MS): boolean {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isConnected) {
            setVisible(false);
            return;
        }
        const timer = setTimeout(() => setVisible(true), delayMs);
        return () => clearTimeout(timer);
    }, [isConnected, delayMs]);

    return visible;
}
