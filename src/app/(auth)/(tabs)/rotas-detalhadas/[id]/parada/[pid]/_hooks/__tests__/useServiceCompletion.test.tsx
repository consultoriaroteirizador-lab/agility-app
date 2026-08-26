/**
 * `useServiceCompletion` virou o dono unico da pergunta "o motorista ja pode
 * concluir?" nas Tasks 8/9 do epico de finalizacao dinamica (junto com
 * `SharedEtapaDados` e `TransferEtapaFinalizarColeta`, que chamam o mesmo
 * `validateCompletion`). Nenhum teste cobria o hook isolado — so as telas por
 * cima. Este arquivo fecha essa lacuna com o padrao "Probe" de
 * `useStopStatus.test.tsx`: mocka `useParada` (usado tanto por este hook
 * quanto por `useServiceUpload`, que ele chama por baixo) e roda o hook fora
 * de uma tela de verdade.
 *
 * `useServiceCompletion` tambem chama `useCompleteServiceWithDetails` e
 * `useQueryClient` (react-query). `useQueryClient` exige um `QueryClient` no
 * contexto para nao lancar no render — por isso o `Probe` roda dentro de um
 * `QueryClientProvider`, mesmo sem nenhuma chamada de rede disparada por estes
 * testes (so lemos `canFinalize`/`missing`, nunca chamamos `handleFinalizar`).
 *
 * `useCompleteServiceWithDetails` e importado do barrel
 * `@/domain/agility/service/useCase`, que TAMBEM reexporta
 * `useFindServicesByRoutingId` — esse puxa, em cascata,
 * `occurrenceReasonsStorage` -> `storage.ts` -> `@react-native-async-storage/
 * async-storage`, cujo modulo nativo nao existe no ambiente jest deste projeto
 * (falha com "[@RNC/AsyncStorage]: NativeModule: AsyncStorage is null", sem
 * relacao nenhuma com o hook sob teste). A saida foi mockar o barrel inteiro,
 * devolvendo so o hook que `useServiceCompletion` de fato usa.
 */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import type { CompletionRequirements, FlowCompletionRequirements } from '@/domain/agility/company/completionRequirements';
import { resolveCompletionRequirements } from '@/domain/agility/company/completionRequirements';

import { useParada } from '../../_context/ParadaContext';
import { useServiceCompletion } from '../useServiceCompletion';

jest.mock('../../_context/ParadaContext', () => ({
    useParada: jest.fn(),
}));

// Nomeado com prefixo "mock" (exigencia do jest para ser referenciado dentro do
// factory abaixo) — e o unico jeito de espionar o payload que `handleFinalizar`
// manda para a API sem bater em rede de verdade.
const mockCompleteServiceWithDetailsAsync = jest.fn();

jest.mock('@/domain/agility/service/useCase', () => ({
    useCompleteServiceWithDetails: () => ({
        completeServiceWithDetailsAsync: mockCompleteServiceWithDetailsAsync,
        isLoading: false,
    }),
}));

// `handleFinalizar` sobe fotos/assinatura e le GPS antes de montar o payload —
// nenhum dos tres precisa (nem pode, sem NativeModules) rodar de verdade aqui.
jest.mock('@/domain/agility/service/serviceUploadUtils', () => ({
    uploadMultipleServicePhotos: jest.fn().mockResolvedValue([]),
    uploadBase64Signature: jest.fn().mockResolvedValue(null),
}));

jest.mock('../getCurrentCoords', () => ({
    getCurrentCoords: jest.fn().mockResolvedValue(undefined),
}));

// `useParada` real devolve dezenas de campos; o mock so precisa dos que
// `useServiceCompletion` e `useServiceUpload` (chamado por baixo) leem.
// `as unknown as jest.Mock` porque o objeto mockado nao satisfaz o tipo
// completo de `ParadaContextValue` — e nao precisa, ambos os hooks so leem um
// subconjunto dele.
const mockedUseParada = useParada as unknown as jest.Mock;

