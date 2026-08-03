/**
 * Regressoes da tela de login.
 *
 * Bug 1 — "nao da pra adicionar conta": o card de contas salvas herdou o estilo
 * da tela antiga (fundo escuro) e desenha titulo e a acao de adicionar conta em
 * branco. Sobre o fundo branco atual, a unica coisa visivel no card e o X de
 * remover — por isso o usuario precisa apagar a conta atual pra cadastrar outra.
 *
 * Bug 2 — "erro no login apaga tudo": a tela troca a arvore inteira pelo spinner
 * enquanto o signIn roda, desmontando o formulario. Quando a senha esta errada o
 * form remonta zerado (empresa e usuario digitados somem).
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';

import { MultipleAccounts } from '../_components/MultipleAccounts';

// --- Mocks de leaf ----------------------------------------------------------
// O barrel de @/components arrasta o WebView (modulo nativo) so pelo import.
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-background-geolocation', () => ({
  __esModule: true,
  default: { ready: jest.fn(), onLocation: jest.fn(), removeListeners: jest.fn() },
}));

jest.mock('@/hooks', () => ({
  useImageBackground: () => null,
  useNavigationNotActionOnBack: () => { },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useAppTheme: () => require('@/theme').theme,
}));

let mockController: any;
jest.mock('../_hooks/useLoginController', () => ({
  useLoginController: () => mockController,
}));

const mockBodyMounts = jest.fn();
jest.mock('../_components/LoginBody', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactLocal = require('react');
  return {
    LoginBody: () => {
      ReactLocal.useEffect(() => {
        mockBodyMounts();
      }, []);
      return null;
    },
  };
});

jest.mock('../_components/LoginFooter', () => ({ LoginFooter: () => null }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Login = require('../index').default;

function renderWithTheme(node: React.ReactElement) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <ThemeProvider theme={theme}>{node}</ThemeProvider>,
    );
  });
  return renderer!;
}

function flattenColor(style: unknown): string | undefined {
  const flat = Array.isArray(style)
    ? Object.assign({}, ...style.flat(Infinity).filter(Boolean))
    : (style as Record<string, unknown> | undefined);
  return flat?.color as string | undefined;
}

/** Cor efetivamente renderizada pelo <Text> nativo que contem `label`. */
function colorOfText(renderer: TestRenderer.ReactTestRenderer, label: string) {
  const nodes = renderer.root.findAll(
    (n) => typeof n.type === 'string' && n.props.children === label,
    { deep: true },
  );
  expect(nodes.length).toBeGreaterThan(0);
  return flattenColor(nodes[0].props.style);
}

describe('Bug 1 — card de contas salvas', () => {
  const list = [
    { username: 'joao@empresa.com', name: 'Joao', password: '123', allowsBiometrics: false },
  ] as any[];

  it('oferece uma acao de adicionar conta legivel sobre o fundo branco', () => {
    const onNewAccount = jest.fn();
    const renderer = renderWithTheme(
      <MultipleAccounts
        list={list}
        selectUser={jest.fn()}
        removeUser={jest.fn()}
        onNewAccount={onNewAccount}
        onCancel={jest.fn()}
      />,
    );

    // A acao existe...
    const action = renderer.root.findAll(
      (n) =>
        typeof n.type === 'string' &&
        typeof n.props.children === 'string' &&
        /adicionar|outra conta/i.test(n.props.children),
      { deep: true },
    );
    expect(action.length).toBeGreaterThan(0);

    // ...e nao pode ser branca sobre branco.
    expect(flattenColor(action[0].props.style)).not.toBe(theme.colors.white);
  });

  it('deixa sair da lista sem precisar escolher ou remover uma conta', () => {
    const onCancel = jest.fn();
    const renderer = renderWithTheme(
      <MultipleAccounts
        list={list}
        selectUser={jest.fn()}
        removeUser={jest.fn()}
        onNewAccount={jest.fn()}
        onCancel={onCancel}
      />,
    );

    const back = renderer.root.findAll(
      (n) =>
        typeof n.type === 'string' &&
        typeof n.props.children === 'string' &&
        /voltar|cancelar/i.test(n.props.children),
      { deep: true },
    );
    expect(back.length).toBeGreaterThan(0);
    expect(flattenColor(back[0].props.style)).not.toBe(theme.colors.white);

    // O texto e filho do TouchableOpacity que dispara a acao.
    const touchable = renderer.root.find(
      (n) => typeof n.type !== 'string' && n.props.onPress === onCancel,
    );
    act(() => {
      touchable.props.onPress();
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('mostra o titulo do card em cor legivel', () => {
    const renderer = renderWithTheme(
      <MultipleAccounts
        list={list}
        selectUser={jest.fn()}
        removeUser={jest.fn()}
        onNewAccount={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(colorOfText(renderer, 'Qual conta deseja acessar?')).not.toBe(
      theme.colors.white,
    );
  });
});

describe('Bug 2 — erro de login nao pode zerar o formulario', () => {
  beforeEach(() => {
    mockBodyMounts.mockClear();
    mockController = {
      isLoadingCredentials: false,
      isLoadingSignIn: false,
    };
  });

  it('mantem o formulario montado durante o signIn (e depois do erro)', () => {
    const renderer = renderWithTheme(<Login />);
    expect(mockBodyMounts).toHaveBeenCalledTimes(1);

    // signIn em andamento
    mockController = { isLoadingCredentials: false, isLoadingSignIn: true };
    act(() => {
      renderer.update(
        <ThemeProvider theme={theme}>
          <Login />
        </ThemeProvider>,
      );
    });

    // senha errada -> volta pro formulario
    mockController = { isLoadingCredentials: false, isLoadingSignIn: false };
    act(() => {
      renderer.update(
        <ThemeProvider theme={theme}>
          <Login />
        </ThemeProvider>,
      );
    });

    // Se o form tivesse sido desmontado, ele remontaria zerado.
    expect(mockBodyMounts).toHaveBeenCalledTimes(1);
  });
});
