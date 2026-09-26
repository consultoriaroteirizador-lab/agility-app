import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import type { NotificationResponse } from '@/domain/agility/notification/dto';
import { NotificationStatus, NotificationType, UserType } from '@/domain/agility/notification/dto';
import { theme } from '@/theme';

import { ANIMACAO_BANNER_MS, DURACAO_BANNER_MS, NotificationBanner, arrasteDispensa } from '../NotificationBanner';

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

function notificacao(parcial: Partial<NotificationResponse> = {}): NotificationResponse {
    return {
        id: 'n1',
        companyId: 'c1',
        userId: 'u1',
        userType: UserType.DRIVER,
        title: 'Central',
        description: 'Sua rota mudou',
        type: NotificationType.ROUTE_REPLANNED,
        status: NotificationStatus.UNREAD,
        createdAt: '2026-09-26T12:00:00.000Z',
        updatedAt: '2026-09-26T12:00:00.000Z',
        ...parcial,
    };
}

function render(props: Partial<React.ComponentProps<typeof NotificationBanner>> = {}) {
    const onAbrir = jest.fn();
    const onDispensar = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    const elemento = (p: Partial<React.ComponentProps<typeof NotificationBanner>>) => (
        <ThemeProvider theme={theme}>
            <NotificationBanner
                notificacao={notificacao()}
                novas={0}
                topo={24}
                onAbrir={onAbrir}
                onDispensar={onDispensar}
                {...props}
                {...p}
            />
        </ThemeProvider>
    );
    act(() => {
        tree = TestRenderer.create(elemento({}));
    });
    return { tree, onAbrir, onDispensar, rerender: (p: Partial<React.ComponentProps<typeof NotificationBanner>>) => act(() => tree.update(elemento(p))) };
}

const porId = (tree: TestRenderer.ReactTestRenderer, testID: string) => tree.root.findAll((n) => n.props.testID === testID);

describe('NotificationBanner', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('mostra título e texto, sem contador quando é uma só', () => {
        const { tree } = render();
        const abrir = porId(tree, 'notification-banner-abrir')[0];
        expect(abrir.props.accessibilityLabel).toBe('Central. Sua rota mudou');
        expect(porId(tree, 'notification-banner-novas')).toHaveLength(0);
    });

    it('mostra "+N novas" quando chegaram outras por cima', () => {
        const { tree } = render({ novas: 2 });
        const chip = porId(tree, 'notification-banner-novas');
        expect(chip.length).toBeGreaterThan(0);
        expect(JSON.stringify(tree.toJSON())).toContain('novas');
    });

    it('sai sozinho depois de 5 s', () => {
        const { onDispensar } = render();
        act(() => { jest.advanceTimersByTime(DURACAO_BANNER_MS - 1); });
        expect(onDispensar).not.toHaveBeenCalled();
        act(() => { jest.advanceTimersByTime(1 + ANIMACAO_BANNER_MS + 50); });
        expect(onDispensar).toHaveBeenCalledTimes(1);
    });

    it('notificação nova por cima reinicia os 5 s', () => {
        const { onDispensar, rerender } = render();
        act(() => { jest.advanceTimersByTime(4000); });
        rerender({ notificacao: notificacao({ id: 'n2' }), novas: 1 });
        act(() => { jest.advanceTimersByTime(4000); });
        expect(onDispensar).not.toHaveBeenCalled();
        act(() => { jest.advanceTimersByTime(1000 + ANIMACAO_BANNER_MS + 50); });
        expect(onDispensar).toHaveBeenCalledTimes(1);
    });

    it('X tem rótulo acessível e dispensa uma vez só', () => {
        const { tree, onDispensar } = render();
        const fechar = porId(tree, 'notification-banner-fechar')[0];
        expect(fechar.props.accessibilityLabel).toBe('Fechar aviso');
        act(() => { fechar.props.onPress(); });
        act(() => { jest.advanceTimersByTime(ANIMACAO_BANNER_MS + 50); });
        // o relógio de 5 s não dispensa de novo
        act(() => { jest.advanceTimersByTime(DURACAO_BANNER_MS); });
        expect(onDispensar).toHaveBeenCalledTimes(1);
    });

    it('tocar no banner abre', () => {
        const { tree, onAbrir } = render();
        act(() => { porId(tree, 'notification-banner-abrir')[0].props.onPress(); });
        expect(onAbrir).toHaveBeenCalledTimes(1);
    });

    it('arrastar para cima além do limiar dispensa; pouco, volta', () => {
        expect(arrasteDispensa(-41)).toBe(true);
        expect(arrasteDispensa(-20)).toBe(false);
        expect(arrasteDispensa(30)).toBe(false);
    });
});
