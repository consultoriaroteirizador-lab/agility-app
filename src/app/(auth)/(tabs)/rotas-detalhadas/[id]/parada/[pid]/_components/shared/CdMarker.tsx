import { Box, Text } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { measure } from '@/theme';

interface CdMarkerProps {
    /** Cor do CD (verde origem / vermelho destino), string dinâmica. */
    color: string;
    /** Rótulo no badge: 'O' (origem), 'D' (destino), etc. */
    label?: string | number;
    /** Tamanho do marcador em px (default 34). */
    size?: number;
}

/**
 * Marcador de CD (Centro de Distribuição) — "casinha" com ícone de depósito,
 * usado na variante `cd` do mapa para diferenciar pontos de cross-docking
 * dos pinos teardrop de parada (`StopMarker`).
 */
export function CdMarker({ color, label, size = 34 }: CdMarkerProps) {
    return (
        <Box alignItems="center">
            <Box
                width={size}
                height={size}
                borderRadius="s20"
                borderWidth={2}
                borderColor="white"
                justifyContent="center"
                alignItems="center"
                style={{ backgroundColor: color }}
            >
                <Icon name="warehouse" size={measure.m18} color="white" />
            </Box>
            {label != null && String(label).trim() !== '' ? (
                <Box marginTop="y2" paddingHorizontal="x6" borderRadius="s8" style={{ backgroundColor: color }}>
                    <Text preset="text12" color="white" fontWeightPreset="bold">{String(label)}</Text>
                </Box>
            ) : null}
        </Box>
    );
}
