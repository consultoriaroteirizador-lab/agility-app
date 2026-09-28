import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';

import { CabecalhoDasNotificacoes, rotuloDeNaoLidas } from '../CabecalhoDasNotificacoes';

jest.mock('@expo/vector-icons', () => ({ MaterialIcons: () => null }));
jest.mock('react-native-webview', () => ({ WebView: () => null }));

function render(props: Partial<React.ComponentProps<typeof CabecalhoDasNotificacoes>> = {}) {
    const onMarcarTodas = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <CabecalhoDasNotificacoes naoLidas={3} onMarcarTodas={onMarcarTodas} {...props} />
            </ThemeProvider>,
        );
    });
    const botao = tree.root.find((n) => n.props.testID === 'marcar-todas-como-lidas' && typeof n.type !== 'string');
    return { tree, botao, onMarcarTodas };
}

describe('CabecalhoDasNotificacoes', () => {
    it.each([
        [0, 'Nenhuma não lida'],
        [1, '1 não lida'],
        [277, '277 não lidas'],
    ])('rótulo com %i', (n, esperado) => {
        expect(rotuloDeNaoLidas(n)).toBe(esperado);
    });

    it('com não lidas: botão acessível e habilitado chama a ação', () => {
        const { botao, onMarcarTodas } = render({ naoLidas: 277 });
        expect(botao.props.accessibilityRole).toBe('button');
        expect(botao.props.accessibilityLabel).toBe('Marcar todas como lidas');
        expect(botao.props.disabled).toBe(false);
        act(() => botao.props.onPress());
        expect(onMarcarTodas).toHaveBeenCalledTimes(1);
    });

    it('sem não lidas: desabilitado', () => {
        const { botao } = render({ naoLidas: 0 });
        expect(botao.props.disabled).toBe(true);
        expect(botao.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    });

    it('enquanto marca: desabilitado e ocupado', () => {
        const { botao } = render({ naoLidas: 5, marcando: true });
        expect(botao.props.disabled).toBe(true);
        expect(botao.props.accessibilityState).toEqual(expect.objectContaining({ busy: true }));
    });
});
