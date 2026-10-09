/**
 * Campo só de leitura precisa parecer só de leitura: no perfil, CPF e e-mail tinham
 * `editable={false}` com o mesmo visual dos editáveis (rodada de 09/10/2026).
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';

jest.mock('react-native-webview', () => ({ WebView: () => null }));

import { Input } from '../Input';

function render(props: Partial<React.ComponentProps<typeof Input>> = {}) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <Input placeholder="CPF" value="123.456.789-09" {...props} />
            </ThemeProvider>,
        );
    });
    return tree;
}

const campo = (tree: TestRenderer.ReactTestRenderer) => tree.root.findByProps({ testID: 'input-campo' });
const corDoTexto = (tree: TestRenderer.ReactTestRenderer) => {
    const estilo = [tree.root.findAll((n) => (n.type as unknown) === 'TextInput')[0].props.style].flat(Infinity).filter(Boolean);
    return Object.assign({}, ...estilo).color;
};

it('editable={false}: fundo cinza e texto apagado', () => {
    const tree = render({ editable: false });
    expect(campo(tree).props.backgroundColor).toBe('gray100');
    expect(corDoTexto(tree)).toBe(theme.colors.gray500);
});

it('editável: sem fundo e texto normal', () => {
    const tree = render();
    expect(campo(tree).props.backgroundColor).toBeUndefined();
    expect(corDoTexto(tree)).toBe(theme.colors.gray700);
});
