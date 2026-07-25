import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { useFindOneDriver } from '@/domain/agility/driver/useCase';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';
import { useFindMyRoutings } from '@/domain/agility/routing/useCase';
import { useTrackingWebSocket } from '@/domain/agility/tracking';
import type { DriverLocationUpdate } from '@/domain/agility/tracking';
import { authAdapter } from '@/domain/Auth/authAdapter';
import { useAuthCredentialsService } from '@/services';
import { initializeGeofenceService, cleanupGeofenceService } from '@/services/geofence';
import { useLocationTracking, updateBackgroundGeolocationAuth } from '@/services/location';
import { initializeBackgroundGeolocation, cleanupBackgroundGeolocation, onAuthRefreshed, requestCurrentPosition } from '@/services/location/backgroundLocationService';
import { shouldTrack } from '@/services/location/trackingGate';
import { useOfferAlert } from '@/services/offer/OfferAlertProvider';

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
  const { authCredentials, userAuth, saveCredentials } = useAuthCredentialsService();
  // Ref para ler as credenciais atuais dentro do callback de auth-refresh sem
  // reinscrever a cada rotação de token.
  const authCredentialsRef = useRef(authCredentials);
  authCredentialsRef.current = authCredentials;
  // driverId vem do JWT (claim driver_id) via authAdapter.
  const { driverId, startTracking, stopTracking } = useLocationTracking(userAuth?.driverId ?? null);
  const appState = useRef(AppState.currentState);
  const isInitialized = useRef(false);
  // sdkReady em state (não ref) pra que o effect de "start tracking" só
  // dispare quando o SDK tiver finalizado a inicialização assíncrona.
  const [sdkReady, setSdkReady] = useState(false);

  // Rastreamento liga quando o motorista está em rota IN_PROGRESS OU marcado
  // disponível (toggle da home) — ver shouldTrack. Disponível-ocioso também é
  // rastreado (alimenta o "solto" no monitoramento). A query de disponibilidade
  // (useFindOneDriver) compartilha cache com a tela de rotas.
  const { routings } = useFindMyRoutings();
  const hasInProgressRoute = routings.some(
    (r) => r.status === RoutingStatus.IN_PROGRESS,
  );

  // Disponibilidade vem da MESMA fonte da verdade que a home (cache do React
  // Query). Motorista disponível-ocioso também é rastreado (alimenta o "solto"
  // no monitoramento).
  const { driver } = useFindOneDriver(userAuth?.driverId ?? null);
  const isAvailable = driver?.isAvailable ?? false;
  const trackingEnabled = shouldTrack(hasInProgressRoute, isAvailable);

  // Popup global de oferta (uberização). Este provider é o DONO do socket
  // global /monitoring (primeiro consumidor de useTrackingWebSocket), então é
  // aqui que `offer.available` chega de forma confiável — não na tela de
  // ofertas, que só reusa o socket e não tem seus callbacks anexados. O WS
  // entrega o payload; o OfferAlertProvider (montado acima, em
  // (auth)/_layout.tsx) decide exibir.
  const { pushOffer } = useOfferAlert();

  // WebSocket de telemetria (canal /monitoring). NÃO é o canal que envia
  // localizações — o SDK faz isso por HTTP direto. Aqui só recebemos updates
  // pro backend ver o motorista em tempo real.
  const { connect: connectWebSocket, disconnect: disconnectWebSocket } = useTrackingWebSocket({
    onDriverLocationUpdate: (data: DriverLocationUpdate) => {
      console.log('[LocationTrackingProvider] Localização confirmada via WebSocket:', data.driverId);
    },
    onOfferAvailable: pushOffer,
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

  // [3] Start/stop do tracking dirigido por PRESENÇA: rota ativa (IN_PROGRESS)
  // OU disponível (toggle da home) — ver trackingEnabled/shouldTrack.
  // startTracking/stopTracking são idempotentes e checam o estado real do SDK,
  // então re-renders não causam start→stop→start.
  useEffect(() => {
    if (!sdkReady || !driverId) return;

    if (trackingEnabled) {
      console.log('[LocationTrackingProvider] Em rota ou disponível — iniciando tracking');
      startTracking()
        .then(() => {
          // Report imediato: aparece rápido no mapa e não é varrido pelo cron
          // por "nunca ter reportado".
          void requestCurrentPosition();
        })
        .catch(err => {
          console.error('[LocationTrackingProvider] Erro ao iniciar tracking:', err);
        });
    } else {
      console.log('[LocationTrackingProvider] Sem rota e indisponível — parando tracking');
      stopTracking().catch(err => {
        console.error('[LocationTrackingProvider] Erro ao parar tracking:', err);
      });
    }
  }, [sdkReady, driverId, trackingEnabled, startTracking, stopTracking]);

  // [4] Refresh de token → setConfig leve nos headers HTTP do SDK. Sem
  // reinit, sem stop/start — o SDK continua emitindo localizações com o
  // token novo a partir do próximo batch.
  //
  // GATE em `sdkReady` (STATE), não em `isInitialized` (ref). O init é assíncrono
  // e um ref não re-dispara effect: se um refresh de token acontecesse durante o
  // init (ex.: refresh no boot de sessão restaurada), o effect via
  // isInitialized.current===false, fazia no-op e NUNCA mais rodava (a dep do
  // token não mudava depois) — o SDK ficava preso ao token do init. Com token +
  // refresh token defasados pela rotação do Keycloak, o auto-refresh nativo do
  // SDK falhava ("Refresh token inválido") e as requisições tomavam 401. Gatilhar
  // por sdkReady garante que, no instante em que o SDK fica pronto, o token ATUAL
  // é empurrado — cobrindo qualquer refresh ocorrido durante o init.
  useEffect(() => {
    if (!sdkReady) return;
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
  }, [sdkReady, authCredentials?.accessToken, authCredentials?.tenantId, authCredentials?.refreshToken, authCredentials?.expiration]);

  // [4.1] Write-back do refresh nativo do SDK. Quando o SDK renova o JWT em
  // background (onAuthorization), os tokens novos voltam pra cá e gravamos no
  // storage do app (silent, sem mexer no spinner de boot). Sem isto, o refresh
  // token do JS fica defasado/revogado pela rotação e o próximo refresh do app
  // falharia -> logout. Cobre o caso de app vivo/recém-background; o caso de app
  // totalmente morto depende da reinicialização no boot (validar no device).
  useEffect(() => {
    const unsubscribe = onAuthRefreshed(({ accessToken, refreshToken }) => {
      const current = authCredentialsRef.current;
      if (!accessToken || !current) return;
      if (accessToken === current.accessToken) return; // já em sincronia
      try {
        const merged = authAdapter.mergeRefreshedTokens(current, { accessToken, refreshToken });
        console.log('[LocationTrackingProvider] SDK renovou o JWT — sincronizando tokens no app');
        saveCredentials(merged, { silent: true }).catch((err) => {
          console.error('[LocationTrackingProvider] Erro ao sincronizar tokens do SDK:', err);
        });
      } catch (err) {
        console.warn('[LocationTrackingProvider] Token renovado pelo SDK é inválido, ignorando:', err);
      }
    });
    return unsubscribe;
  }, [saveCredentials]);

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
