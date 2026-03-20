import { useEffect, useRef } from 'react';

import { useRouter, useLocalSearchParams } from 'expo-router';

import { Box, ActivityIndicator, Text } from '@/components';
import { measure } from '@/theme';

import { ServiceEtapaInicial, ServiceEtapaConfirmacao, ServiceEtapaRecebedor } from '../_components/service';
import { SharedEtapaDados } from '../_components/shared/SharedEtapaDados';
import { SharedEtapaFinalizacao } from '../_components/shared/SharedEtapaFinalizacao';
import { ParadaProvider, useParada } from '../_context/ParadaContext';

/**
 * Orchestrator do service - gerencia qual etapa exibir
 */
function ServiceOrchestrator() {
    const router = useRouter();
    const {
        rotaId,
        etapa,
        isServiceStarted,
        delivered,
        recipient,
        showSuccess,
        isLoading,
    } = useParada();

    // Refs para controle de montagem e cleanup - previne crash ao reiniciar app
    const isMountedRef = useRef(true);
    const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup ao desmontar o componente
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current);
                navigationTimeoutRef.current = null;
            }
        };
    }, []);

    // Redirecionar após sucesso - com cleanup para prevenir crash
    useEffect(() => {
        if (showSuccess) {
            navigationTimeoutRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                    router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}`);
                }
            }, 2500);
            return () => {
                if (navigationTimeoutRef.current) {
                    clearTimeout(navigationTimeoutRef.current);
                    navigationTimeoutRef.current = null;
                }
            };
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

    // Renderizar etapa atual baseado no estado
    // Etapa 1: "Indo pra lá" / "Estou aqui!"
    if (etapa === 1 && !isServiceStarted) {
        return <ServiceEtapaInicial />;
    }

    // Etapa 2: "Realizei" / "Não realizei"
    if ((etapa === 2 || (isServiceStarted && etapa === 1)) && !delivered) {
        return <ServiceEtapaConfirmacao />;
    }

    // Etapa 3: Seleção de quem recebeu
    if (etapa === 3 || (delivered && !recipient.tipo)) {
        return <ServiceEtapaRecebedor />;
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
