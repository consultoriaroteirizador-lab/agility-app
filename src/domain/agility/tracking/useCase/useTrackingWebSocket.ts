/**
 * Hook para WebSocket de Tracking/Monitoramento
 * 
 * Conecta ao namespace /monitoring do backend para receber
 * atualizações em tempo real de localização dos motoristas.
 */

import { useEffect, useRef, useCallback } from 'react';

import type { Socket } from 'socket.io-client';

import type { OfferPayload } from '@/domain/agility/offer/offerStore';
import { useAuthCredentialsService } from '@/services/authCredentials/useAuthCredentialsService';
import { createAuthedSocket, socketBaseUrl, type AuthedSocket } from '@/services/socket/createAuthedSocket';

import type { DriverLocationUpdate } from '../types';

// Tipos
export interface TrackingWebSocketOptions {
  onDriverLocationUpdate?: (data: DriverLocationUpdate) => void;
  /** Rota atualizada no backend (replan, re-projeção de ETA por atraso, etc.). */
  onRoutingUpdated?: (data: { id?: string } & Record<string, unknown>) => void;
  /** Serviço/parada atualizado (status, ETA re-projetada, etc.). */
  onServiceUpdated?: (data: { id?: string; routingId?: string } & Record<string, unknown>) => void;
  /** Nova oferta disponível para o motorista (uberização).
   *  Emitido pelo backend em `offer.available` na sala `user:${keycloakUserId}`. */
  onOfferAvailable?: (offer: OfferPayload) => void;
  onConnect?: () => void;
  /**
   * Voltou depois de uma queda. O gateway não reenvia (para as salas) o que emitiu com o
   * socket fora: quem mostra dado ao vivo recarrega aqui.
   */
  onReconnect?: () => void;
  /**
   * O servidor derrubou a conexão (token vencido). Dispare um refetch REST: é o 401 dele
   * que faz o interceptor do axios renovar o token antes da próxima tentativa.
   */
  onServerDisconnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// Estado global do socket para evitar múltiplas conexões
let globalSocket: Socket | null = null;
let globalAuthed: AuthedSocket | null = null;
let connectionCount = 0;
// Token mais recente visto por qualquer consumidor. O `auth` do socket é função e lê
// daqui a cada handshake: renovar o token não exige recriar o socket (o gateway só
// valida na conexão), e a próxima reconexão já sai com o token novo.
let latestAccessToken: string | null = null;
// Geração do socket global: sobe a cada socket criado. `connectionCount` conta
// referências AO SOCKET ATUAL; quem segurava um socket já descartado não pode
// descontar do contador do novo.
let socketGeneration = 0;
// Opções de cada consumidor anexado, para repassar conexão/reconexão/derrubada.
const attachedOptions = new Set<{ current: TrackingWebSocketOptions }>();

/** Só para testes: zera o estado de módulo entre casos. */
export function __resetTrackingSocketForTests() {
  globalSocket = null;
  globalAuthed = null;
  connectionCount = 0;
  latestAccessToken = null;
  attachedOptions.clear();
}

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

  const accessToken = authCredentials?.accessToken ?? null;
  useEffect(() => {
    if (accessToken) latestAccessToken = accessToken;
  }, [accessToken]);

  // Esta instância segura no máximo UMA referência ao socket global. Antes o
  // consumidor decrementava duas vezes (o próprio disconnect + o cleanup
  // interno), e sair do detalhe da rota zerava o contador e derrubava o socket
  // que entregava `offer.available`. Guarda a GERAÇÃO do socket segurado (ou
  // null): depois de uma troca de token, a referência ao socket velho não
  // conta mais.
  const holdsRef = useRef<number | null>(null);
  const detachRef = useRef<(() => void) | null>(null);

  /** Soma a referência desta instância ao socket atual, uma vez só. */
  const hold = useCallback(() => {
    if (holdsRef.current === socketGeneration) return;
    holdsRef.current = socketGeneration;
    connectionCount++;
  }, []);

  /** Listeners DESTA instância, anexados a qualquer socket (novo ou reusado). */
  const attach = useCallback((socket: Socket) => {
    detachRef.current?.();
    const on = <T,>(ev: string, fn: (d: T) => void) => {
      socket.on(ev, fn);
      return () => { socket.off(ev, fn); };
    };
    const offs = [
      on('driver_location_updated', (d: DriverLocationUpdate) => optionsRef.current.onDriverLocationUpdate?.(d)),
      on('routing_updated', (d: { id?: string }) => optionsRef.current.onRoutingUpdated?.(d)),
      on('service_updated', (d: { id?: string; routingId?: string }) => optionsRef.current.onServiceUpdated?.(d)),
      on('offer.available', (o: OfferPayload) => optionsRef.current.onOfferAvailable?.(o)),
      on('disconnect', () => optionsRef.current.onDisconnect?.()),
      on('connect_error', (e: Error) => optionsRef.current.onError?.(e)),
    ];
    attachedOptions.add(optionsRef);
    detachRef.current = () => {
      offs.forEach((off) => off());
      attachedOptions.delete(optionsRef);
      detachRef.current = null;
    };
  }, []);

