/**
 * Serviço de Localização - Wrapper para Background Geolocation
 *
 * Este arquivo mantém a interface original do locationService
 * mas usa o novo BackgroundGeolocation SDK internamente.
 *
 * Mantém compatibilidade com código existente.
 */

import { useCallback } from 'react';

// Importar novo serviço
import {
  initializeBackgroundGeolocation,
  startBackgroundTracking,
  stopBackgroundTracking,
  getCurrentPosition,
  getTrackingState,
  cleanupBackgroundGeolocation,
  updateBackgroundGeolocationAuth,
  type TrackingAuthConfig,
} from './backgroundLocationService';

// Re-exportar tipo para compatibilidade
export type { TrackingAuthConfig };

// Flag para controlar se deve usar o novo SDK
const USE_BACKGROUND_GEOLOCATION = true;

// Estado legado para compatibilidade
let legacyTrackingActive = false;

/**
 * Inicia o rastreamento de localização.
 *
 * Pré-condição: o SDK precisa estar inicializado com headers de auth
 * (responsabilidade do LocationTrackingProvider). Esta função apenas
 * dispara o start() do SDK — não toca em token nem tenantId, então pode
 * ser chamada várias vezes ao longo da sessão sem desconfigurar nada.
 *
 * NÃO altera `isAvailable`: a disponibilidade (online/offline) é controlada
 * EXCLUSIVAMENTE pelo toggle da home. Antes, iniciar tracking marcava o
 * motorista como disponível — o que colocava online involuntariamente ao
 * apenas ABRIR uma rota (ex.: via notificação). O SDK envia as posições por
 * HTTP em background, então não é preciso um update manual aqui.
 */
export async function startLocationTracking(driverId: string): Promise<void> {
  console.log('[LocationService] Iniciando rastreamento para driver:', driverId);

  if (USE_BACKGROUND_GEOLOCATION) {
    // Fonte de verdade é o estado REAL do SDK — não o flag `legacyTrackingActive`.
    // Esse flag é global de módulo e sobrevive a um remount do provider; num
    // logout→login rápido o stop (async, do unmount) só o zerava DEPOIS do await,
    // então o novo start podia vê-lo ainda `true` e virar no-op, deixando o
    // tracking sem reiniciar. Checar o SDK evita esse race.
    if (getTrackingState().isTracking) {
      console.log('[LocationService] Tracking já está ativo (SDK)');
      legacyTrackingActive = true;
      return;
    }
    await startBackgroundTracking(driverId);
    legacyTrackingActive = true;
    return;
  }

  if (legacyTrackingActive) {
    console.log('[LocationService] Tracking já está ativo');
    return;
  }
  legacyTrackingActive = true;
}

/**
 * Para o rastreamento de localização. NÃO altera `isAvailable` (ver
 * startLocationTracking) — disponibilidade é responsabilidade do toggle da home.
 */
export async function stopLocationTracking(): Promise<void> {
  if (!legacyTrackingActive) {
    return;
  }

  console.log('[LocationService] Parando rastreamento');

  if (USE_BACKGROUND_GEOLOCATION) {
    await stopBackgroundTracking();
  }

  legacyTrackingActive = false;
}

/**
 * Verifica se o tracking está ativo
 */
export function isTracking(): boolean {
  if (USE_BACKGROUND_GEOLOCATION) {
    return getTrackingState().isTracking;
  }
  return legacyTrackingActive;
}

/**
 * Hook para usar o serviço de localização
 * @param driverId - ID real do driver (obrigatório, use useFindDriverByCollaborator para obter)
 */
export function useLocationTracking(driverId?: string | null) {
  // startTracking/stopTracking dependem APENAS de driverId — identidades estáveis
  // (não dependem mais de updateDriver/token). Isso evita o loop em que callbacks
  // instáveis re-disparavam o useEffect de tracking do LocationTrackingProvider.
  const startTracking = useCallback(async () => {
    if (!driverId) {
      console.warn('[LocationService] Driver ID não fornecido. Tracking não iniciado.');
      return;
    }
    await startLocationTracking(driverId);
  }, [driverId]);

  const stopTracking = useCallback(async () => {
    await stopLocationTracking();
  }, []);

  return {
    driverId,
    startTracking,
    stopTracking,
    isTrackingActive: isTracking(),
  };
}

/**
 * Cleanup do serviço
 */
export async function cleanupLocationService(): Promise<void> {
  await cleanupBackgroundGeolocation();
  legacyTrackingActive = false;
}

// Re-exportar funções do novo serviço
export {
  getCurrentPosition,
  getTrackingState,
  initializeBackgroundGeolocation,
  updateBackgroundGeolocationAuth,
};
