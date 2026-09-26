import type { NotificationResponse } from '@/domain/agility/notification/dto';
import { NotificationStatus, NotificationType, UserType } from '@/domain/agility/notification/dto';

import {
    ESTADO_INICIAL_BANNER,
    IDADE_MAXIMA_MS,
    LIMITE_VISTOS,
    avaliarNotificacao,
    destinoEhTelaAtual,
    reduzirBanner,
} from '../bannerQueue';
import type { ContextoDoBanner, EstadoDoBanner } from '../bannerQueue';

const AGORA = Date.parse('2026-09-26T12:00:00.000Z');

function notificacao(parcial: Partial<NotificationResponse> = {}): NotificationResponse {
    return {
        id: 'n1',
        companyId: 'c1',
        userId: 'u1',
        userType: UserType.DRIVER,
        title: 'Nova mensagem',
        description: 'Olá',
        type: NotificationType.CHAT_MESSAGE,
        status: NotificationStatus.UNREAD,
        metadata: { chatId: 'chat-1', params: { id: 'chat-1' } },
        linkUrl: 'suporte',
        createdAt: new Date(AGORA - 1000).toISOString(),
        updatedAt: new Date(AGORA - 1000).toISOString(),
        ...parcial,
    };
}

const contexto = (parcial: Partial<ContextoDoBanner> = {}): ContextoDoBanner => ({
    caminhoAtual: '/rotas-detalhadas/r1',
    agora: AGORA,
    ...parcial,
});

function receber(estado: EstadoDoBanner, n: NotificationResponse, ctx = contexto()) {
    return reduzirBanner(estado, { tipo: 'recebida', notificacao: n, contexto: ctx });
}

describe('avaliarNotificacao', () => {
    it('exibe mensagem de chat quando o motorista está em outra tela', () => {
        expect(avaliarNotificacao(notificacao(), new Set(), contexto())).toEqual({ exibir: true });
    });

    it('suprime mensagem do chat que está aberto', () => {
        expect(avaliarNotificacao(notificacao(), new Set(), contexto({ caminhoAtual: '/menu/suporte/chat-1' })))
            .toEqual({ exibir: false, motivo: 'tela-atual' });
    });

    it('NÃO suprime mensagem de OUTRO chat com um chat aberto', () => {
        expect(avaliarNotificacao(notificacao(), new Set(), contexto({ caminhoAtual: '/menu/suporte/chat-2' })))
            .toEqual({ exibir: true });
    });

    it('suprime pelo caminho do tipo quando o linkUrl não existe (CHAT_MESSAGE com chatId)', () => {
        const n = notificacao({ linkUrl: undefined });
        expect(avaliarNotificacao(n, new Set(), contexto({ caminhoAtual: '/menu/suporte/chat-1' })))
            .toEqual({ exibir: false, motivo: 'tela-atual' });
    });

    it('suprime mudança de rota com a própria rota aberta', () => {
        const n = notificacao({ type: NotificationType.ROUTE_REPLANNED, linkUrl: undefined, metadata: { routingId: 'r1' } });
        expect(avaliarNotificacao(n, new Set(), contexto({ caminhoAtual: '/rotas-detalhadas/r1' })))
            .toEqual({ exibir: false, motivo: 'tela-atual' });
    });

    it('suprime id repetido', () => {
        expect(avaliarNotificacao(notificacao(), new Set(['n1']), contexto())).toEqual({ exibir: false, motivo: 'duplicada' });
    });

    it('suprime notificação já lida', () => {
        expect(avaliarNotificacao(notificacao({ status: NotificationStatus.READ }), new Set(), contexto()))
            .toEqual({ exibir: false, motivo: 'lida' });
    });

    it('suprime notificação antiga (reenvio), com folga para relógio do aparelho', () => {
        const velha = notificacao({ createdAt: new Date(AGORA - IDADE_MAXIMA_MS - 1).toISOString() });
        expect(avaliarNotificacao(velha, new Set(), contexto())).toEqual({ exibir: false, motivo: 'antiga' });
        const noLimite = notificacao({ createdAt: new Date(AGORA - IDADE_MAXIMA_MS + 1000).toISOString() });
        expect(avaliarNotificacao(noLimite, new Set(), contexto())).toEqual({ exibir: true });
    });

    it('createdAt ilegível não bloqueia', () => {
        expect(avaliarNotificacao(notificacao({ createdAt: 'lixo' }), new Set(), contexto())).toEqual({ exibir: true });
    });

    it('oferta de rota fica com o alerta de oferta, não com o banner', () => {
        const n = notificacao({ type: NotificationType.ROUTE_OFFER, linkUrl: undefined, metadata: { routingId: 'r9' } });
        expect(avaliarNotificacao(n, new Set(), contexto())).toEqual({ exibir: false, motivo: 'oferta' });
    });

    it('sem id é inválida', () => {
        expect(avaliarNotificacao(notificacao({ id: '' }), new Set(), contexto())).toEqual({ exibir: false, motivo: 'invalida' });
    });
});