// `resolveCompletionRequirements(undefined)` cai no default de cada campo
// (`resolveMode` sem match => 'REQUIRED', `resolvePhotos` sem `min` => 1) —
// exatamente o fixture "tudo exigido" que representa a empresa que nunca
// configurou nada.
const REQUIRED_FLOW: FlowCompletionRequirements = resolveCompletionRequirements(undefined).delivery;

const HIDDEN_FLOW: FlowCompletionRequirements = {
    recipientType: 'HIDDEN',
    recipientIdentity: 'HIDDEN',
    signature: 'HIDDEN',
    photos: { mode: 'HIDDEN', min: 1 },
};

const ALL_REQUIRED: CompletionRequirements = {
    delivery: REQUIRED_FLOW,
    pickup: REQUIRED_FLOW,
    service: REQUIRED_FLOW,
};

const ALL_HIDDEN: CompletionRequirements = {
    delivery: HIDDEN_FLOW,
    pickup: HIDDEN_FLOW,
    service: HIDDEN_FLOW,
};

interface ParadaOverrides {
    recipient?: {
        tipo?: string | null;
        nome?: string;
        tipoDocumento?: string;
        numeroDocumento?: string;
        relationCode?: string;
        relationLabel?: string;
    } | null;
    signature?: string | null;
    photos?: unknown[];
    completionRequirements?: CompletionRequirements;
    pickupEvidence?: {
        receivedBy?: string;
        receivedByDocumentType?: string;
        receivedByDocument?: string;
        receivedByRelationCode?: string;
        receivedByRelationLabel?: string;
        signatureUrl?: string;
        photoUrls: string[];
        notes?: string;
    } | null;
}

/** Contexto mínimo que `useServiceCompletion` + `useServiceUpload` precisam. */
function makeParadaContext(overrides: ParadaOverrides = {}) {
    return {
        service: null,
        serviceId: 'service-1',
        rotaId: 'rota-1',
        recipient: overrides.recipient ?? null,
        observation: '',
        checklist: {},
        finalizing: false,
        setFinalizing: jest.fn(),
        setShowSuccess: jest.fn(),
        resetState: jest.fn(),
        photos: overrides.photos ?? [],
        paymentAmount: '',
        paymentMethod: null,
        pickupEvidence: overrides.pickupEvidence ?? null,
        deliveryCode: '',
        bypassReasonCode: null,
        bypassReasonText: '',
        completionRequirements: overrides.completionRequirements ?? ALL_REQUIRED,
        signature: overrides.signature ?? null,
        setPhotos: jest.fn(),
        setSignature: jest.fn(),
        uploadProgress: new Map(),
        setUploadProgress: jest.fn(),
    };
}

