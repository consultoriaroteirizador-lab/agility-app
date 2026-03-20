/**
 * Serviço de Geofencing para monitoramento de pontos de entrega
 * 
 * Este serviço permite criar e gerenciar geofences dinamicamente
 * baseado nas rotas e paradas do motorista.
 */

import { GeofenceEvent } from 'react-native-background-geolocation';

import {
  addGeofences,
  removeAllGeofences,
  removeGeofencesById,
  onGeofenceEvent,
  GeofenceData,
} from '../location/backgroundLocationService';

// Tipos
export type StopGeofence = {
  id: string;
  orderId: string;
  stopId: string;
  latitude: number;
  longitude: number;
  address?: string;
  radius?: number;
};

export type StopGeofenceEvent = {
  geofenceId: string;
  orderId: string;
  stopId: string;
  action: 'ENTER' | 'EXIT' | 'DWELL';
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
};

// Callbacks
type StopGeofenceEventCallback = (event: StopGeofenceEvent) => void;
let stopGeofenceEventCallbacks: StopGeofenceEventCallback[] = [];

// Geofences ativos (cache local)
let activeGeofences: Map<string, StopGeofence> = new Map();

// Configurações
const DEFAULT_RADIUS = 100; // 100 metros
const DWELL_DELAY = 30000; // 30 segundos para DWELL

/**
 * Converte uma parada em geofence
 */
function stopToGeofence(stop: StopGeofence): GeofenceData {
  return {
    identifier: `stop_${stop.orderId}_${stop.stopId}`,
    latitude: stop.latitude,
    longitude: stop.longitude,
    radius: stop.radius || DEFAULT_RADIUS,
    notifyOnEntry: true,
    notifyOnExit: true,
    notifyOnDwell: true,
    loiteringDelay: DWELL_DELAY,
    extras: {
      orderId: stop.orderId,
      stopId: stop.stopId,
      address: stop.address,
    },
  };
}

/**
 * Adiciona geofences para uma lista de paradas
 */
export async function addStopsGeofences(stops: StopGeofence[]): Promise<void> {
  try {
    const geofences = stops.map(stop => {
      activeGeofences.set(`stop_${stop.orderId}_${stop.stopId}`, stop);
      return stopToGeofence(stop);
    });

    await addGeofences(geofences);

    console.log('[GeofenceService] Geofences adicionados:', {
      count: stops.length,
      stops: stops.map(s => ({ id: s.id, orderId: s.orderId })),
    });
  } catch (error) {
    console.error('[GeofenceService] Erro ao adicionar geofences:', error);
    throw error;
  }
}

/**
 * Remove geofence de uma parada específica
 */
export async function removeStopGeofence(orderId: string, stopId: string): Promise<void> {
  const identifier = `stop_${orderId}_${stopId}`;
  
  try {
    await removeGeofencesById([identifier]);
    activeGeofences.delete(identifier);
    
    console.log('[GeofenceService] Geofence removido:', { orderId, stopId });
  } catch (error) {
    console.error('[GeofenceService] Erro ao remover geofence:', error);
    throw error;
  }
}

/**
 * Remove todos os geofences de paradas
 */
export async function clearAllStopGeofences(): Promise<void> {
  try {
    await removeAllGeofences();
    activeGeofences.clear();
    
    console.log('[GeofenceService] Todos os geofences de paradas removidos');
  } catch (error) {
    console.error('[GeofenceService] Erro ao limpar geofences:', error);
    throw error;
  }
}

/**
 * Obtém paradas com geofences ativos
 */
export function getActiveStopGeofences(): StopGeofence[] {
  return Array.from(activeGeofences.values());
}

/**
 * Obtém uma parada específica pelo ID
 */
export function getStopGeofence(orderId: string, stopId: string): StopGeofence | undefined {
  return activeGeofences.get(`stop_${orderId}_${stopId}`);
}

/**
 * Registra callback para eventos de geofence
 */
export function onStopGeofenceEvent(callback: StopGeofenceEventCallback): () => void {
  stopGeofenceEventCallbacks.push(callback);
  
  return () => {
    stopGeofenceEventCallbacks = stopGeofenceEventCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Processa evento de geofence recebido do BackgroundGeolocation
 */
function handleGeofenceEvent(event: GeofenceEvent): void {
  // Parse do identifier (stop_orderId_stopId)
  const parts = event.identifier.split('_');
  
  if (parts.length < 3 || parts[0] !== 'stop') {
    console.log('[GeofenceService] Geofence não é de parada:', event.identifier);
    return;
  }

  const orderId = parts[1];
  const stopId = parts.slice(2).join('_'); // Caso stopId contenha underscore
  const stop = activeGeofences.get(event.identifier);

  const stopEvent: StopGeofenceEvent = {
    geofenceId: event.identifier,
    orderId,
    stopId,
    action: event.action as 'ENTER' | 'EXIT' | 'DWELL',
    timestamp: event.timestamp,
    location: {
      latitude: event.location.coords.latitude,
      longitude: event.location.coords.longitude,
    },
  };

  console.log('[GeofenceService] Evento de geofence:', {
    action: stopEvent.action,
    orderId: stopEvent.orderId,
    stopId: stopEvent.stopId,
    address: stop?.address,
  });

  // Notificar callbacks
  stopGeofenceEventCallbacks.forEach(cb => {
    try {
      cb(stopEvent);
    } catch (error) {
      console.error('[GeofenceService] Erro no callback:', error);
    }
  });
}

// Registrar handler de eventos de geofence
let geofenceUnsubscribe: (() => void) | null = null;

/**
 * Inicializa o listener de eventos de geofence
 */
export function initializeGeofenceService(): void {
  if (geofenceUnsubscribe) {
    console.log('[GeofenceService] Já inicializado');
    return;
  }

  geofenceUnsubscribe = onGeofenceEvent((event: GeofenceEvent) => {
    handleGeofenceEvent(event);
  });

  console.log('[GeofenceService] Serviço inicializado');
}

/**
 * Cleanup do serviço de geofencing
 */
export function cleanupGeofenceService(): void {
  if (geofenceUnsubscribe) {
    geofenceUnsubscribe();
    geofenceUnsubscribe = null;
  }

  stopGeofenceEventCallbacks = [];
  activeGeofences.clear();

  console.log('[GeofenceService] Serviço finalizado');
}

// Exportar serviço
export const GeofenceService = {
  addStopsGeofences,
  removeStopGeofence,
  clearAllStopGeofences,
  getActiveStopGeofences,
  getStopGeofence,
  onStopGeofenceEvent,
  initialize: initializeGeofenceService,
  cleanup: cleanupGeofenceService,
};