describe('reduzirBanner', () => {
    it('primeira notificação vira a atual sem contador', () => {
        const estado = receber(ESTADO_INICIAL_BANNER, notificacao());
        expect(estado.atual?.id).toBe('n1');
        expect(estado.novas).toBe(0);
    });

    it('duas seguidas: mostra a mais nova e conta +1', () => {
        let estado = receber(ESTADO_INICIAL_BANNER, notificacao({ id: 'a' }));
        estado = receber(estado, notificacao({ id: 'b', title: 'Segunda' }));
        expect(estado.atual?.id).toBe('b');
        expect(estado.novas).toBe(1);
        estado = receber(estado, notificacao({ id: 'c' }));
        expect(estado.novas).toBe(2);
    });

    it('id repetido não mexe no estado', () => {
        const estado = receber(ESTADO_INICIAL_BANNER, notificacao());
        expect(receber(estado, notificacao())).toBe(estado);
    });

    it('suprimida pela tela atual não aparece nem depois (fica como vista)', () => {
        let estado = receber(ESTADO_INICIAL_BANNER, notificacao(), contexto({ caminhoAtual: '/menu/suporte/chat-1' }));
        expect(estado.atual).toBeNull();
        estado = receber(estado, notificacao());
        expect(estado.atual).toBeNull();
    });

    it('suprimida não zera o banner que já está na tela', () => {
        let estado = receber(ESTADO_INICIAL_BANNER, notificacao({ id: 'a', metadata: { chatId: 'outro' } }));
        estado = receber(estado, notificacao({ id: 'b' }), contexto({ caminhoAtual: '/menu/suporte/chat-1' }));
        expect(estado.atual?.id).toBe('a');
        expect(estado.novas).toBe(0);
    });

    it('dispensar limpa a atual e o contador; a próxima começa do zero', () => {
        let estado = receber(ESTADO_INICIAL_BANNER, notificacao({ id: 'a' }));
        estado = receber(estado, notificacao({ id: 'b' }));
        estado = reduzirBanner(estado, { tipo: 'dispensada' });
        expect(estado.atual).toBeNull();
        expect(estado.novas).toBe(0);
        estado = receber(estado, notificacao({ id: 'c' }));
        expect(estado.novas).toBe(0);
        // e o id já dispensado não volta
        expect(receber(estado, notificacao({ id: 'a' }))).toBe(estado);
    });

    it('a memória de ids é limitada', () => {
        let estado = ESTADO_INICIAL_BANNER;
        for (let i = 0; i < LIMITE_VISTOS + 10; i++) {
            estado = receber(estado, notificacao({ id: `id-${i}` }));
        }
        expect(estado.vistos).toHaveLength(LIMITE_VISTOS);
        expect(estado.vistos[estado.vistos.length - 1]).toBe(`id-${LIMITE_VISTOS + 9}`);
    });
});

describe('destinoEhTelaAtual', () => {
    it('compara o destino com o pathname, ignorando grupos do expo-router', () => {
        expect(destinoEhTelaAtual(notificacao(), '/menu/suporte/chat-1')).toBe(true);
        expect(destinoEhTelaAtual(notificacao(), '/(auth)/(tabs)/menu/suporte/chat-1')).toBe(true);
        expect(destinoEhTelaAtual(notificacao(), '/menu/suporte')).toBe(false);
    });

    it('notificação sem destino nunca está na tela atual', () => {
        const semDestino = notificacao({ type: NotificationType.SYSTEM_ALERT, linkUrl: undefined, metadata: undefined });
        expect(destinoEhTelaAtual(semDestino, '/')).toBe(false);
    });
});
