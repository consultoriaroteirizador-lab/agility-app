/**
 * Troca de equipamento na tela de atendimento (fase 3D): escolha da linha, consulta do código ao sair
 * do campo, validação, envio, toast, e as duas armadilhas da rede lenta (consulta atrasada e toque duplo).
 */
import React from 'react';
import { Modal } from 'react-native';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { Toast } from '@/components/Toast/Toast';
import type { ServiceLine } from '@/domain/agility/service/dto/response/service-line.response';
import { theme } from '@/theme';

jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-background-geolocation', () => ({
    __esModule: true,
    default: { ready: jest.fn(), onLocation: jest.fn(), removeListeners: jest.fn() },
}));
jest.mock('@/components/Icon/LocalIcon', () => ({ LocalIcon: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
// O teste lê e chama as props: o Input real arrasta máscara e teclado.
jest.mock('@/components/Input/Input', () => ({ Input: () => null }));
jest.mock('@/hooks/useAppSafeArea', () => ({ useAppSafeArea: () => ({ top: 20, bottom: 20 }) }));
// O teste só precisa achar o Toast na árvore: o real lê o store e anima.
jest.mock('@/components/Toast/Toast', () => ({ Toast: function ToastDoApp() { return null; } }));

const mockShowToast = jest.fn();
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: mockShowToast }) }));
const mockSwap = jest.fn();
jest.mock('@/domain/agility/service/useCase/useSwapLine', () => ({
    useSwapLine: () => ({ swapLineAsync: mockSwap, isLoading: false }),
}));
const mockLookup = jest.fn();
jest.mock('@/domain/agility/service/serviceService', () => ({
    serviceService: { lookupEquipment: (...a: unknown[]) => mockLookup(...a) },
}));

import { SWAP_FALLBACK_MESSAGE, SWAP_SUCCESS_MESSAGE, TrocarEquipamentoModal } from '../TrocarEquipamentoModal';

type Arvore = TestRenderer.ReactTestRenderer;

const linha = (over: Partial<ServiceLine>): ServiceLine =>
    ({ id: 'l', material: 'Item', quantity: 1, status: 'CHECKED', createdAt: '', updatedAt: '', ...over }) as ServiceLine;
const A = linha({ id: 'a', material: 'MODEM A', serialNumber: 'SN-A' });
const ROTEADOR = linha({ id: 'r', material: 'ROTEADOR', serialNumber: 'SN-R' });
const PENDENTE = linha({ id: 'p', material: 'CABO', status: 'PENDING' });
const ACHADO = { success: true, result: { found: true, code: 'MOD-NOVO', name: 'MODEM NOVO', unit: 'un' } };
const NAO_ACHADO = { success: true, result: { found: false, code: 'LIVRE-1' } };

const onClose = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

function render(lines: ServiceLine[]): Arvore {
    let tree!: Arvore;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <TrocarEquipamentoModal visible serviceId="s1" lines={lines} onClose={onClose} />
            </ThemeProvider>,
        );
    });
    return tree;
}

const campo = (t: Arvore, title: string) =>
    t.root.findAll((n) => n.props.title === title && typeof n.props.onChangeText === 'function')[0];
const botao = (t: Arvore, title: string) =>
    t.root.findAll((n) => n.props.title === title && typeof n.props.onPress === 'function')[0];
const temTexto = (t: Arvore, s: string) => t.root.findAll((n) => n.props.children === s).length > 0;

function digitar(t: Arvore, title: string, valor: string) {
    act(() => {
        campo(t, title).props.onChangeText(valor);
    });
}

async function sairDoCodigo(t: Arvore) {
    await act(async () => {
        await campo(t, 'Código *').props.onBlur();
    });
}

async function registrar(t: Arvore) {
    await act(async () => {
        await botao(t, 'Registrar troca').props.onPress();
    });
}

