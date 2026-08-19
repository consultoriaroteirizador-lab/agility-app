import { Box, Text } from '@/components';
import { measure } from '@/theme';

interface SuccessScreenProps {
    tipoServico?: 'Entrega' | 'Serviço';
}

/**
 * Tela de sucesso exibida após finalizar entrega/serviço
 *
 * Serviço se distingue pela cor de fundo: laranja (`secondary100`), a mesma da
 * etiqueta "Serviço" na lista de rotas. Entrega segue no roxo.
 */
export function SuccessScreen({ tipoServico = 'Entrega' }: SuccessScreenProps) {
    const mensagem = tipoServico === 'Entrega'
        ? 'Entrega realizada\ncom sucesso'
        : 'Serviço realizado\ncom sucesso';

    const fundo = tipoServico === 'Entrega' ? 'primary100' : 'secondary100';

    return (
        <Box
            flex={1}
            backgroundColor={fundo}
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
