import React from 'react';
import { AccessibilityInfo, Text, Vibration } from 'react-native';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import type { NotificationResponse } from '@/domain/agility/notification/dto';
import { NotificationStatus, NotificationType, UserType } from '@/domain/agility/notification/dto';
import { theme } from '@/theme';

import { NotificationBannerProvider } from '../NotificationBannerProvider';

jest.mock('@expo/vector-icons', () => ({ MaterialIcons: () => null }));
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-background-geolocation', () => ({
    __esModule: true,
    default: { ready: jest.fn(), onLocation: jest.fn(), removeListeners: jest.fn() },
}));

let mockPathname = '/';
jest.mock('expo-router', () => ({ usePathname: () => mockPathname }));

let mockAlertaVisivel = false;
jest.mock('@/services/offer/OfferAlertProvider', () => ({
    useOfferAlert: () => ({ pushOffer: jest.fn(), alertaVisivel: mockAlertaVisivel }),
}));

let mockOnNotification: ((n: NotificationResponse) => void) | undefined;
jest.mock('@/domain/agility/notification/useCase/useNotificationWebSocket', () => ({
    useNotificationWebSocket: (opts: { onNotification?: (n: NotificationResponse) => void }) => {
        mockOnNotification = opts.onNotification;
        return { isConnected: true, connect: jest.fn(), disconnect: jest.fn() };
    },
}));

const mockMarkAsRead = jest.fn();
jest.mock('@/domain/agility/notification/useCase/useMarkNotificationAsRead', () => ({
    useMarkNotificationAsRead: () => ({ markAsRead: mockMarkAsRead }),
}));

const mockAbrirDestino = jest.fn();
jest.mock('@/services/notification/notificationRoutes', () => ({
    abrirDestinoDaNotificacao: (d: unknown) => mockAbrirDestino(d),
}));

jest.mock('@/hooks/useAppSafeArea', () => ({ useAppSafeArea: () => ({ top: 24, bottom: 20 }) }));

function notificacao(parcial: Partial<NotificationResponse> = {}): NotificationResponse {
    const agora = new Date().toISOString();
    return {
        id: 'n1',
        companyId: 'c1',
        userId: 'u1',
        userType: UserType.DRIVER,
        title: 'Operador',
        description: 'Tudo certo?',
        type: NotificationType.CHAT_MESSAGE,
        status: NotificationStatus.UNREAD,
        linkUrl: 'suporte',
        metadata: { chatId: 'chat-1', params: { id: 'chat-1' } },
        createdAt: agora,
        updatedAt: agora,
        ...parcial,
    };
}

function montar() {
    let tree!: TestRenderer.ReactTestRenderer;
    const elemento = () => (
        <ThemeProvider theme={theme}>
            <NotificationBannerProvider>
                <Text>app</Text>
            </NotificationBannerProvider>
        </ThemeProvider>
    );
    act(() => {
        tree = TestRenderer.create(elemento());
    });
    return { tree, rerender: () => act(() => tree.update(elemento())) };
}

const banner = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findAll((n) => n.props.testID === 'notification-banner-abrir');

function chegar(n: NotificationResponse) {
    act(() => {
        mockOnNotification?.(n);
    });
}

describe('NotificationBannerProvider', () => {
    let vibrar: jest.SpyInstance;
    let anunciar: jest.SpyInstance;

    beforeEach(() => {
        jest.useFakeTimers();
        mockPathname = '/';
        mockAlertaVisivel = false;
        mockMarkAsRead.mockClear();
        mockAbrirDestino.mockClear();
        vibrar = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
        anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.useRealTimers();
        vibrar.mockRestore();
        anunciar.mockRestore();
    });

    it('mensagem de chat em outra tela: mostra, vibra e anuncia', () => {
        const { tree } = montar();
        expect(banner(tree)).toHaveLength(0);
        chegar(notificacao());
        expect(banner(tree).length).toBeGreaterThan(0);
        expect(vibrar).toHaveBeenCalledTimes(1);
        expect(anunciar).toHaveBeenCalledWith('Nova notificação: Operador. Tudo certo?');
    });

    it('mensagem do chat que está aberto não mostra nada', () => {
        mockPathname = '/menu/suporte/chat-1';
        const { tree } = montar();
        chegar(notificacao());
        expect(banner(tree)).toHaveLength(0);
        expect(vibrar).not.toHaveBeenCalled();
    });

    it('com o alerta de oferta na tela, espera; quando a oferta fecha, aparece', () => {
        mockAlertaVisivel = true;
        const { tree, rerender } = montar();
        chegar(notificacao());
        expect(banner(tree)).toHaveLength(0);
        expect(vibrar).not.toHaveBeenCalled();

        mockAlertaVisivel = false;
        rerender();
        expect(banner(tree).length).toBeGreaterThan(0);
        expect(vibrar).toHaveBeenCalledTimes(1);
    });

    it('tocar: marca como lida, abre o destino da aba e some', () => {
        const { tree } = montar();
        chegar(notificacao());
        act(() => {
            banner(tree)[0].props.onPress();
        });
        expect(mockMarkAsRead).toHaveBeenCalledWith('n1');
        expect(mockAbrirDestino).toHaveBeenCalledWith({ tipo: 'caminho', caminho: '/menu/suporte/chat-1' });
        expect(banner(tree)).toHaveLength(0);
    });

    it('o motorista abre sozinho a conversa do banner: o banner sai', () => {
        const { tree, rerender } = montar();
        chegar(notificacao());
        mockPathname = '/menu/suporte/chat-1';
        rerender();
        expect(banner(tree)).toHaveLength(0);
    });
});
