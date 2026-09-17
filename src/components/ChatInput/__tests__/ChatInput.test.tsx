import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import type { ChatSendOutcome } from '@/domain/agility/chat/dto/types';
import { theme } from '@/theme';

import ChatInput from '../ChatInput';

jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-background-geolocation', () => ({
    __esModule: true,
    default: { ready: jest.fn(), onLocation: jest.fn(), removeListeners: jest.fn() },
}));
// O botão de anexo abre câmera/galeria (módulos nativos). Aqui só importa o campo de texto.
jest.mock('../../ChatAttachmentButton', () => ({ __esModule: true, default: () => null }));
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: jest.fn() }) }));

function render(onSendMessage: (c: string) => Promise<ChatSendOutcome>) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ChatInput onSendMessage={onSendMessage} onTyping={jest.fn()} />
            </ThemeProvider>,
        );
    });
    return tree;
}

// findByType(TextInput) esbarra em duas cópias divergentes de @types/react no
// node_modules (a do projeto e a que @types/react-test-renderer carrega) e não
// compila. O testID evita o problema e é o mesmo tipo de busca já usado no botão.
function findTextInput(tree: TestRenderer.ReactTestRenderer) {
    return tree.root.findByProps({ testID: 'chat-input-message' });
}

async function digitarEEnviar(tree: TestRenderer.ReactTestRenderer, texto: string) {
    act(() => {
        findTextInput(tree).props.onChangeText(texto);
    });
    await act(async () => {
        await tree.root.findAllByProps({ testID: 'chat-input-send' })[0].props.onPress();
    });
}

describe('ChatInput', () => {
    it('envio que falha devolve o texto ao campo', async () => {
        const tree = render(async () => ({ unsentText: 'oi', unsentAttachments: [], error: new Error('x') }));
        await digitarEEnviar(tree, 'oi');
        expect(findTextInput(tree).props.value).toBe('oi');
    });

    it('envio bem-sucedido limpa o campo', async () => {
        const tree = render(async () => ({ unsentText: '', unsentAttachments: [] }));
        await digitarEEnviar(tree, 'oi');
        expect(findTextInput(tree).props.value).toBe('');
    });

    it('erro inesperado (promessa rejeitada) nao apaga o texto', async () => {
        const tree = render(async () => {
            throw new Error('bug');
        });
        await digitarEEnviar(tree, 'oi');
        expect(findTextInput(tree).props.value).toBe('oi');
    });
});