/** Roda o hook fora de uma tela de verdade, capturando o resultado do render. */
function runHook(serviceType: Parameters<typeof useServiceCompletion>[0]) {
    const queryClient = new QueryClient();
    let captured: ReturnType<typeof useServiceCompletion> | undefined;
    function Probe() {
        captured = useServiceCompletion(serviceType);
        return null;
    }
    act(() => {
        TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    if (!captured) throw new Error('useServiceCompletion não retornou nada');
    return captured;
}

describe('useServiceCompletion — regra unica de conclusao', () => {
    afterEach(() => {
        mockedUseParada.mockReset();
        mockCompleteServiceWithDetailsAsync.mockReset();
    });

    it('tudo REQUIRED e estado vazio: canFinalize falso e missing com os quatro rotulos', () => {
        mockedUseParada.mockReturnValue(makeParadaContext());

        // ALL_REQUIRED aplica o mesmo REQUIRED_FLOW aos tres buckets — o
        // serviceType aqui e so o do unico chamador real (SharedEtapaFinalizacao
        // sempre passa explicito, useServiceCompletion nao tem mais default).
        const result = runHook('entrega');

        expect(result.canFinalize).toBe(false);
        expect(result.missing).toEqual(['quem recebeu', 'nome e documento', 'assinatura', 'foto']);
    });

    it('tudo REQUIRED e estado completo: canFinalize verdadeiro', () => {
        mockedUseParada.mockReturnValue(
            makeParadaContext({
                recipient: { tipo: 'cliente', nome: 'Fulano', numeroDocumento: '12345678900' },
                signature: 'data:image/png;base64,abc',
                photos: [{ uri: 'file://a.jpg' }],
            }),
        );

        const result = runHook('entrega');

        expect(result.canFinalize).toBe(true);
        expect(result.missing).toEqual([]);
    });

    it('tudo HIDDEN e estado vazio: canFinalize VERDADEIRO (servico sem ninguem para acompanhar)', () => {
        mockedUseParada.mockReturnValue(makeParadaContext({ completionRequirements: ALL_HIDDEN }));

        const result = runHook('servico');

        expect(result.canFinalize).toBe(true);
        expect(result.missing).toEqual([]);
    });

    it('signature HIDDEN com foto faltando: missing cita foto e NAO cita assinatura (prova que o rodape nao mente)', () => {
        const requirements: CompletionRequirements = {
            ...ALL_REQUIRED,
            delivery: { ...REQUIRED_FLOW, signature: 'HIDDEN' },
        };
        mockedUseParada.mockReturnValue(
            makeParadaContext({
                completionRequirements: requirements,
                recipient: { tipo: 'cliente', nome: 'Fulano', numeroDocumento: '12345678900' },
                // sem foto e sem assinatura — mas assinatura nao e mais exigida.
            }),
        );

        const result = runHook('entrega');

        expect(result.canFinalize).toBe(false);
        expect(result.missing).toContain('foto');
        expect(result.missing).not.toContain('assinatura');
    });

    it('photos REQUIRED min 2 com 1 foto: bloqueado citando 2 fotos', () => {
        const requirements: CompletionRequirements = {
            ...ALL_REQUIRED,
            delivery: { ...REQUIRED_FLOW, photos: { mode: 'REQUIRED', min: 2 } },
        };
        mockedUseParada.mockReturnValue(
            makeParadaContext({
                completionRequirements: requirements,
                recipient: { tipo: 'cliente', nome: 'Fulano', numeroDocumento: '12345678900' },
                signature: 'data:image/png;base64,abc',
                photos: [{ uri: 'file://a.jpg' }],
            }),
        );

        const result = runHook('entrega');

        expect(result.canFinalize).toBe(false);
        expect(result.missing).toContain('2 fotos');
    });

    describe('mapeamento serviceType -> fluxo do contrato', () => {
        // delivery exige tudo, pickup esconde tudo, service exige 3 fotos —
        // requisitos DIFERENTES por fluxo para provar que cada `serviceType`
        // realmente le o bucket certo (e nao, por coincidencia, sempre o mesmo).
        const requirements: CompletionRequirements = {
            delivery: REQUIRED_FLOW,
            pickup: HIDDEN_FLOW,
            service: { ...REQUIRED_FLOW, photos: { mode: 'REQUIRED', min: 3 } },
        };

        it("'entrega' le 'delivery' (tudo exigido, estado vazio bloqueia)", () => {
            mockedUseParada.mockReturnValue(makeParadaContext({ completionRequirements: requirements }));

            const result = runHook('entrega');

            expect(result.canFinalize).toBe(false);
            expect(result.missing).toEqual(['quem recebeu', 'nome e documento', 'assinatura', 'foto']);
        });

        it("'coleta' le 'pickup' (tudo oculto, libera mesmo com estado vazio)", () => {
            mockedUseParada.mockReturnValue(makeParadaContext({ completionRequirements: requirements }));

            const result = runHook('coleta');

            expect(result.canFinalize).toBe(true);
            expect(result.missing).toEqual([]);
        });

        it("'servico' le 'service' (min de fotos proprio do fluxo, 2 nao bastam)", () => {
            mockedUseParada.mockReturnValue(
                makeParadaContext({
                    completionRequirements: requirements,
                    recipient: { tipo: 'cliente', nome: 'Fulano', numeroDocumento: '12345678900' },
                    signature: 'data:image/png;base64,abc',
                    photos: [{ uri: 'file://a.jpg' }, { uri: 'file://b.jpg' }],
                }),
            );

            const result = runHook('servico');

            expect(result.canFinalize).toBe(false);
            expect(result.missing).toEqual(['3 fotos']);
        });
    });

    describe('payload de conclusao — identificacao de quem recebeu (Task 8)', () => {
        // Gate de conclusao (canFinalize) ja e coberto pelos blocos acima — aqui
        // o requirements e ALL_HIDDEN de proposito, para isolar o teste no que
        // `handleFinalizar` monta no payload, sem a exigencia de campo interferir.
        it('envia documento e relacao de quem recebeu no payload de conclusao', async () => {
            mockedUseParada.mockReturnValue(
                makeParadaContext({
                    completionRequirements: ALL_HIDDEN,
                    recipient: {
                        tipo: 'porteiro',
                        nome: 'Elaine Rocha',
                        tipoDocumento: 'RG',
                        numeroDocumento: '12.456.789-01',
                        relationCode: 'PORTEIRO',
                        relationLabel: 'Porteiro',
                    },
                    photos: [{ uri: 'a.jpg' }],
                    signature: 'sig.png',
                }),
            );

            const result = runHook('entrega');

            await act(async () => {
                await result.handleFinalizar();
            });

            expect(mockCompleteServiceWithDetailsAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    details: expect.objectContaining({
                        receivedBy: 'Elaine Rocha',
                        receivedByDocumentType: 'RG',
                        receivedByDocument: '12.456.789-01',
                        receivedByRelationCode: 'PORTEIRO',
                        receivedByRelationLabel: 'Porteiro',
                    }),
                }),
            );
        });

        // Par direto do teste abaixo — mesmo `recipient` (tipo/nome/tipoDocumento),
        // só o `numeroDocumento` muda (preenchido aqui, em branco lá). Sem este
        // par, "nao envia campo vazio" passaria mesmo com o bloco inteiro
        // removido, porque ausência de campo já é o comportamento de baseline.
        it('documento preenchido: receivedByDocument/Type vao no payload', async () => {
            mockedUseParada.mockReturnValue(
                makeParadaContext({
                    completionRequirements: ALL_HIDDEN,
                    recipient: { tipo: 'cliente', nome: 'Ana', tipoDocumento: 'RG', numeroDocumento: '123.456.789-00' },
                    photos: [{ uri: 'a.jpg' }],
                    signature: 'sig.png',
                }),
            );

            const result = runHook('entrega');

            await act(async () => {
                await result.handleFinalizar();
            });

            const [payloadArg] = mockCompleteServiceWithDetailsAsync.mock.calls[0];
            expect(payloadArg.details).toEqual(
                expect.objectContaining({
                    receivedByDocumentType: 'RG',
                    receivedByDocument: '123.456.789-00',
                }),
            );
        });

        it('nao envia campo vazio — documento em branco nao vira string vazia no banco', async () => {
            mockedUseParada.mockReturnValue(
                makeParadaContext({
                    completionRequirements: ALL_HIDDEN,
                    recipient: { tipo: 'cliente', nome: 'Ana', tipoDocumento: 'RG', numeroDocumento: '   ' },
                    photos: [{ uri: 'a.jpg' }],
                    signature: 'sig.png',
                }),
            );

            const result = runHook('entrega');

            await act(async () => {
                await result.handleFinalizar();
            });

            const [payloadArg] = mockCompleteServiceWithDetailsAsync.mock.calls[0];
            expect(payloadArg.details).not.toHaveProperty('receivedByDocument');
            expect(payloadArg.details).not.toHaveProperty('receivedByDocumentType');
        });

        // relationCode sem relationLabel e dado incompleto (JSON.stringify
        // derruba `undefined`, o backend recebe code sem rotulo — comprovante
        // em branco). `draftToRecipient` le JSON que outro cliente/versao pode
        // ter escrito assim; o gate tem que proteger os dois lados.
        it('relationCode sem relationLabel: nenhum dos dois vai no payload', async () => {
            mockedUseParada.mockReturnValue(
                makeParadaContext({
                    completionRequirements: ALL_HIDDEN,
                    recipient: {
                        tipo: 'porteiro',
                        nome: 'Elaine Rocha',
                        relationCode: 'PORTEIRO',
                        // relationLabel ausente de proposito (draft antigo/outro cliente).
                    },
                    photos: [{ uri: 'a.jpg' }],
                    signature: 'sig.png',
                }),
            );

            const result = runHook('entrega');

            await act(async () => {
                await result.handleFinalizar();
            });

            const [payloadArg] = mockCompleteServiceWithDetailsAsync.mock.calls[0];
            expect(payloadArg.details).not.toHaveProperty('receivedByRelationCode');
            expect(payloadArg.details).not.toHaveProperty('receivedByRelationLabel');
        });

        // `pickupCompletion` (perna de coleta do TRANSFER) tinha os 4 campos
        // acrescentados em useServiceCompletion.ts sem nenhum teste cobrindo —
        // remover aquele bloco por engano nao quebrava nada. `pickupEvidence`
        // no harness era sempre `null`; agora e configuravel via override.
        it('TRANSFER: documento e relacao da perna de coleta vao dentro de pickupCompletion', async () => {
            mockedUseParada.mockReturnValue(
                makeParadaContext({
                    completionRequirements: ALL_HIDDEN,
                    photos: [],
                    signature: null,
                    pickupEvidence: {
                        receivedBy: 'Joao Estoquista',
                        receivedByDocumentType: 'RG',
                        receivedByDocument: '98.765.432-00',
                        receivedByRelationCode: 'ESTOQUISTA',
                        receivedByRelationLabel: 'Estoquista',
                        photoUrls: [],
                    },
                }),
            );

            const result = runHook('entrega');

            await act(async () => {
                await result.handleFinalizar();
            });

            const [payloadArg] = mockCompleteServiceWithDetailsAsync.mock.calls[0];
            expect(payloadArg.details.pickupCompletion).toEqual(
                expect.objectContaining({
                    receivedBy: 'Joao Estoquista',
                    receivedByDocumentType: 'RG',
                    receivedByDocument: '98.765.432-00',
                    receivedByRelationCode: 'ESTOQUISTA',
                    receivedByRelationLabel: 'Estoquista',
                }),
            );
        });

        it('TRANSFER: pickupCompletion sem documento/relacao na origem nao ganha os campos', async () => {
            mockedUseParada.mockReturnValue(
                makeParadaContext({
                    completionRequirements: ALL_HIDDEN,
                    photos: [],
                    signature: null,
                    pickupEvidence: {
                        receivedBy: 'Joao',
                        photoUrls: [],
                    },
                }),
            );

            const result = runHook('entrega');

            await act(async () => {
                await result.handleFinalizar();
            });

            const [payloadArg] = mockCompleteServiceWithDetailsAsync.mock.calls[0];
            expect(payloadArg.details.pickupCompletion).not.toHaveProperty('receivedByDocument');
            expect(payloadArg.details.pickupCompletion).not.toHaveProperty('receivedByRelationCode');
        });

        it('TRANSFER: pickupCompletion com relationCode sem relationLabel tambem nao envia nenhum dos dois', async () => {
            mockedUseParada.mockReturnValue(
                makeParadaContext({
                    completionRequirements: ALL_HIDDEN,
                    photos: [],
                    signature: null,
                    pickupEvidence: {
                        receivedBy: 'Joao',
                        receivedByRelationCode: 'ESTOQUISTA',
                        // receivedByRelationLabel ausente de proposito.
                        photoUrls: [],
                    },
                }),
            );

            const result = runHook('entrega');

            await act(async () => {
                await result.handleFinalizar();
            });

            const [payloadArg] = mockCompleteServiceWithDetailsAsync.mock.calls[0];
            expect(payloadArg.details.pickupCompletion).not.toHaveProperty('receivedByRelationCode');
            expect(payloadArg.details.pickupCompletion).not.toHaveProperty('receivedByRelationLabel');
        });
    });
});
