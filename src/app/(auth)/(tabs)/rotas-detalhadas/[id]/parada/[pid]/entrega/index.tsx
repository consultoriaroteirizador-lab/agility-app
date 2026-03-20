import { useEffect } from 'react';

import { useRouter, useLocalSearchParams } from 'expo-router';

import { Box, ActivityIndicator, Text } from '@/components';
import { measure } from '@/theme';

import { EtapaCheckItens } from '../_components/entrega/EtapaCheckItens';
import { EtapaConfirmacao } from '../_components/entrega/EtapaConfirmacao';
import { EtapaInicial } from '../_components/entrega/EtapaInicial';
import { EtapaRecebedor } from '../_components/entrega/EtapaRecebedor';
import { SharedEtapaDados } from '../_components/shared/SharedEtapaDados';
import { SharedEtapaFinalizacao } from '../_components/shared/SharedEtapaFinalizacao';
import { ParadaProvider, useParada } from '../_context/ParadaContext';

/**
 * Orchestrator da entrega - gerencia qual etapa exibir
 */
function EntregaOrchestrator() {
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

    // Tela de sucesso - layout simples como no serviço
    if (showSuccess) {
        return (
            <Box flex={1} backgroundColor="primary100" justifyContent="center" alignItems="center">
                <Box width={measure.x120} height={measure.y12} backgroundColor="white" borderRadius="s10" marginBottom="y10" />
                <Text preset="text18" color="white" textAlign="center">
                    Entrega realizada{'\n'}com sucesso
                </Text>
            </Box>
        );
    }

    // Renderizar etapa atual baseado no estado
    // Etapa 1: "Indo pra lá" / "Estou aqui!"
    if (etapa === 1 && !isServiceStarted) {
        return <EtapaInicial />;
    }

    // Etapa 2: "Entreguei" / "Não delivered"
    if ((etapa === 2 || (isServiceStarted && etapa === 1)) && !delivered) {
        return <EtapaConfirmacao />;
    }

    // Etapa 2.5: Check dos itens (se tiver materiais e não estiverem todos checados)
    if (delivered && needsMaterialCheck) {
        return <EtapaCheckItens />;
    }

    // Etapa 4: Formulário de dados (verificar primeiro)
    if (etapa === 4 && recipient.tipo) {
        return <SharedEtapaDados serviceType="entrega" />;
    }

    // Etapa 3: Seleção de recipient
    if (etapa === 3 || (delivered && !recipient.tipo && !needsMaterialCheck)) {
        return <EtapaRecebedor />;
    }

    // Etapa 5: Checklist final
    if (etapa === 5) {
        return <SharedEtapaFinalizacao serviceType="entrega" />;
    }

    // Fallback para etapa inicial
    return <EtapaInicial />;
}

/**
 * Tela de Entrega com Provider
 */
export default function EntregaScreen() {
    const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
    const rotaId = id as string;
    const serviceId = pid as string;

    return (
        <ParadaProvider serviceId={serviceId} rotaId={rotaId}>
            <EntregaOrchestrator />
        </ParadaProvider>
    );
}