  /**
   * Conectar ao WebSocket
   */
  const connect = useCallback(() => {
    // Token renovado NÃO recria o socket (e `connect` nem depende dele): o gateway
    // só valida no handshake, e o `auth` (função) lê `latestAccessToken`, mantido
    // pelo efeito acima, na próxima tentativa. Recriar derrubava a conexão a cada
    // refresh e perdia o que chegasse no intervalo.

    // Reutilizar o socket global se existir, MESMO que
    // ainda não esteja conectado: em handshake ou em backoff de reconexão, o
    // socket.io retoma sozinho. Exigir `connected` aqui criava um segundo
    // socket e o primeiro virava órfão, vivo depois do logout. `connect()` no
    // socket existente é inócuo em handshake/backoff e reabre o socket que
    // esgotou as tentativas de reconexão.
    if (globalSocket) {
      if (!globalSocket.connected) globalSocket.connect();
      socketRef.current = globalSocket;
      attach(globalSocket);
      hold();
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

    console.log('[TrackingWebSocket] Conectando a:', socketBaseUrl());

    // Token por tentativa, reconexão infinita e `io server disconnect` (token
    // vencido) ficam com o helper.
    //
    // `subscribe_routings` precisa ser re-emitido a cada (re)conexão: a sala
    // `:routings` pertencia ao socket antigo (`user:<sub>` e `tenant:*` o
    // gateway junta sozinho). ATENÇÃO: emitir no `connect` do cliente dispara
    // ANTES do servidor terminar handleConnection (que é async — busca tenant
    // no Redis + valida JWT via JWKS), e o subscribe responde "Not
    // authenticated". O servidor emite `connected` só depois de toda a auth
    // terminar — esse é o sinal correto (`onReady`).
    let socket!: Socket;
    globalAuthed = createAuthedSocket({
      namespace: '/monitoring',
      path: '/socket.io',
      getAuth: () => ({ token: latestAccessToken, tenantId, userId }),
      query: { tenantId, userId },
      onReady: ({ reconnected }) => {
        console.log('[TrackingWebSocket] Servidor confirmou autenticação, subscrevendo');
        socket.emit('subscribe_routings', { tenantId });
        attachedOptions.forEach((o) => {
          o.current.onConnect?.();
          if (reconnected) o.current.onReconnect?.();
        });
      },
      onServerDisconnect: () => {
        attachedOptions.forEach((o) => o.current.onServerDisconnect?.());
      },
      onDisconnect: (reason) => {
        console.log('[TrackingWebSocket] Desconectado:', reason);
      },
    });
    globalSocket = globalAuthed.socket;

    // Usar referência local para evitar race com globalSocket sendo nullado
    // entre a anexação do listener e o fire do evento.
    socket = globalSocket;
    socketGeneration++;
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[TrackingWebSocket] Conectado ao namespace /monitoring (aguardando confirmação do servidor)');
    });

    socket.on('connect_error', (error) => {
      console.error('[TrackingWebSocket] Erro de conexão:', error.message);
    });

    // Escutar erros
    socket.on('error', (error: { message: string }) => {
      console.error('[TrackingWebSocket] Erro do servidor:', error.message);
    });

    attach(socket);
    hold();
  }, [userAuth?.id, authCredentials?.tenantId, attach, hold]);

  /**
   * Desconectar do WebSocket
   */
  const disconnect = useCallback(() => {
    detachRef.current?.();
    socketRef.current = null;
    if (holdsRef.current === null) return; // idempotente por instância
    const heldCurrent = holdsRef.current === socketGeneration;
    holdsRef.current = null;
    // Referência a um socket já descartado não desconta do atual.
    if (!heldCurrent) return;
    connectionCount = Math.max(0, connectionCount - 1);

    // Só desconectar se for a última referência
    if (connectionCount === 0 && globalSocket) {
      console.log('[TrackingWebSocket] Desconectando socket global');
      globalSocket.removeAllListeners();
      globalAuthed?.dispose();
      globalAuthed = null;
      globalSocket = null;
    }
  }, []);

  /**
   * Reconectar ao voltar do background: acorda o socket que já existe em vez
   * de criar outro. Só cria (via `connect`) se não houver socket nenhum.
   */
  const reconnect = useCallback(() => {
    if (globalSocket && !globalSocket.connected) globalSocket.connect();
    else if (!globalSocket) connect();
  }, [connect]);

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
    reconnect,
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
