import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { AccessibilityInfo, Vibration } from 'react-native';

import { usePathname } from 'expo-router';

import { NotificationBanner } from '@/components/NotificationBanner/NotificationBanner';
import type { NotificationResponse } from '@/domain/agility/notification/dto';
import { NotificationStatus } from '@/domain/agility/notification/dto';
import { resolverDestinoDaNotificacao } from '@/domain/agility/notification/notificationTarget';
import { useMarkNotificationAsRead } from '@/domain/agility/notification/useCase/useMarkNotificationAsRead';
import { useNotificationWebSocket } from '@/domain/agility/notification/useCase/useNotificationWebSocket';
import { useAppSafeArea } from '@/hooks/useAppSafeArea';
import { abrirDestinoDaNotificacao } from '@/services/notification/notificationRoutes';
import { useOfferAlert } from '@/services/offer/OfferAlertProvider';

import { ESTADO_INICIAL_BANNER, destinoEhTelaAtual, reduzirBanner } from './bannerQueue';

/** Vibração curta: avisa sem competir com a do alerta de oferta (600 ms). */
const VIBRACAO_MS = 80;

/**
 * Banner in-app das notificações da central. Enquanto o push do sistema não toca (o build
 * Android não tem FCM), este é o aviso confiável com o app aberto.
 *
 * A fonte é SÓ o evento `notification` do WebSocket `/notifications` — que o gateway emite ao
 * vivo para `user:<sub>` e não reenvia na conexão. A lista REST (carga inicial, refetch) nunca
 * passa por aqui, então abrir o app com notificações antigas não dispara banner.
 *
 * Montado DENTRO do OfferAlertProvider: a oferta tem prioridade. Enquanto o alerta dela estiver
 * na tela o banner não é desenhado; a fila continua acumulando e ele aparece quando a oferta fecha.
 */
export function NotificationBannerProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const caminhoAtual = useRef(pathname);
    useEffect(() => {
        caminhoAtual.current = pathname;
    }, [pathname]);

    const { alertaVisivel } = useOfferAlert();
    const { top } = useAppSafeArea();
    const { markAsRead } = useMarkNotificationAsRead();
    const [estado, dispatch] = useReducer(reduzirBanner, ESTADO_INICIAL_BANNER);

    const onNotification = useCallback((notificacao: NotificationResponse) => {
        dispatch({
            tipo: 'recebida',
            notificacao,
            contexto: { caminhoAtual: caminhoAtual.current, agora: Date.now() },
        });
    }, []);

    // Este hook existia sem ninguém montar: montá-lo aqui também faz a aba Notificações
    // (e o contador de não lidas) se atualizar ao vivo, pela invalidação que ele já faz.
    useNotificationWebSocket({ onNotification });

    const atual = estado.atual;
    const visivel = !!atual && !alertaVisivel;
    const idExibido = visivel ? atual.id : null;

    useEffect(() => {
        if (!idExibido || !atual) return;
        Vibration.vibrate(VIBRACAO_MS);
        AccessibilityInfo.announceForAccessibility(`Nova notificação: ${atual.title}. ${atual.description ?? ''}`);
        // Só na troca do que está na tela: `atual` muda junto com o id.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idExibido]);

    // O motorista foi sozinho para onde o banner levaria (abriu a conversa pela lista, por
    // exemplo): o aviso cumpriu o papel e sai.
    useEffect(() => {
        if (atual && destinoEhTelaAtual(atual, pathname)) dispatch({ tipo: 'dispensada' });
    }, [atual, pathname]);

    const dispensar = useCallback(() => dispatch({ tipo: 'dispensada' }), []);

    // Mesmo efeito de tocar no item da aba: marca como lida (se não lida) e abre o destino.
    const abrir = useCallback(() => {
        if (!atual) return;
        dispatch({ tipo: 'dispensada' });
        if (atual.status === NotificationStatus.UNREAD) markAsRead(atual.id);
        try {
            abrirDestinoDaNotificacao(resolverDestinoDaNotificacao(atual));
        } catch (error) {
            console.error('[NotificationBanner] Erro ao navegar:', error);
        }
    }, [atual, markAsRead]);

    return (
        <>
            {children}
            {visivel && (
                <NotificationBanner
                    notificacao={atual}
                    novas={estado.novas}
                    topo={top}
                    onAbrir={abrir}
                    onDispensar={dispensar}
                />
            )}
        </>
    );
}
