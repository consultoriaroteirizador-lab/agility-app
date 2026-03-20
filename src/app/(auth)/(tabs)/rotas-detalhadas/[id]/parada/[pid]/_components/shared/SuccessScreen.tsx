import { Box, Text } from '@/components';
import { measure } from '@/theme';

interface SuccessScreenProps {
    tipoServico?: 'Entrega' | 'Serviço';
}

/**
 * Tela de sucesso exibida após finalizar entrega/serviço
 */
export function SuccessScreen({ tipoServico = 'Entrega' }: SuccessScreenProps) {
    const mensagem = tipoServico === 'Entrega'
        ? 'Entrega realizada\ncom sucesso'
        : 'Serviço realizado\ncom sucesso';

    return (
        <Box
            flex={1}
            backgroundColor="primary100"
            justifyContent="center"
            alignItems="center"
        >
            <Box
                width={measure.x12}
                height={measure.y12}
                backgroundColor="tertiary100"
                borderRadius="s6"
                marginBottom="y40"
            />
            <Text preset="text18" color="white" textAlign="center">
                {mensagem}
            </Text>
        </Box>
    );
}
