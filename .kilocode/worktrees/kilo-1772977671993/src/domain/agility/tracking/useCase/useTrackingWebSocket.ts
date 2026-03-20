/**
 * Hook para WebSocket de Tracking/Monitoramento
 * 
 * Conecta ao namespace /monitoring do backend para receber
 * atualizações em tempo real de localização dos motoristas.
 */

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { urls } from '@/config/urls';
import { useAuthCredentialsService } from '@/services/authCredentials/useAuthCredentialsService';
import type { DriverLocationUpdate } from '../types';

// Tipos
export interface TrackingWebSocketOptions {
  onDriverLocationUpdate?: (data: DriverLocationUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// Estado global do socket para evitar múltiplas conexões
let globalSocket: Socket | null = null;
let connectionCount = 0;

/**
 * Hook para conexão WebSocket com o namespace /monitoring
 */
export function useTrackingWebSocket(options: TrackingWebSocketOptions = {}) {
  const { userAuth, authCredentials } = useAuthCredentialsService();
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);

  // Manter options atualizadas
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  /**
   * Conectar ao WebSocket
   */
  const connect = useCallback(() => {
    // Reutilizar conexão global se existir
    if (globalSocket?.connected) {
      socketRef.current = globalSocket;
      connectionCount++;
      console.log('[TrackingWebSocket] Reutilizando conexão existente');
      return;
    }

    // Obter tenantId de authCredentials (não de userAuth)
    const tenantId = authCredentials?.tenantId;
    const userId = userAuth?.id;

    // Não conectar sem autenticação
    if (!tenantId || !userId) {
      console.warn('[TrackingWebSocket] Sem credenciais, não conectando');
      return;
    }

    // Construir URL do WebSocket
    const baseUrl = urls.agilityApi;
    const wsBase = baseUrl.replace(/^https?:\/\//, '');
    const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${wsBase}`;

    console.log('[TrackingWebSocket] Conectando a:', wsUrl);

    // Criar socket
    globalSocket = io(wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      query: {
        tenantId,
        userId,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = globalSocket;
    connectionCount++;

    // Eventos de conexão
    globalSocket.on('connect', () => {
      console.log('[TrackingWebSocket] Conectado ao namespace /monitoring');
      optionsRef.current.onConnect?.();
    });

    globalSocket.on('disconnect', (reason) => {
      console.log('[TrackingWebSocket] Desconectado:', reason);
      optionsRef.current.onDisconnect?.();
    });

    globalSocket.on('connect_error', (error) => {
      console.error('[TrackingWebSocket] Erro de conexão:', error.message);
      optionsRef.current.onError?.(error);
    });

    // Subscrever ao room do tenant para receber broadcasts
    globalSocket.emit('subscribe_routings', {
      tenantId,
    });

    // Escutar atualizações de localização dos motoristas
    globalSocket.on('driver_location_updated', (data: DriverLocationUpdate) => {
      console.log('[TrackingWebSocket] Location update:', data.driverId);
      optionsRef.current.onDriverLocationUpdate?.(data);
    });

    // Escutar erros
    globalSocket.on('error', (error: { message: string }) => {
      console.error('[TrackingWebSocket] Erro do servidor:', error.message);
    });

  }, [userAuth?.id, authCredentials?.tenantId]);

  /**
   * Desconectar do WebSocket
   */
  const disconnect = useCallback(() => {
    connectionCount--;

    // Só desconectar se for a última referência
    if (connectionCount <= 0 && globalSocket) {
      console.log('[TrackingWebSocket] Desconectando socket global');
      globalSocket.disconnect();
      globalSocket = null;
      connectionCount = 0;
    }

    socketRef.current = null;
  }, []);

  /**
   * Enviar evento de localização (se necessário)
   */
  const emitLocation = useCallback((location: { lat: number; lng: number }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('driver_location', {
        location,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    emitLocation,
    isConnected: socketRef.current?.connected ?? false,
    socket: socketRef.current,
  };
}

/**
 * Hook simplificado para apenas escutar atualizações de localização
 */
export function useDriverLocationListener(
  onLocationUpdate: (data: DriverLocationUpdate) => void,
) {
  const { connect, disconnect } = useTrackingWebSocket({
    onDriverLocationUpdate: onLocationUpdate,
  });

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected: true };
}
