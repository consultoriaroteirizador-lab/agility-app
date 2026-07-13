import { Box, Text } from '@/components';

import type { Parada } from '../_types/rota.types';

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
}: {
    paradas: Parada[];
    outcomes?: Record<string, TransferOrderOutcome>;
    onMarkNotReceived?: (serviceId: string) => void;
    onMarkReceived?: (serviceId: string) => void;
}) {
    return (
        <Box gap="y8">
            <Text preset="text14" fontWeightPreset="bold" color="gray600">
                Lote da carga ({paradas.length} pedido{paradas.length === 1 ? '' : 's'})
            </Text>
            {paradas.length === 0 ? (
                <Text preset="text13" color="gray600">Nenhum pedido no lote deste trecho.</Text>
            ) : null}
            {paradas.map((parada) => (
                <TransferOrderCard
                    key={parada.serviceId}
                    parada={parada}
                    outcome={outcomes?.[parada.serviceId]}
                    onMarkNotReceived={onMarkNotReceived ? () => onMarkNotReceived(parada.serviceId) : undefined}
                    onMarkReceived={onMarkReceived ? () => onMarkReceived(parada.serviceId) : undefined}
                />
            ))}
        </Box>
    );
}
