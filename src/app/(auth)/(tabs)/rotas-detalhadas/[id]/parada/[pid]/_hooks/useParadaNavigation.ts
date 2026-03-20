import { useCallback } from 'react';
import { Platform, Linking } from 'react-native';

import { useRouter } from 'expo-router';

import { useToastService } from '@/services/Toast/useToast';

import { useParada } from '../_context/ParadaContext';

type AppMap = 'waze' | 'googleMaps' | 'appleMaps';

/**
 * Hook para gerenciar navegação entre etapas e apps de mapa
 */
export function useParadaNavigation() {
    const router = useRouter();
    const { rotaId, serviceId, service, isServiceStarted, setShowNavigation } = useParada();
    const { showToast } = useToastService();

    // Voltar para a rota
    const goToRota = useCallback(() => {
        router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}`);
    }, [router, rotaId]);

    // Voltar para a tela anterior
    const goBack = useCallback(() => {
        router.back();
    }, [router]);

    // Ir para tela de não realizado (insucesso)
    const goToTentativaEntrega = useCallback(() => {
        router.push({
            pathname: '/rotas-detalhadas/[id]/parada/[pid]/nao-realizado',
            params: { id: rotaId, pid: serviceId },
        });
    }, [router, rotaId, serviceId]);

    // Abrir app de navegação
    const openDeviceMap = useCallback(async (app: AppMap) => {
        const latitude = service?.address?.latitude;
        const longitude = service?.address?.longitude;

        if (!latitude || !longitude) {
            showToast({ message: 'Coordenadas do endereço não disponíveis.', type: 'error' });
            return;
        }

        const latLng = `${latitude},${longitude}`;
        const label = encodeURIComponent(service?.address?.formattedAddress || '');
        let url: string | undefined;

        try {
            switch (app) {
                case 'waze':
                    url = `waze://?ll=${latLng}&navigate=yes`;
                    if (!(await Linking.canOpenURL(url))) {
                        url = `https://waze.com/ul?ll=${latLng}&navigate=yes`;
                    }
                    break;
                case 'googleMaps':
                    url =
                        Platform.OS === 'ios'
                            ? `comgooglemaps://?q=${latLng}`
                            : `https://www.google.com/maps/search/?api=1&query=${latLng}`;
                    break;
                case 'appleMaps':
                    url = `maps://?q=${latLng}(${label})`;
                    break;
            }

            if (url) {
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                    await Linking.openURL(url);
                } else {
                    showToast({ message: 'Não foi possível abrir o aplicativo de mapas', type: 'error' });
                }
            }
        } catch {
            showToast({ message: 'Não foi possível abrir o aplicativo de mapas', type: 'error' });
        } finally {
            setShowNavigation(false);
        }
    }, [service, setShowNavigation]);

    // Mostrar modal de navegação
    const showNavigationModal = useCallback(() => {
        setShowNavigation(true);
    }, [setShowNavigation]);

    // Fechar modal de navegação
    const hideNavigationModal = useCallback(() => {
        setShowNavigation(false);
    }, [setShowNavigation]);

    // Verificar se tem coordenadas válidas
    const hasValidCoords = Boolean(
        service?.address?.latitude && service?.address?.longitude
    );

    return {
        // Navegação de rota
        goToRota,
        goBack,
        goToTentativaEntrega,

        // Navegação de mapa
        openDeviceMap,
        showNavigationModal,
        hideNavigationModal,
        hasValidCoords,

        // Dados úteis
        endereco: service?.address?.formattedAddress || 'Endereço não disponível',
        isServiceStarted,
    };
}
