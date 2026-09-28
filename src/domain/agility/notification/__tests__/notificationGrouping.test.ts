import type { NotificationResponse } from '../dto';
import { NotificationStatus, NotificationType, UserType } from '../dto';
import {
    aplicarNoCacheDaLista,
    chaveDaNotificacao,
    contagemAgrupada,
    momentoDaNotificacao,
    tituloComContagem,
    upsertNotificacao,
} from '../notificationGrouping';

function notificacao(parcial: Partial<NotificationResponse> & Record<string, unknown> = {}): NotificationResponse {
    return {
        id: 'n1',
        companyId: 'c1',
        userId: 'u1',
        userType: UserType.DRIVER,
        title: 'Nova mensagem',
        description: 'Olá',
        type: NotificationType.CHAT_MESSAGE,
        status: NotificationStatus.UNREAD,
        createdAt: '2026-09-27T10:00:00.000Z',
        updatedAt: '2026-09-27T10:00:00.000Z',
        ...parcial,
    } as NotificationResponse;
}

describe('chaveDaNotificacao', () => {
    it('é id + updatedAt: a atualização da mesma linha vira chave nova', () => {
        const a = notificacao();
        const b = notificacao({ updatedAt: '2026-09-27T10:05:00.000Z' });
        expect(chaveDaNotificacao(a)).not.toBe(chaveDaNotificacao(b));
        expect(chaveDaNotificacao(a)).toBe(chaveDaNotificacao(notificacao()));
    });

    it('sem updatedAt (backend antigo) cai no createdAt', () => {
        const n = notificacao({ updatedAt: undefined as unknown as string });
        expect(chaveDaNotificacao(n)).toBe('n1@2026-09-27T10:00:00.000Z');
    });
});

describe('momentoDaNotificacao', () => {
    it('usa updatedAt, e createdAt quando não há updatedAt', () => {
        expect(momentoDaNotificacao(notificacao({ updatedAt: '2026-09-27T11:00:00.000Z' }))).toBe('2026-09-27T11:00:00.000Z');
        expect(momentoDaNotificacao(notificacao({ updatedAt: undefined as unknown as string }))).toBe('2026-09-27T10:00:00.000Z');
    });
});

describe('contagemAgrupada', () => {
    it('lê data.count e metadata.count', () => {
        expect(contagemAgrupada(notificacao({ data: { count: 3 } }))).toBe(3);
        expect(contagemAgrupada(notificacao({ metadata: { count: 4 } }))).toBe(4);
    });

    it('ausente, 1 ou inválido não conta como agrupada', () => {
        expect(contagemAgrupada(notificacao())).toBeNull();
        expect(contagemAgrupada(notificacao({ data: { count: 1 } }))).toBeNull();
        expect(contagemAgrupada(notificacao({ data: { count: 'x' } }))).toBeNull();
    });
});

describe('tituloComContagem', () => {
    it('acrescenta a contagem quando o título não a traz', () => {
        expect(tituloComContagem(notificacao({ title: 'Mensagens do suporte', data: { count: 3 } }))).toBe(
            'Mensagens do suporte (3)',
        );
    });

    it('não repete a contagem que o backend já pôs no título', () => {
        expect(tituloComContagem(notificacao({ title: '3 novas mensagens', data: { count: 3 } }))).toBe('3 novas mensagens');
    });

    it('não confunde 3 com 13 no título', () => {
        expect(tituloComContagem(notificacao({ title: 'Chat 13', data: { count: 3 } }))).toBe('Chat 13 (3)');
    });

    it('sem contagem devolve o título como está', () => {
        expect(tituloComContagem(notificacao())).toBe('Nova mensagem');
    });
});

describe('upsertNotificacao', () => {
    it('substitui a existente e sobe para o topo, sem duplicar', () => {
        const lista = [notificacao({ id: 'a' }), notificacao({ id: 'n1', title: 'velha' }), notificacao({ id: 'b' })];
        const nova = notificacao({ id: 'n1', title: '2 novas mensagens', updatedAt: '2026-09-27T10:05:00.000Z' });
        const resultado = upsertNotificacao(lista, nova);
        expect(resultado.map((n) => n.id)).toEqual(['n1', 'a', 'b']);
        expect(resultado[0].title).toBe('2 novas mensagens');
    });

    it('id novo entra no topo', () => {
        const resultado = upsertNotificacao([notificacao({ id: 'a' })], notificacao({ id: 'z' }));
        expect(resultado.map((n) => n.id)).toEqual(['z', 'a']);
    });

    it('mantém o status que veio no payload', () => {
        const lista = [notificacao({ id: 'n1', status: NotificationStatus.READ })];
        const resultado = upsertNotificacao(lista, notificacao({ id: 'n1', status: NotificationStatus.UNREAD }));
        expect(resultado[0].status).toBe(NotificationStatus.UNREAD);
    });

    it('não muta a lista original', () => {
        const lista = [notificacao({ id: 'a' })];
        upsertNotificacao(lista, notificacao({ id: 'z' }));
        expect(lista).toHaveLength(1);
    });
});

describe('aplicarNoCacheDaLista', () => {
    it('lista "all" (array cru): faz upsert', () => {
        const dado = [notificacao({ id: 'a' }), notificacao({ id: 'n1' })];
        const r = aplicarNoCacheDaLista(dado, notificacao({ id: 'n1', title: 'nova' }), false) as NotificationResponse[];
        expect(r.map((n) => n.id)).toEqual(['n1', 'a']);
        expect(r[0].title).toBe('nova');
    });

    it('lista "unread" (BaseResponse): faz upsert em result', () => {
        const dado = { success: true, result: [notificacao({ id: 'a' }), notificacao({ id: 'n1' })] };
        const r = aplicarNoCacheDaLista(dado, notificacao({ id: 'n1' }), true) as typeof dado;
        expect(r.success).toBe(true);
        expect(r.result.map((n) => n.id)).toEqual(['n1', 'a']);
    });

    it('lista "unread": notificação já lida sai dela', () => {
        const dado = { success: true, result: [notificacao({ id: 'a' }), notificacao({ id: 'n1' })] };
        const r = aplicarNoCacheDaLista(dado, notificacao({ id: 'n1', status: NotificationStatus.READ }), true) as typeof dado;
        expect(r.result.map((n) => n.id)).toEqual(['a']);
    });

    it('cache vazio ou de outra forma fica como está', () => {
        expect(aplicarNoCacheDaLista(undefined, notificacao(), false)).toBeUndefined();
        const outro = { unreadCount: 3 };
        expect(aplicarNoCacheDaLista(outro, notificacao(), false)).toBe(outro);
    });
});