describe('TrocarEquipamentoModal (fase 3D)', () => {
    it('com uma só trocável, abre direto no formulário', () => {
        const t = render([A, PENDENTE]);

        expect(campo(t, 'Código *')).toBeDefined();
        expect(temTexto(t, 'Qual equipamento você vai trocar?')).toBe(false);
        expect(temTexto(t, 'MODEM A')).toBe(true);
    });

    it('com duas, pergunta qual sai; a escolhida vai para o formulário', () => {
        const t = render([A, ROTEADOR]);
        expect(temTexto(t, 'Qual equipamento você vai trocar?')).toBe(true);
        expect(campo(t, 'Código *')).toBeUndefined();

        const opcao = t.root.findAll(
            (n) => typeof n.props.onPress === 'function' && n.findAll((c) => c.props.children === 'ROTEADOR').length > 0,
        )[0];
        act(() => {
            opcao.props.onPress();
        });

        expect(campo(t, 'Código *')).toBeDefined();
        expect(temTexto(t, 'S/N: SN-R')).toBe(true);
    });

    it('ao sair do Código, consulta o código aparado e mostra o nome do cadastro', async () => {
        mockLookup.mockResolvedValue(ACHADO);
        const t = render([A]);

        digitar(t, 'Código *', ' MOD-NOVO ');
        await sairDoCodigo(t);

        expect(mockLookup).toHaveBeenCalledWith('s1', 'MOD-NOVO');
        expect(temTexto(t, '✓ MODEM NOVO')).toBe(true);
        expect(campo(t, 'Descrição *')).toBeUndefined();
    });

    it('código fora do cadastro: avisa e abre a Descrição', async () => {
        mockLookup.mockResolvedValue(NAO_ACHADO);
        const t = render([A]);

        digitar(t, 'Código *', 'LIVRE-1');
        await sairDoCodigo(t);

        expect(temTexto(t, 'Código não cadastrado: informe a descrição')).toBe(true);
        expect(campo(t, 'Descrição *')).toBeDefined();
    });

    it('Registrar troca: manda o corpo aparado, avisa "Troca registrada" e fecha', async () => {
        mockLookup.mockResolvedValue(ACHADO);
        mockSwap.mockResolvedValue({ success: true, result: { replaced: { id: 'a' }, installed: { id: 'b' } } });
        const t = render([A]);

        digitar(t, 'Código *', 'MOD-NOVO');
        digitar(t, 'Nº de série *', ' SN-B ');
        digitar(t, 'Motivo', ' não ligava ');
        await sairDoCodigo(t);
        await registrar(t);

        expect(mockSwap).toHaveBeenCalledWith({
            serviceId: 's1', lineId: 'a', data: { code: 'MOD-NOVO', serialNumber: 'SN-B', reason: 'não ligava' },
        });
        expect(mockShowToast).toHaveBeenCalledWith({ message: SWAP_SUCCESS_MESSAGE, type: 'success' });
        expect(SWAP_SUCCESS_MESSAGE).toBe('Troca registrada');
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('falha: o toast traz a mensagem do backend e o formulário continua preenchido', async () => {
        mockLookup.mockResolvedValue(ACHADO);
        mockSwap.mockRejectedValue({ success: false, error: { message: 'A linha já foi trocada', code: 'BAD_REQUEST' } });
        const t = render([A]);

        digitar(t, 'Código *', 'MOD-NOVO');
        digitar(t, 'Nº de série *', 'SN-B');
        await sairDoCodigo(t);
        await registrar(t);

        expect(mockShowToast).toHaveBeenCalledWith({ message: 'A linha já foi trocada', type: 'error' });
        expect(onClose).not.toHaveBeenCalled();
        expect(campo(t, 'Código *').props.value).toBe('MOD-NOVO');
        expect(campo(t, 'Nº de série *').props.value).toBe('SN-B');
    });

    // O <Toast /> da raiz (`_layout.tsx`) fica atrás do Modal nativo (Dialog no Android, VC
    // apresentado no iOS): sem um Toast dentro do Modal, toda falha da troca era muda.
    it('o toast aparece por cima do modal: há um <Toast /> dentro do Modal enquanto ele está aberto', () => {
        const t = render([A]);

        expect(t.root.findByType(Modal).findAllByType(Toast)).toHaveLength(1);

        atualizar(t, false, [A]);
        expect(t.root.findAllByType(Toast)).toHaveLength(0);
    });

    it('falha sem mensagem útil: o texto padrão', async () => {
        mockLookup.mockResolvedValue(ACHADO);
        mockSwap.mockRejectedValue({ success: false, error: { message: 'Erro desconhecido', code: 'N/A' } });
        const t = render([A]);

        digitar(t, 'Código *', 'MOD-NOVO');
        digitar(t, 'Nº de série *', 'SN-B');
        await sairDoCodigo(t);
        await registrar(t);

        expect(mockShowToast).toHaveBeenCalledWith({ message: SWAP_FALLBACK_MESSAGE, type: 'error' });
        expect(SWAP_FALLBACK_MESSAGE).toBe('Não foi possível registrar a troca. Tente de novo.');
    });

    it('campos vazios: não envia e mostra os erros', async () => {
        const t = render([A]);

        await registrar(t);

        expect(mockSwap).not.toHaveBeenCalled();
        expect(campo(t, 'Código *').props.messageError).toBe('Informe o código');
        expect(campo(t, 'Nº de série *').props.messageError).toBe('Informe o nº de série');
    });

    it('Registrar sem ter saído do Código: consulta antes e, fora do cadastro, pede a descrição em vez de enviar', async () => {
        mockLookup.mockResolvedValue(NAO_ACHADO);
        const t = render([A]);

        digitar(t, 'Código *', 'LIVRE-1');
        digitar(t, 'Nº de série *', 'SN-B');
        await registrar(t);

        expect(mockLookup).toHaveBeenCalledWith('s1', 'LIVRE-1');
        expect(mockSwap).not.toHaveBeenCalled();
        expect(campo(t, 'Descrição *')).toBeDefined();
    });

    // Review Focus 3: rede lenta; o motorista muda o código antes da primeira resposta.
    it('a resposta de uma consulta antiga não vale para o código novo', async () => {
        let responderVelha!: (v: unknown) => void;
        mockLookup
            .mockReturnValueOnce(new Promise((r) => { responderVelha = r; }))
            .mockResolvedValueOnce(ACHADO);
        const t = render([A]);

        digitar(t, 'Código *', 'LIVRE-1');
        act(() => {
            void campo(t, 'Código *').props.onBlur();
        });
        digitar(t, 'Código *', 'MOD-NOVO');
        await sairDoCodigo(t);
        await act(async () => {
            responderVelha(NAO_ACHADO);
        });

        expect(temTexto(t, '✓ MODEM NOVO')).toBe(true);
        expect(temTexto(t, 'Código não cadastrado: informe a descrição')).toBe(false);
        expect(campo(t, 'Descrição *')).toBeUndefined();

        digitar(t, 'Código *', 'MOD-NOVO-2');
        expect(temTexto(t, '✓ MODEM NOVO')).toBe(false);
    });

    // Review Focus 4: toque duplo com a rede lenta.
    it('toque duplo em Registrar troca: um POST só', async () => {
        mockLookup.mockResolvedValue(ACHADO);
        let responder!: (v: unknown) => void;
        mockSwap.mockReturnValue(new Promise((r) => { responder = r; }));
        const t = render([A]);

        digitar(t, 'Código *', 'MOD-NOVO');
        digitar(t, 'Nº de série *', 'SN-B');
        await sairDoCodigo(t);

        const tocar = botao(t, 'Registrar troca').props.onPress;
        let primeiro!: Promise<unknown>;
        let segundo!: Promise<unknown>;
        await act(async () => {
            primeiro = tocar();
            segundo = tocar();
        });
        expect(mockSwap).toHaveBeenCalledTimes(1);

        await act(async () => {
            responder({ success: true, result: {} });
            await primeiro;
            await segundo;
        });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    function escolher(t: Arvore, material: string) {
        const opcao = t.root.findAll(
            (n) => typeof n.props.onPress === 'function' && n.findAll((c) => c.props.children === material).length > 0,
        )[0];
        act(() => {
            opcao.props.onPress();
        });
    }

    function atualizar(t: Arvore, visible: boolean, lines: ServiceLine[]) {
        act(() => {
            t.update(
                <ThemeProvider theme={theme}>
                    <TrocarEquipamentoModal visible={visible} serviceId="s1" lines={lines} onClose={onClose} />
                </ThemeProvider>,
            );
        });
    }

    it('fechar e abrir de novo: o formulário volta vazio e a escolha da linha volta à lista', async () => {
        mockLookup.mockResolvedValue(ACHADO);
        const t = render([A, ROTEADOR]);
        escolher(t, 'ROTEADOR');
        digitar(t, 'Código *', 'MOD-NOVO');
        digitar(t, 'Nº de série *', 'SN-B');
        await sairDoCodigo(t);
        expect(temTexto(t, '✓ MODEM NOVO')).toBe(true);

        atualizar(t, false, [A, ROTEADOR]);
        expect(campo(t, 'Código *')).toBeUndefined();
        atualizar(t, true, [A, ROTEADOR]);

        expect(temTexto(t, 'Qual equipamento você vai trocar?')).toBe(true);
        escolher(t, 'ROTEADOR');
        expect(campo(t, 'Código *').props.value).toBe('');
        expect(campo(t, 'Nº de série *').props.value).toBe('');
        expect(temTexto(t, '✓ MODEM NOVO')).toBe(false);
    });

    it('com duas trocáveis, a troca vai para a linha escolhida (não para a primeira)', async () => {
        mockLookup.mockResolvedValue(ACHADO);
        mockSwap.mockResolvedValue({ success: true, result: {} });
        const t = render([A, ROTEADOR]);
        escolher(t, 'ROTEADOR');

        digitar(t, 'Código *', 'MOD-NOVO');
        digitar(t, 'Nº de série *', 'SN-B');
        await sairDoCodigo(t);
        await registrar(t);

        expect(mockSwap).toHaveBeenCalledTimes(1);
        expect(mockSwap.mock.calls[0][0].lineId).toBe('r');
    });

    // Troca fantasma B→C: o POST da A→B dá timeout depois de o servidor gravar; o recarregamento traz
    // a A trocada e a B "Levei", e a única trocável passa a ser a B. Com a linha recalculada a cada
    // render, o formulário (ainda preenchido) passava a mirar a B, e o novo toque trocava a B.
    it('linhas mudam com o modal aberto: o alvo não passa para a B', async () => {
        mockLookup.mockResolvedValue(ACHADO);
        mockSwap.mockResolvedValue({ success: true, result: {} });
        const t = render([A]);
        digitar(t, 'Código *', 'MOD-NOVO');
        digitar(t, 'Nº de série *', 'SN-B');
        await sairDoCodigo(t);

        const B = linha({ id: 'b', material: 'MODEM NOVO', serialNumber: 'SN-B', replacesMaterialId: 'a' });
        atualizar(t, true, [{ ...A, status: 'SWAPPED' }, B]);

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(botao(t, 'Registrar troca')).toBeUndefined();
        expect(temTexto(t, 'Qual equipamento você vai trocar?')).toBe(false);
        expect(mockSwap).not.toHaveBeenCalled();
    });

    const botaoFechar = (t: Arvore) =>
        t.root.findAll((n) => typeof n.props.onPress === 'function' && n.findAll((c) => c.props.children === '✕').length > 0)[0];

    // "Cancelar" já respeitava a trava; o ✕ e o voltar do Android fechavam com o POST em voo.
    it('com o POST em voo, ✕ e o voltar do Android não fecham; depois da falha, o ✕ fecha', async () => {
        mockLookup.mockResolvedValue(ACHADO);
        let rejeitar!: (e: unknown) => void;
        mockSwap.mockReturnValueOnce(new Promise((_, r) => { rejeitar = r; }));
        const t = render([A]);
        digitar(t, 'Código *', 'MOD-NOVO');
        digitar(t, 'Nº de série *', 'SN-B');
        await sairDoCodigo(t);

        let envio!: Promise<unknown>;
        await act(async () => {
            envio = botao(t, 'Registrar troca').props.onPress();
        });
        expect(mockSwap).toHaveBeenCalledTimes(1);

        act(() => {
            botaoFechar(t).props.onPress();
        });
        act(() => {
            t.root.findByType(Modal).props.onRequestClose();
        });
        expect(onClose).not.toHaveBeenCalled();

        await act(async () => {
            rejeitar({ success: false, error: { message: 'Instável', code: 'BAD_REQUEST' } });
            await envio;
        });
        act(() => {
            botaoFechar(t).props.onPress();
        });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('com o POST em voo, Registrar troca mostra o carregando; depois da resposta, volta ao texto', async () => {
        mockLookup.mockResolvedValue(ACHADO);
        let rejeitar!: (e: unknown) => void;
        mockSwap.mockReturnValueOnce(new Promise((_, r) => { rejeitar = r; }));
        const t = render([A]);
        digitar(t, 'Código *', 'MOD-NOVO');
        digitar(t, 'Nº de série *', 'SN-B');
        await sairDoCodigo(t);
        expect(botao(t, 'Registrar troca').props.isLoading).toBe(false);

        let envio!: Promise<unknown>;
        await act(async () => {
            envio = botao(t, 'Registrar troca').props.onPress();
        });
        expect(botao(t, 'Registrar troca').props.isLoading).toBe(true);

        await act(async () => {
            rejeitar({ success: false, error: { message: 'Instável', code: 'BAD_REQUEST' } });
            await envio;
        });
        expect(botao(t, 'Registrar troca').props.isLoading).toBe(false);
    });

    it('outra linha muda com o modal aberto: a escolhida segue no formulário e o modal não fecha', () => {
        const t = render([A, ROTEADOR]);
        escolher(t, 'ROTEADOR');
        digitar(t, 'Código *', 'MOD-NOVO');

        atualizar(t, true, [{ ...A, status: 'SWAPPED' }, ROTEADOR]);

        expect(onClose).not.toHaveBeenCalled();
        expect(temTexto(t, 'S/N: SN-R')).toBe(true);
        expect(campo(t, 'Código *').props.value).toBe('MOD-NOVO');
    });

    it('sair do Código duas vezes com o mesmo código: uma consulta só', async () => {
        mockLookup.mockResolvedValue(ACHADO);
        const t = render([A]);

        digitar(t, 'Código *', 'MOD-NOVO');
        await sairDoCodigo(t);
        await sairDoCodigo(t);

        expect(mockLookup).toHaveBeenCalledTimes(1);
    });

    it('a consulta falha: o formulário segue e o Registrar ainda envia (o backend decide)', async () => {
        mockLookup.mockRejectedValue(new Error('sem rede'));
        mockSwap.mockResolvedValue({ success: true, result: {} });
        const t = render([A]);

        digitar(t, 'Código *', 'MOD-NOVO');
        digitar(t, 'Nº de série *', 'SN-B');
        await sairDoCodigo(t);
        await registrar(t);

        expect(mockSwap).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('falha seguida de nova tentativa: o segundo toque em Registrar troca faz o segundo POST', async () => {
        mockLookup.mockResolvedValue(ACHADO);
        mockSwap
            .mockRejectedValueOnce({ success: false, error: { message: 'Instável', code: 'BAD_REQUEST' } })
            .mockResolvedValueOnce({ success: true, result: {} });
        const t = render([A]);

        digitar(t, 'Código *', 'MOD-NOVO');
        digitar(t, 'Nº de série *', 'SN-B');
        await sairDoCodigo(t);
        await registrar(t);
        expect(mockSwap).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();

        await registrar(t);
        expect(mockSwap).toHaveBeenCalledTimes(2);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
