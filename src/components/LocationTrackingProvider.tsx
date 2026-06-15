import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { RoutingStatus } from '@/domain/agility/routing/dto/types';
import { useFindMyRoutings } from '@/domain/agility/routing/useCase';
import { useTrackingWebSocket } from '@/domain/agility/tracking';
import type { DriverLocationUpdate } from '@/domain/agility/tracking';
import { useAuthCredentialsService } from '@/services';
import { initializeGeofenceService, cleanupGeofenceService } from '@/services/geofence';
import { useLocationTracking, updateBackgroundGeolocationAuth } from '@/services/location';
import { initializeBackgroundGeolocation, cleanupBackgroundGeolocation } from '@/services/location/backgroundLocationService';

/**
 * Componente que gerencia o rastreamento de localização automaticamente.
 *
 * ARQUITETURA:
 * O Background Geolocation SDK é nativo e autossuficiente — uma vez iniciado,
 * envia localizações via HTTP direto do processo nativo, mesmo com o app
 * em background ou matado pelo SO. O papel do JS é apenas:
 *
 *  1. INIT     — uma vez por motorista, quando driverId+credenciais existem
 *  2. START    — uma vez quando o SDK está pronto
 *  3. AUTH     — propagar refresh de token via setConfig (leve, sem reinit)
 *  4. STOP     — apenas em logout / mudança de motorista / unmount
 *  5. WS       — canal de telemetria separado, pode reciclar sem afetar tracking
 *
 * Cada uma vive em um useEffect próprio com deps próprias, evitando que
 * uma rotação de token (frequente) cause teardown+reinit do SDK (caro e
 * propenso à race "Waiting for previous start action to complete").
 */
export function LocationTrackingProvider({ children }: { children: React.ReactNode }) {
  const { authCredentials, userAuth } = useAuthCredentialsService();
  // driverId vem do JWT (claim driver_id) via authAdapter.
  const { driverId, startTracking, stopTracking } = useLocationTracking(userAuth?.driverId ?? null);
  const appState = useRef(AppState.currentState);
  const isInitialized = useRef(false);
  // sdkReady em state (não ref) pra que o effect de "start tracking" só
  // dispare quando o SDK tiver finalizado a inicialização assíncrona.
  const [sdkReady, setSdkReady] = useState(false);

  // Rastreamento é dirigido pela ROTA, não pela disponibilidade: liga enquanto
  // houver rota IN_PROGRESS e desliga ao concluir. Disponibilidade (toggle da
  // home) controla apenas leilão. A query compartilha cache com a tela de rotas.
  const { routings } = useFindMyRoutings();
  const hasInProgressRoute = routings.some(
    (r) => r.status === RoutingStatus.IN_PROGRESS,
  );

  // WebSocket de telemetria (canal /monitoring). NÃO é o canal que envia
  // localizações — o SDK faz isso por HTTP direto. Aqui só recebemos updates
  // pro backend ver o motorista em tempo real.
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

  // [1] Init SDK + Geofence — UMA VEZ, quando driverId e credenciais ficam
  // ambos disponíveis. SEM função de cleanup aqui: rotações de token
  // entram nessas deps e re-disparam o effect, mas o guard isInitialized
  // garante no-op. Cleanup do SDK fica no effect [2] abaixo.
  useEffect(() => {
    if (!driverId || isInitialized.current) return;
    const accessToken = authCredentials?.accessToken;
    const tenantId = authCredentials?.tenantId;
    if (!accessToken || !tenantId) return;
    const refreshToken = authCredentials?.refreshToken;
    const expiresAt = authCredentials?.expiration
      ? Math.floor(new Date(authCredentials.expiration).getTime() / 1000)
      : undefined;

    (async () => {
      try {
        console.log('[LocationTrackingProvider] Inicializando Background Geolocation SDK...');
        await initializeBackgroundGeolocation({ driverId, accessToken, tenantId, refreshToken, expiresAt });
        initializeGeofenceService();
        isInitialized.current = true;
        setSdkReady(true);
        console.log('[LocationTrackingProvider] SDK inicializado');
      } catch (error) {
        console.error('[LocationTrackingProvider] Erro ao inicializar SDK:', error);
      }
    })();
  }, [driverId, authCredentials?.accessToken, authCredentials?.tenantId]);

  // [2] Teardown do SDK — apenas quando driverId muda (troca de motorista)
  // ou o provider desmonta (logout). Deps mínimas: token NÃO entra aqui.
  useEffect(() => {
    if (!driverId) return;
    return () => {
      if (isInitialized.current) {
        console.log('[LocationTrackingProvider] Encerrando SDK (driver mudou ou desmontou)');
        cleanupGeofenceService();
        cleanupBackgroundGeolocation();
        isInitialized.current = false;
        setSdkReady(false);
      }
    };
  }, [driverId]);

  // [3] Start/stop do tracking dirigido pela ROTA ATIVA (IN_PROGRESS), não pela
  // disponibilidade nem pela tela aberta. Liga quando há rota em andamento e
  // desliga ao concluir. startTracking/stopTracking são idempotentes e checam o
  // estado real do SDK, então re-renders não causam start→stop→start.
  useEffect(() => {
    if (!sdkReady || !driverId) return;

    if (hasInProgressRoute) {
      console.log('[LocationTrackingProvider] Rota IN_PROGRESS — iniciando tracking');
      startTracking().catch(err => {
        console.error('[LocationTrackingProvider] Erro ao iniciar tracking:', err);
      });
    } else {
      console.log('[LocationTrackingProvider] Sem rota IN_PROGRESS — parando tracking');
      stopTracking().catch(err => {
        console.error('[LocationTrackingProvider] Erro ao parar tracking:', err);
      });
    }
  }, [sdkReady, driverId, hasInProgressRoute, startTracking, stopTracking]);

  // [4] Refresh de token → setConfig leve nos headers HTTP do SDK. Sem
  // reinit, sem stop/start — o SDK continua emitindo localizações com o
  // token novo a partir do próximo batch.
  useEffect(() => {
    if (!isInitialized.current) return;
    if (!authCredentials?.accessToken || !authCredentials?.tenantId) return;
    updateBackgroundGeolocationAuth({
      accessToken: authCredentials.accessToken,
      tenantId: authCredentials.tenantId,
      refreshToken: authCredentials.refreshToken,
      expiresAt: authCredentials.expiration
        ? Math.floor(new Date(authCredentials.expiration).getTime() / 1000)
        : undefined,
    }).catch(err => {
      console.error('[LocationTrackingProvider] Erro ao atualizar auth do SDK:', err);
    });
  }, [authCredentials?.accessToken, authCredentials?.tenantId, authCredentials?.refreshToken, authCredentials?.expiration]);

  // [5] WebSocket de telemetria — vida independente do SDK. Reconecta
  // livremente em refresh de token sem afetar o tracking de localização.
  useEffect(() => {
    if (!driverId) return;
    if (!authCredentials?.accessToken || !authCredentials?.tenantId) return;
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, [driverId, authCredentials?.accessToken, authCredentials?.tenantId, connectWebSocket, disconnectWebSocket]);

  // [6] AppState — reconecta WS ao voltar do background. Tracking nativo
  // continua sozinho, não precisa de ação do JS aqui.
  useEffect(() => {
    if (!driverId) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[LocationTrackingProvider] App voltou ao primeiro plano');
        connectWebSocket();
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        console.log('[LocationTrackingProvider] App foi para segundo plano');
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [driverId, connectWebSocket]);

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
