import { useEffect } from 'react';

import { Redirect, useLocalSearchParams } from 'expo-router';

import { Box, ActivityIndicator } from '@/components';

/**
 * Tela legada — redirecionada para o fluxo novo em [pid]/service.
 *
 * O fluxo antigo não tratava requiresPayment / cobrança na entrega e ficou desincronizado
 * com o `SharedEtapaFinalizacao`. Mantemos o redirect para preservar links existentes
 * (handleServiceCompleted ainda aponta para essa rota em alguns lugares).
 */
export default function DadosServicoRedirect() {
    const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();

    useEffect(() => {
        console.warn('[dados-servico] Rota legada acessada — redirecionando para /service');
    }, []);

    if (!id || !pid) {
        return (
            <Box flex={1} justifyContent="center" alignItems="center">
                <ActivityIndicator size="large" />
            </Box>
        );
    }

    return <Redirect href={{ pathname: '/rotas-detalhadas/[id]/parada/[pid]/service', params: { id, pid } }} />;
}
