/**
 * Serviço de Localização - Wrapper para Background Geolocation
 *
 * Este arquivo mantém a interface original do locationService
 * mas usa o novo BackgroundGeolocation SDK internamente.
 *
 * Mantém compatibilidade com código existente.
 */

import type { UpdateDriverRequest } from '@/domain/agility/driver/dto';
import { useUpdateDriver } from '@/domain/agility/driver/useCase';
import { useAuthCredentialsService } from '@/services';

// Importar novo serviço
import {
  initializeBackgroundGeolocation,
  startBackgroundTracking,
  stopBackgroundTracking,
  getCurrentPosition,
  getTrackingState,
  cleanupBackgroundGeolocation,
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
 * Inicia o rastreamento de localização
 * @param driverId - ID real do driver (da tabela Driver, não o collaboratorId)
 * @param updateDriver - Callback para atualizar o driver no backend
 * @param authConfig - Credenciais de autenticação
 */
export async function startLocationTracking(
  driverId: string,
  updateDriver?: UpdateDriverCallback,
  authConfig?: { accessToken: string; tenantId: string }
): Promise<void> {
  if (legacyTrackingActive) {
    console.log('[LocationService] Tracking já está ativo');
    return;
  }

  console.log('[LocationService] Iniciando rastreamento para driver:', driverId);

  if (USE_BACKGROUND_GEOLOCATION) {
    // Verificar se temos as credenciais de autenticação
    if (!authConfig?.accessToken || !authConfig?.tenantId) {
      console.error('[LocationService] Credenciais de autenticação não fornecidas');
      return;
    }

    // Usar novo Background Geolocation SDK com headers de autenticação
    const trackingAuthConfig: TrackingAuthConfig = {
      driverId,
      accessToken: authConfig.accessToken,
      tenantId: authConfig.tenantId,
    };

    await startBackgroundTracking(trackingAuthConfig);
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
  const { authCredentials } = useAuthCredentialsService();
  const { updateDriver } = useUpdateDriver();

  const startTracking = async () => {
    if (!driverId) {
      console.warn('[LocationService] Driver ID não fornecido. Tracking não iniciado.');
      return;
    }

    // Passar credenciais de autenticação
    await startLocationTracking(
      driverId,
      updateDriver,
      {
        accessToken: authCredentials?.accessToken || '',
        tenantId: authCredentials?.tenantId || '',
      }
    );
  };

  const stopTracking = async () => {
    await stopLocationTracking(driverId || undefined, updateDriver);
  };

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
};
