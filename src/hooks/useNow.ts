import { useEffect, useState } from 'react'

/**
 * Retorna o instante atual, re-renderizando a cada `intervalMs` (padrão 60s).
 * Usado para recomputar sinais de atraso ao vivo entre refetches — o app marca
 * uma parada como atrasada assim que o relógio passa da ETA, sem depender de um
 * novo dado do backend.
 */
export function useNow(intervalMs = 60_000): Date {
    const [now, setNow] = useState<Date>(() => new Date())

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), intervalMs)
        return () => clearInterval(id)
    }, [intervalMs])

    return now
}
