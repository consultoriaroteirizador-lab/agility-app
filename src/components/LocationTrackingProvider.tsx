import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { useTrackingWebSocket } from '@/domain/agility/tracking';
import type { DriverLocationUpdate } from '@/domain/agility/tracking';
import { useAuthCredentialsService } from '@/services';
import { initializeGeofenceService, cleanupGeofenceService } from '@/services/geofence';
import { useLocationTracking } from '@/services/location';
import { initializeBackgroundGeolocation, cleanupBackgroundGeolocation, type TrackingAuthConfig } from '@/services/location/backgroundLocationService';

/**
 * Componente que gerencia o rastreamento de localização automaticamente
 * Inicia o tracking quando o componente é montado e para quando é desmontado
 * 
 * Uso: Colocar este componente em uma tela onde o motorista está ativo (ex: rotas detalhadas)
 * 
 * IMPORTANTE: Este componente inicializa o Background Geolocation SDK
 * que permite rastreamento em segundo plano.
 */
export function LocationTrackingProvider({ children }: { children: React.ReactNode }) {
  const { driverId, startTracking, stopTracking } = useLocationTracking();
  const { authCredentials } = useAuthCredentialsService();
  const appState = useRef(AppState.currentState);
  const isInitialized = useRef(false);

  // WebSocket para monitoramento em tempo real
  const { connect: connectWebSocket, disconnect: disconnectWebSocket } = useTrackingWebSocket({
    onDriverLocationUpdate: (data: DriverLocationUpdate) => {
      console.log('[LocationTrackingProvider] Localização confirmada via WebSocket:', data.driverId);
    },
    onConnect: () => {
      console.log('[LocationTrackingProvider] WebSocket conectado ao /monitoring');
    },
    onDisconnect: () => {
      console.log('[LocationTrackingProvider] WebSocket desconectado');
    },
    onError: (error: Error) => {
      console.error('[LocationTrackingProvider] Erro no WebSocket:', error.message);
    },
  });

  // Inicializar SDK uma única vez
  useEffect(() => {
    if (!driverId || isInitialized.current) return;

    const initialize = async () => {
      try {
        console.log('[LocationTrackingProvider] Inicializando Background Geolocation SDK...');
        
        // Inicializar Background Geolocation
        const authConfig: TrackingAuthConfig = {
          driverId,
          accessToken: authCredentials?.accessToken || '',
          tenantId: authCredentials?.tenantId || '',
        };
        await initializeBackgroundGeolocation(authConfig);
        
        // Inicializar serviço de geofencing
        initializeGeofenceService();
        
        // Conectar WebSocket para monitoramento em tempo real
        connectWebSocket();
        
        isInitialized.current = true;
        console.log('[LocationTrackingProvider] SDK e WebSocket inicializados com sucesso');
      } catch (error) {
        console.error('[LocationTrackingProvider] Erro ao inicializar SDK:', error);
      }
    };

    initialize();

    return () => {
      // Cleanup ao desmontar
      disconnectWebSocket();
      cleanupGeofenceService();
      cleanupBackgroundGeolocation();
      isInitialized.current = false;
    };
  }, [driverId, connectWebSocket, disconnectWebSocket]);

  // Controlar tracking baseado no ciclo de vida do app
  useEffect(() => {
    if (!driverId) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[LocationTrackingProvider] App voltou ao primeiro plano');
        // O Background Geolocation continua rastreando automaticamente
        // Reconectar WebSocket se necessário
        connectWebSocket();
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        console.log('[LocationTrackingProvider] App foi para segundo plano');
        // O Background Geolocation continua rastreando em background
        // WebSocket pode ser mantido ou desconectado para economizar recursos
      }

      appState.current = nextAppState;
    };

    // Escutar mudanças de estado do app
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [driverId, connectWebSocket]);

  // Iniciar/parar tracking
  useEffect(() => {
    if (driverId && isInitialized.current) {
      console.log('[LocationTrackingProvider] Iniciando tracking de localização');
      startTracking();
    }

    return () => {
      console.log('[LocationTrackingProvider] Parando tracking de localização');
      stopTracking();
    };
  }, [driverId, startTracking, stopTracking]);

  return <>{children}</>;
}

/**
 * HOC para envolver componentes com LocationTrackingProvider
 */
export function withLocationTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> {
  return function WithLocationTrackingComponent(props: P) {
    return (
      <LocationTrackingProvider>
        <WrappedComponent {...props} />
      </LocationTrackingProvider>
    );
  };
}
