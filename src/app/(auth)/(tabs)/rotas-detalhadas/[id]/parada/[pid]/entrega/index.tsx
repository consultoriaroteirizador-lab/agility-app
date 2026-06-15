import { useEffect } from 'react';

import { useRouter, useLocalSearchParams } from 'expo-router';

import { Box, ActivityIndicator, Text } from '@/components';
import { measure } from '@/theme';

import { EtapaCheckItens } from '../_components/entrega/EtapaCheckItens';
import { EtapaColetaRetorno } from '../_components/entrega/EtapaColetaRetorno';
import { EtapaConfirmacao } from '../_components/entrega/EtapaConfirmacao';
import { EtapaInicial } from '../_components/entrega/EtapaInicial';
import { EtapaConcluida } from '../_components/shared/EtapaConcluida';
import { SharedEtapaDados } from '../_components/shared/SharedEtapaDados';
import { SharedEtapaFinalizacao } from '../_components/shared/SharedEtapaFinalizacao';
import { SharedEtapaFormulario } from '../_components/shared/SharedEtapaFormulario';
import { SharedEtapaRecebedor } from '../_components/shared/SharedEtapaRecebedor';
import { ParadaProvider, useParada } from '../_context/ParadaContext';

/**
 * Orchestrator da entrega - gerencia qual etapa exibir
 */
function EntregaOrchestrator() {
    const router = useRouter();
    const {
        rotaId,
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
        hasReturn,
        returnCheckCompleted,
    } = useParada();

    // Serviço já finalizado → tela read-only (não reabre o fluxo de execução).
    const isServiceFinalized =
        service?.isCompleted === true || service?.isCanceled === true || service?.isFailed === true;

    // Buscar materiais quando entrar na etapa de confirmação (para saber se tem materiais)
    useEffect(() => {
        if (!isLoading && materialsState.materials.length === 0 && !materialsState.loading) {
            fetchMaterials();
        }
    }, [isLoading, materialsState.materials.length, materialsState.loading, fetchMaterials]);

    // Materiais separados por direção: entrega (DELIVERY/legado) vs retorno (PICKUP).
    const deliveryMaterials = materialsState.materials.filter((m) => m.direction !== 'PICKUP');
    const returnMaterials = materialsState.materials.filter((m) => m.direction === 'PICKUP');

    const deliveryAllChecked = deliveryMaterials.every((m) => m.status !== 'PENDING');
    const returnAllChecked = returnMaterials.every((m) => m.status !== 'PENDING');

    // Check dos itens entregues (etapa pós-confirmação).
    const needsDeliveryCheck = deliveryMaterials.length > 0 && !deliveryAllChecked && !checkCompleted;
    // Check dos itens de retorno (etapa extra quando a parada tem devolução no mesmo stop).
    const needsReturnCheck =
        hasReturn && returnMaterials.length > 0 && !returnAllChecked && !returnCheckCompleted;

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

    // Serviço já finalizado (concluído/insucesso): tela somente leitura.
    if (isServiceFinalized) {
        return <EtapaConcluida />;
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

    // Etapa 2.5: Check dos itens ENTREGUES (se tiver materiais de entrega não checados)
    if (delivered && needsDeliveryCheck) {
        return <EtapaCheckItens />;
    }

    // Etapa 2.6: Coleta de RETORNO (devolução no mesmo stop) — após checar a entrega.
    if (delivered && !needsDeliveryCheck && needsReturnCheck) {
        return <EtapaColetaRetorno />;
    }

    // Etapa do formulário dinâmico (após check, antes do recebedor)
    if (delivered && !needsDeliveryCheck && !needsReturnCheck && hasFormGroups && !formCompleted) {
        return <SharedEtapaFormulario serviceType="entrega" />;
    }

    // Etapa 4: Formulário de dados (verificar primeiro)
    if (etapa === 4 && recipient.tipo) {
        return <SharedEtapaDados serviceType="entrega" />;
    }

    // Etapa 3: Seleção de quem recebeu
    if (etapa === 3 || (delivered && !recipient.tipo && !needsDeliveryCheck && !needsReturnCheck && (!hasFormGroups || formCompleted))) {
        return <SharedEtapaRecebedor serviceType="entrega" />;
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
