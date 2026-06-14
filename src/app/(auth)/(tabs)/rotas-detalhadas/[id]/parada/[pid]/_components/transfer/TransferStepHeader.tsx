import { Box, Text } from '@/components';

interface TransferStepHeaderProps {
    leg: 'pickup' | 'delivery';
}

/**
 * Faixa indicadora da perna atual do TRANSFER (1 de 2 = coleta, 2 de 2 = entrega).
 */
export function TransferStepHeader({ leg }: TransferStepHeaderProps) {
    const isPickup = leg === 'pickup';
    return (
        <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            gap="x8"
            paddingVertical="y8"
            paddingHorizontal="x12"
            borderRadius="s12"
            backgroundColor={isPickup ? 'secondary10' : 'primary10'}
            marginBottom="y12"
        >
            <Text preset="text12" fontWeightPreset="bold" color={isPickup ? 'secondary100' : 'primary100'}>
                TRANSFERÊNCIA
            </Text>
            <Text preset="text12" color="gray600">
                • Etapa {isPickup ? '1' : '2'} de 2 · {isPickup ? 'Coleta na origem' : 'Entrega no destino'}
            </Text>
        </Box>
    );
}
