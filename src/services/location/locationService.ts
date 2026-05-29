/**
 * Serviço de Localização - Wrapper para Background Geolocation
 *
 * Este arquivo mantém a interface original do locationService
 * mas usa o novo BackgroundGeolocation SDK internamente.
 *
 * Mantém compatibilidade com código existente.
 */

import { useCallback } from 'react';

import type { UpdateDriverRequest } from '@/domain/agility/driver/dto';
import { useUpdateDriver } from '@/domain/agility/driver/useCase';

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
 * Tipo para o callback updateDriver
 * Usa os tipos do domínio para garantir compatibilidade
 */
type UpdateDriverCallback = (variables: {
  id: string;
  payload: UpdateDriverRequest;
}) => void;

/**
 * Inicia o rastreamento de localização.
 *
 * Pré-condição: o SDK precisa estar inicializado com headers de auth
 * (responsabilidade do LocationTrackingProvider). Esta função apenas
 * dispara o start() do SDK — não toca em token nem tenantId, então pode
 * ser chamada várias vezes ao longo da sessão sem desconfigurar nada.
 */
export async function startLocationTracking(
  driverId: string,
  updateDriver?: UpdateDriverCallback,
): Promise<void> {
  if (legacyTrackingActive) {
    console.log('[LocationService] Tracking já está ativo');
    return;
  }

  console.log('[LocationService] Iniciando rastreamento para driver:', driverId);

  if (USE_BACKGROUND_GEOLOCATION) {
    await startBackgroundTracking(driverId);
  }

  legacyTrackingActive = true;

  // Atualizar disponibilidade no backend
  if (updateDriver) {
    try {
      // Obter posição inicial
      const position = await getCurrentPosition();
      if (position) {
        updateDriver({
          id: driverId,
          payload: {
            currentLatitude: position.latitude,
            currentLongitude: position.longitude,
            isAvailable: true,
          },
        });
      } else {
        // Mesmo sem posição, marcar como disponível
        updateDriver({
          id: driverId,
          payload: {
            isAvailable: true,
          },
        });
      }
    } catch (error) {
      console.error('[LocationService] Erro ao enviar posição inicial:', error);
    }
  }
}

/**
 * Para o rastreamento de localização
 * @param driverId - ID real do driver
 * @param updateDriver - Callback para atualizar o driver no backend
 */
export async function stopLocationTracking(
  driverId?: string,
  updateDriver?: UpdateDriverCallback
): Promise<void> {
  if (!legacyTrackingActive) {
    return;
  }

  console.log('[LocationService] Parando rastreamento');

  if (USE_BACKGROUND_GEOLOCATION) {
    await stopBackgroundTracking();
  }

  legacyTrackingActive = false;

  // Atualizar disponibilidade no backend
  if (driverId && updateDriver) {
    try {
      updateDriver({
        id: driverId,
        payload: {
          isAvailable: false,
        },
      });
      console.log('[LocationService] Status atualizado para indisponível');
    } catch (error) {
      console.error('[LocationService] Erro ao atualizar status:', error);
    }
  }
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
  const { updateDriver } = useUpdateDriver();

  // startTracking/stopTracking não dependem mais de accessToken/tenantId —
  // o SDK já carrega isso internamente e o LocationTrackingProvider propaga
  // refreshes via updateBackgroundGeolocationAuth. Resultado: identidades
  // estáveis através de rotações de token, sem o ciclo stop→start→stop que
  // gerava "Waiting for previous start action to complete".
  const startTracking = useCallback(async () => {
    if (!driverId) {
      console.warn('[LocationService] Driver ID não fornecido. Tracking não iniciado.');
      return;
    }
    await startLocationTracking(driverId, updateDriver);
  }, [driverId, updateDriver]);

  const stopTracking = useCallback(async () => {
    await stopLocationTracking(driverId || undefined, updateDriver);
  }, [driverId, updateDriver]);

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
