import { useEffect } from 'react';

import { useLocalSearchParams } from 'expo-router';

import { Box, ActivityIndicator, Text } from '@/components';
import { measure } from '@/theme';

import { ServiceEtapaInicial, ServiceEtapaConfirmacao, ServiceEtapaCheckEquipamento } from '../_components/service';
import { EtapaConcluida } from '../_components/shared/EtapaConcluida';
import { SharedEtapaDados } from '../_components/shared/SharedEtapaDados';
import { SharedEtapaFinalizacao } from '../_components/shared/SharedEtapaFinalizacao';
import { SharedEtapaFormulario } from '../_components/shared/SharedEtapaFormulario';
import { SharedEtapaRecebedor } from '../_components/shared/SharedEtapaRecebedor';
import { ParadaProvider, useParada } from '../_context/ParadaContext';
import { useDestinoAposNota } from '../_hooks/useDestinoAposNota';

/**
 * Orchestrator do service - gerencia qual etapa exibir
 */
function ServiceOrchestrator() {
    const {
        rotaId,
        serviceId,
        service,
        etapa,
        isServiceStarted,
        delivered,
        recipient,
        showSuccess,
        isLoading,
        materialsState,
        checkCompleted,
        fetchMaterials,
        hasFormGroups,
        formCompleted,
        pedidosDaParada,
    } = useParada();

    // Task 5: para onde ir depois de fechar ESTA nota — índice da parada (se a
    // porta ainda tem outra nota por trabalhar) ou lista de paradas da rota
    // (se era a última, comportamento de hoje). Ver `useDestinoAposNota`.
    const navegarAposFecharNota = useDestinoAposNota(pedidosDaParada, serviceId, rotaId);

    // Serviço já finalizado → tela read-only (não reabre o fluxo de execução).
    const isServiceFinalized =
        service?.isCompleted === true || service?.isCanceled === true || service?.isFailed === true;

    const hasMaterials = materialsState.materials.length > 0;
    const needsMaterialCheck = hasMaterials && !materialsState.allChecked && !checkCompleted;

    // Buscar materiais quando o servico estiver iniciado
    useEffect(() => {
        if (!isLoading && materialsState.materials.length === 0 && !materialsState.loading) {
            fetchMaterials();
        }
    }, [isLoading, materialsState.materials.length, materialsState.loading, fetchMaterials]);

    // Redirecionar após sucesso — Task 5: índice da parada (outra nota por
    // trabalhar) ou lista de paradas da rota (era a última).
    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => {
                navegarAposFecharNota();
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [showSuccess, navegarAposFecharNota]);

    // Loading
    if (isLoading) {
        return (
            <Box flex={1} justifyContent="center" alignItems="center" backgroundColor="white">
                <ActivityIndicator />
                <Text preset="textParagraph" marginTop="y16">Carregando...</Text>
            </Box>
        );
    }

    // Tela de sucesso - layout com cor para service
    if (showSuccess) {
        return (
            <Box flex={1} backgroundColor="primary100" justifyContent="center" alignItems="center">
                <Box width={measure.x120} height={measure.y12} backgroundColor="white" borderRadius="s10" marginBottom="y10" />
                <Text preset="text18" color="white" textAlign="center">
                    Serviço realizado{'\n'}com sucesso
                </Text>
            </Box>
        );
    }

    // Serviço já finalizado (concluído/insucesso): tela somente leitura.
    if (isServiceFinalized) {
        return <EtapaConcluida />;
    }

    // Renderizar etapa atual baseado no estado

    // Pre-step: Check de equipamentos (antes de "Indo pra lá")
    if (!isServiceStarted && needsMaterialCheck) {
        return <ServiceEtapaCheckEquipamento />;
    }

    // Etapa 1: "Indo pra lá" / "Estou aqui!"
    if (etapa === 1 && !isServiceStarted) {
        return <ServiceEtapaInicial />;
    }

    // Etapa 2: "Realizei" / "Não realizei"
    if ((etapa === 2 || (isServiceStarted && etapa === 1)) && !delivered) {
        return <ServiceEtapaConfirmacao />;
    }

    // Etapa do formulário dinâmico (após confirmação, antes do recebedor)
    if (delivered && hasFormGroups && !formCompleted) {
        return <SharedEtapaFormulario serviceType="servico" />;
    }

    // Etapa 3: Seleção de quem recebeu
    if (etapa === 3 || (delivered && !recipient.tipo && (!hasFormGroups || formCompleted))) {
        return <SharedEtapaRecebedor serviceType="servico" />;
    }

    // Etapa 4: Formulário de dados
    if (etapa === 4 && recipient.tipo) {
        return <SharedEtapaDados serviceType="servico" />;
    }

    // Etapa 5: Checklist final
    if (etapa === 5) {
        return <SharedEtapaFinalizacao serviceType="servico" />;
    }

    // Fallback para etapa inicial
    return <ServiceEtapaInicial />;
}

/**
 * Tela de Service com Provider
 */
export default function ServiceScreen() {
    const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
    const rotaId = id as string;
    const serviceId = pid as string;

    return (
        <ParadaProvider serviceId={serviceId} rotaId={rotaId}>
            <ServiceOrchestrator />
        </ParadaProvider>
    );
}
