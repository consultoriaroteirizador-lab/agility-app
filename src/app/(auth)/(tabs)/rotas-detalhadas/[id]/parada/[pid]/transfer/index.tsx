import { useEffect } from 'react';

import { useRouter, useLocalSearchParams } from 'expo-router';

import { Box, ActivityIndicator, Text } from '@/components';
import { measure } from '@/theme';

import { EtapaCheckItens } from '../_components/entrega/EtapaCheckItens';
import { SharedEtapaDados } from '../_components/shared/SharedEtapaDados';
import { SharedEtapaFinalizacao } from '../_components/shared/SharedEtapaFinalizacao';
import { SharedEtapaRecebedor } from '../_components/shared/SharedEtapaRecebedor';
import { TransferEtapaConfirmacao } from '../_components/transfer/TransferEtapaConfirmacao';
import { TransferEtapaFinalizarColeta } from '../_components/transfer/TransferEtapaFinalizarColeta';
import { TransferEtapaInicial } from '../_components/transfer/TransferEtapaInicial';
import { ParadaProvider, useParada } from '../_context/ParadaContext';

/**
 * Orchestrator do TRANSFER — wizard de 2 pernas (coleta na origem → entrega no
 * destino). Reusa o mecanismo de `etapa` e os componentes Shared*; o que muda por
 * perna é o endereço (leg-aware no contexto), os rótulos e a ação final:
 *  - perna 'pickup'  → TransferEtapaFinalizarColeta (snapshot + avança)
 *  - perna 'delivery' → SharedEtapaFinalizacao (conclui o serviço de verdade)
 */
function TransferOrchestrator() {
    const router = useRouter();
    const {
        rotaId,
        etapa,
        delivered,
        recipient,
        showSuccess,
        isLoading,
        isServiceStarted,
        materialsState,
        checkCompleted,
        fetchMaterials,
        transferLeg,
    } = useParada();

    const isPickup = transferLeg === 'pickup';

    useEffect(() => {
        if (isServiceStarted && materialsState.materials.length === 0 && !materialsState.loading) {
            fetchMaterials();
        }
    }, [isServiceStarted, materialsState.materials.length, materialsState.loading, fetchMaterials]);

    // Check de itens em AMBAS as pernas: gate por `checkCompleted` (resetado ao trocar
    // de perna), não por allChecked — assim o motorista confere ao carregar E ao entregar.
    const hasMaterials = materialsState.materials.length > 0;
    const needsCheck = hasMaterials && !checkCompleted;

    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => {
                router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}`);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [showSuccess, router, rotaId]);

    if (isLoading) {
        return (
            <Box flex={1} justifyContent="center" alignItems="center" backgroundColor="white">
                <ActivityIndicator />
                <Text preset="textParagraph" marginTop="y16">Carregando...</Text>
            </Box>
        );
    }

    if (showSuccess) {
        return (
            <Box flex={1} backgroundColor="primary100" justifyContent="center" alignItems="center">
                <Box width={measure.x120} height={measure.y12} backgroundColor="white" borderRadius="s10" marginBottom="y10" />
                <Text preset="text18" color="white" textAlign="center">
                    Transferência concluída{'\n'}com sucesso
                </Text>
            </Box>
        );
    }

    const sharedType = isPickup ? 'coleta' : 'entrega';

    // Etapa 1: inicial (mapa origem/destino)
    if (etapa === 1) {
        return <TransferEtapaInicial />;
    }

    // Etapa 2: "Carreguei?" / "Entreguei?"
    if (etapa === 2 && !delivered) {
        return <TransferEtapaConfirmacao />;
    }

    // Check de itens (carregamento na origem / entrega no destino)
    if (delivered && needsCheck) {
        return (
            <EtapaCheckItens
                title={isPickup ? 'Conferência (carregamento)' : 'Conferência (entrega)'}
                summaryLabel={isPickup ? 'Itens para carregar' : 'Itens para entregar'}
                emptyLabel="Nenhum item cadastrado para esta transferência"
            />
        );
    }

    // Dados do recebedor (documento)
    if (etapa === 4 && recipient.tipo) {
        return <SharedEtapaDados serviceType={sharedType} />;
    }

    // Quem entregou (origem) / Quem recebeu (destino)
    if (etapa === 3 || (delivered && !recipient.tipo && !needsCheck)) {
        return <SharedEtapaRecebedor serviceType={sharedType} />;
    }

    // Finalização da perna
    if (etapa === 5) {
        return isPickup ? <TransferEtapaFinalizarColeta /> : <SharedEtapaFinalizacao serviceType="entrega" />;
    }

    return <TransferEtapaInicial />;
}

export default function TransferScreen() {
    const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
    const rotaId = id as string;
    const serviceId = pid as string;

    return (
        <ParadaProvider serviceId={serviceId} rotaId={rotaId}>
            <TransferOrchestrator />
        </ParadaProvider>
    );
}
