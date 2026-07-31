import { Box, Text } from '@/components';

import type { Parada, ParadaStatus } from '../_types/rota.types';

import { TransferOrderCard, type TransferOrderOutcome } from './TransferOrderCard';

/**
 * Lista do lote de carga da transferência (pedidos), compartilhada pela Tela 1
 * (overview) e pela Tela 2 (comprovante). Cada pedido é um card expansível que
 * mostra os itens ao tocar (ver TransferOrderCard).
 *
 * Conferência (`outcomes`/`onMarkNotReceived`/`onMarkReceived`) é OPCIONAL: quando
 * ausente (Tela 1) os cards ficam read-only, sem mudança de comportamento.
 */
export function TransferOrderList({
    paradas,
    outcomes,
    onMarkNotReceived,
    onMarkReceived,
    titulo,
    onOpen,
    openLabel,
    tituloDeCard,
    subtituloDeCard,
    notaFiscalDeCard,
    statusDeCard,
}: {
    paradas: Parada[];
    outcomes?: Record<string, TransferOrderOutcome>;
    onMarkNotReceived?: (serviceId: string) => void;
    onMarkReceived?: (serviceId: string) => void;
    /** Cabeçalho da lista. Default: "Lote da carga (N pedidos)". */
    titulo?: string;
    onOpen?: (serviceId: string) => void;
    openLabel?: string;
    tituloDeCard?: (parada: Parada, index: number) => string;
    subtituloDeCard?: (parada: Parada, index: number) => string | undefined;
    /** Nota fiscal de cada card — o número que o motorista casa com o papel. */
    notaFiscalDeCard?: (parada: Parada, index: number) => string | null;
    /** Status de cada card, para o selo colorido. */
    statusDeCard?: (parada: Parada, index: number) => ParadaStatus;
}) {
    return (
        <Box gap="y8">
            <Text preset="text14" fontWeightPreset="bold" color="gray600">
                {titulo ?? `Lote da carga (${paradas.length} pedido${paradas.length === 1 ? '' : 's'})`}
            </Text>
            {paradas.length === 0 ? (
                <Text preset="text13" color="gray600">Nenhum pedido no lote deste trecho.</Text>
            ) : null}
            {paradas.map((parada, index) => (
                <TransferOrderCard
                    key={parada.serviceId}
                    parada={parada}
                    outcome={outcomes?.[parada.serviceId]}
                    titulo={tituloDeCard?.(parada, index)}
                    subtitulo={subtituloDeCard?.(parada, index)}
                    notaFiscal={notaFiscalDeCard?.(parada, index)}
                    status={statusDeCard?.(parada, index)}
                    onOpen={onOpen ? () => onOpen(parada.serviceId) : undefined}
                    openLabel={openLabel}
                    onMarkNotReceived={onMarkNotReceived ? () => onMarkNotReceived(parada.serviceId) : undefined}
                    onMarkReceived={onMarkReceived ? () => onMarkReceived(parada.serviceId) : undefined}
                />
            ))}
        </Box>
    );
}
