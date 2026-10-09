/**
 * Regime de trabalho: a motorista própria só vê; o terceirizado edita (decisão de 09/10/2026).
 * Antes, a motorista CLT via as quatro opções desmarcadas e podia trocar.
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';

jest.mock('react-native-webview', () => ({ WebView: () => null }));

import PeriodSelector from '../PeriodSelector';

function render(props: Partial<React.ComponentProps<typeof PeriodSelector>> = {}) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <PeriodSelector onPeriodSelect={jest.fn()} {...props} />
            </ThemeProvider>,
        );
    });
    return tree;
}

const textos = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children as string);
const opcoes = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findAll((n) => typeof n.props.onPress === 'function');

it('somente leitura: mostra o regime da empresa, sem opções para tocar', () => {
    const tree = render({ selectedPeriod: 'CLT', somenteLeitura: true });

    expect(opcoes(tree)).toHaveLength(0);
    expect(textos(tree)).toEqual(expect.arrayContaining(['CLT', 'Definido pela empresa.']));
    expect(textos(tree)).not.toContain('PJ');
});

it('somente leitura sem regime cadastrado: diz que não foi informado', () => {
    const tree = render({ somenteLeitura: true });

    expect(opcoes(tree)).toHaveLength(0);
    expect(textos(tree)).toContain('Não informado');
});

it('editável: as quatro opções continuam tocáveis', () => {
    const tree = render({ selectedPeriod: 'PJ' });

    expect(textos(tree)).toEqual(expect.arrayContaining(['CLT', 'PJ', 'Estágio', 'Autônomo']));
    expect(opcoes(tree).length).toBeGreaterThanOrEqual(4);
});
