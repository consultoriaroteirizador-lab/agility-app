import { useEffect } from 'react';

import { useLocalSearchParams } from 'expo-router';

import { Box, ActivityIndicator, Text } from '@/components';
import { requirementsForServiceType } from '@/domain/agility/company/completionRequirements';
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
import { useDestinoAposNota } from '../_hooks/useDestinoAposNota';
import { resolveCompletionStep } from '../_utils/completionStep';

/**
 * Orchestrator da entrega - gerencia qual etapa exibir
 */
function EntregaOrchestrator() {
    const {
        rotaId,
        serviceId,
        service,
        etapa,
        isServiceStarted,
        isParadaAtendida,
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
        pedidosDaParada,
        completionRequirements,
    } = useParada();

    // Task 5: para onde ir depois de fechar ESTA nota — índice da parada (se a
    // porta ainda tem outra nota por trabalhar) ou lista de paradas da rota
    // (se era a última, comportamento de hoje). Ver `useDestinoAposNota`.
    const navegarAposFecharNota = useDestinoAposNota(pedidosDaParada, serviceId, rotaId);

    // Serviço já finalizado → tela read-only (não reabre o fluxo de execução).
    const isServiceFinalized =
        service?.isCompleted === true || service?.isCanceled === true || service?.isFailed === true;

    // A pergunta de CHEGADA (etapa 1) é da PARADA (porta), não deste serviço —
    // revisão do Task 2 (finding 1): `isServiceStarted` sozinho é só deste
    // serviço; sem o OR com `isParadaAtendida`, a nota 2..N de uma porta já
    // atendida cairia no fallback `EtapaInicial` no fim desta função enquanto a
    // PRÓPRIA nota ainda não tivesse virado IN_ATTENDANCE (corrida com o
    // start-attendance disparado ao abrir o card no índice da parada). Usado
    // nas DUAS metades do gate (abaixo, nas linhas que decidem `EtapaInicial` x
    // `EtapaConfirmacao`) porque são o mesmo gate espelhado — mudar só uma
    // reabre o defeito pela outra. Numa parada de 1 nota (a maioria hoje),
    // `isParadaAtendida` é EXATAMENTE `isServiceStarted` (mesmo serviço, mesma
    // derivação), então este OR não muda nada nesse caso.
    const arrivedAtStop = isServiceStarted || isParadaAtendida;

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
    if (etapa === 1 && !arrivedAtStop) {
        return <EtapaInicial />;
    }

    // Etapa 2: "Entreguei" / "Não delivered"
    if ((etapa === 2 || (arrivedAtStop && etapa === 1)) && !delivered) {
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

    // A partir daqui quem decide a etapa e resolveCompletionStep: ocultar a etapa
    // de recebedor sem alguem assumir o lugar dela deixa o motorista preso.
    const readyAfterChecks =
        delivered && !needsDeliveryCheck && !needsReturnCheck && (!hasFormGroups || formCompleted);

    const step = resolveCompletionStep({
        etapa,
        readyAfterChecks,
        hasRecipientType: !!recipient.tipo,
        requirements: requirementsForServiceType(completionRequirements, 'entrega'),
    });

    if (step === 'recipient') return <SharedEtapaRecebedor serviceType="entrega" />;
    if (step === 'data') return <SharedEtapaDados serviceType="entrega" />;
    if (step === 'final') return <SharedEtapaFinalizacao serviceType="entrega" />;

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
