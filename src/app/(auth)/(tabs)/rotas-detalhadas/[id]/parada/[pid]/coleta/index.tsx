import { useEffect } from 'react';

import { useRouter, useLocalSearchParams } from 'expo-router';

import { Box, ActivityIndicator, Text } from '@/components';
import { measure } from '@/theme';

import { ColetaEtapaCheckItens, ColetaEtapaConfirmacao, ColetaEtapaInicial, ColetaEtapaResponsavel } from '../_components/coleta';
import { SharedEtapaDados } from '../_components/shared/SharedEtapaDados';
import { SharedEtapaFinalizacao } from '../_components/shared/SharedEtapaFinalizacao';
import { ParadaProvider, useParada } from '../_context/ParadaContext';

/**
 * Orchestrator da coleta - gerencia qual etapa exibir
 */
function ColetaOrchestrator() {
    const router = useRouter();
    const {
        rotaId,
        etapa,
        isServiceStarted,
        delivered,
        recipient,
        showSuccess,
        isLoading,
        materialsState,
        checkCompleted,
        fetchMaterials,
    } = useParada();

    // Buscar materiais quando entrar na etapa de confirmação (para saber se tem materiais)
    useEffect(() => {
        if (isServiceStarted && materialsState.materials.length === 0 && !materialsState.loading) {
            fetchMaterials();
        }
    }, [isServiceStarted, materialsState.materials.length, materialsState.loading, fetchMaterials]);

    // Verificar se tem materiais para check
    const hasMaterials = materialsState.materials.length > 0;
    const needsMaterialCheck = hasMaterials && !materialsState.allChecked && !checkCompleted;

    // Redirecionar após sucesso
    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => {
                router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}`);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [showSuccess, router, rotaId]);

    // Loading
    if (isLoading) {
        return (
            <Box flex={1} justifyContent="center" alignItems="center" backgroundColor="white">
                <ActivityIndicator />
                <Text preset="textParagraph" marginTop="y16">Carregando...</Text>
            </Box>
        );
    }

    // Tela de sucesso - layout com cor laranja para coleta
    if (showSuccess) {
        return (
            <Box flex={1} backgroundColor="primary100" justifyContent="center" alignItems="center">
                <Box width={measure.x120} height={measure.y12} backgroundColor="white" borderRadius="s10" marginBottom="y10" />
                <Text preset="text18" color="white" textAlign="center">
                    Coleta realizada{'\n'}com sucesso
                </Text>
            </Box>
        );
    }

    // Renderizar etapa atual baseado no estado
    // Etapa 1: "Indo pra lá" / "Estou aqui!"
    if (etapa === 1 && !isServiceStarted) {
        return <ColetaEtapaInicial />;
    }

    // Etapa 2: "Coletei" / "Não coletei"
    if ((etapa === 2 || (isServiceStarted && etapa === 1)) && !delivered) {
        return <ColetaEtapaConfirmacao />;
    }

    // Etapa 2.5: Check dos itens (se tiver materiais e não estiverem todos checados)
    if (delivered && needsMaterialCheck) {
        return <ColetaEtapaCheckItens />;
    }

    // Etapa 4: Formulário de dados (verificar primeiro)
    if (etapa === 4 && recipient.tipo) {
        return <SharedEtapaDados serviceType="coleta" />;
    }

    // Etapa 3: Seleção de quem entregou
    if (etapa === 3 || (delivered && !recipient.tipo && !needsMaterialCheck)) {
        return <ColetaEtapaResponsavel />;
    }

    // Etapa 5: Checklist final
    if (etapa === 5) {
        return <SharedEtapaFinalizacao serviceType="coleta" />;
    }

    // Fallback para etapa inicial
    return <ColetaEtapaInicial />;
}

/**
 * Tela de Coleta com Provider
 */
export default function ColetaScreen() {
    const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
    const rotaId = id as string;
    const serviceId = pid as string;

    return (
        <ParadaProvider serviceId={serviceId} rotaId={rotaId}>
            <ColetaOrchestrator />
        </ParadaProvider>
    );
}
