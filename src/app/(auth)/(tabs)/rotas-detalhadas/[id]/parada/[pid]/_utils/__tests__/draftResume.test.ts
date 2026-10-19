/**
 * Retomar a parada depois de recarregar o app: o rascunho devolve a `etapa`, mas não
 * `delivered` nem `formCompleted`, que só existem na memória. Sem estas regras, a
 * etapa 3 volta com `delivered` falso, as telas de check são puladas e o fluxo cai em
 * "Dados da entrega" com itens pendentes.
 */
import type { ServiceResponse } from '@/domain/agility/service/dto';

import {
    deliveredFromDraftEtapa,
    descartarRascunhoDeOutraTentativa,
    etapaRestauradaDoRascunho,
    formAnsweredOnServer,
    rascunhoDeOutraTentativa,
    serviceProntoParaHidratar,
} from '../draftResume';

function servico(over: Partial<ServiceResponse>): ServiceResponse {
    return { id: 's1', formGroupIds: [], formGroupAnswers: null, ...over } as unknown as ServiceResponse;
}

function resposta(formGroupId: string, entityId = 's1') {
    return { id: 'r-' + formGroupId, formGroupId, respondedAt: '2026-10-14T10:00:00.000Z', entityType: 'SERVICE', entityId, formAnswers: [] };
}

describe('deliveredFromDraftEtapa', () => {
    it.each([undefined, null, 0, 1, 2])('etapa %s: o motorista ainda não confirmou', (etapa) => {
        expect(deliveredFromDraftEtapa(etapa)).toBe(false);
    });

    it.each([3, 4, 5])('etapa %s: só se chega aqui depois de "Entreguei"/"Coletei"/"Concluí"', (etapa) => {
        expect(deliveredFromDraftEtapa(etapa)).toBe(true);
    });
});

describe('formAnsweredOnServer', () => {
    it('todos os formulários do pedido respondidos para este pedido: já enviado', () => {
        expect(formAnsweredOnServer(servico({ formGroupIds: ['f1', 'f2'], formGroupAnswers: [resposta('f1'), resposta('f2')] as never }))).toBe(true);
    });

    it('só parte dos formulários respondida: ainda falta', () => {
        expect(formAnsweredOnServer(servico({ formGroupIds: ['f1', 'f2'], formGroupAnswers: [resposta('f1')] as never }))).toBe(false);
    });

    it('resposta de outra entidade não conta', () => {
        expect(formAnsweredOnServer(servico({ formGroupIds: ['f1'], formGroupAnswers: [resposta('f1', 'outro')] as never }))).toBe(false);
    });

    it('sem respostas, sem formulários ou sem pedido: não marca como enviado', () => {
        expect(formAnsweredOnServer(servico({ formGroupIds: ['f1'], formGroupAnswers: null }))).toBe(false);
        expect(formAnsweredOnServer(servico({ formGroupIds: [], formGroupAnswers: [resposta('f1')] as never }))).toBe(false);
        expect(formAnsweredOnServer(servico({ formGroupIds: null as never }))).toBe(false);
        expect(formAnsweredOnServer(null)).toBe(false);
        expect(formAnsweredOnServer(undefined)).toBe(false);
    });
});

describe('etapaRestauradaDoRascunho', () => {
    const entrega = { isTransfer: false };

    it('pedido PENDING com rascunho na etapa 2 (tentativa anterior) volta à etapa de chegada', () => {
        expect(etapaRestauradaDoRascunho({ etapa: 2, emAtendimento: false, ...entrega })).toBe(1);
    });

    it.each([3, 4, 5])('pedido fora de atendimento com rascunho na etapa %s também volta à chegada', (etapa) => {
        expect(etapaRestauradaDoRascunho({ etapa, emAtendimento: false, ...entrega })).toBe(1);
    });

    it('pedido IN_ATTENDANCE na etapa 2 mantém a etapa', () => {
        expect(etapaRestauradaDoRascunho({ etapa: 2, emAtendimento: true, ...entrega })).toBe(2);
    });

    it.each([3, 4, 5])('pedido IN_ATTENDANCE na etapa %s mantém a etapa (o check não é pulado)', (etapa) => {
        const restaurada = etapaRestauradaDoRascunho({ etapa, emAtendimento: true, ...entrega });
        expect(restaurada).toBe(etapa);
        expect(deliveredFromDraftEtapa(restaurada)).toBe(true);
    });

    it('SERVICE ASSIGNED no check de saída (etapa 1) segue na etapa 1: o check não depende da etapa', () => {
        expect(etapaRestauradaDoRascunho({ etapa: 1, emAtendimento: false, ...entrega })).toBe(1);
    });

    it('a etapa clampada não liga delivered', () => {
        const restaurada = etapaRestauradaDoRascunho({ etapa: 3, emAtendimento: false, ...entrega });
        expect(deliveredFromDraftEtapa(restaurada)).toBe(false);
    });

    it('TRANSFER controla a navegação por perna: mantém a etapa do rascunho', () => {
        expect(etapaRestauradaDoRascunho({ etapa: 2, emAtendimento: false, isTransfer: true })).toBe(2);
    });

    it.each([undefined, null, 0])('rascunho sem etapa (%s) resulta na etapa de chegada', (etapa) => {
        expect(etapaRestauradaDoRascunho({ etapa, emAtendimento: true, ...entrega })).toBe(1);
    });
});

describe('serviceProntoParaHidratar', () => {
    it('sem serviço ainda: não hidrata', () => {
        expect(serviceProntoParaHidratar({ service: null, isRefetching: false })).toBe(false);
    });

    it('serviço em cache com refetch em voo: espera o status fresco', () => {
        expect(serviceProntoParaHidratar({ service: servico({}), isRefetching: true })).toBe(false);
    });

    it('serviço carregado e sem refetch em voo: hidrata', () => {
        expect(serviceProntoParaHidratar({ service: servico({}), isRefetching: false })).toBe(true);
    });
});

describe('rascunhoDeOutraTentativa', () => {
    it.each([
        ['SERVICE', 'PENDING', 3, true],
        ['COLETA', 'PENDING', 2, true],
        ['SERVICE', 'ASSIGNED', 2, true],
        ['SERVICE', 'IN_ATTENDANCE', 3, false],
        ['SERVICE', 'ASSIGNED', 1, false],
        ['SERVICE', 'PENDING', 1, false],
        ['TRANSFER', 'PENDING', 3, false],
        ['TRANSFER', 'ASSIGNED', 2, false],
    ])('%s %s etapa %s -> %s', (serviceType, status, etapa, esperado) => {
        expect(rascunhoDeOutraTentativa({ serviceType, status, etapa })).toBe(esperado);
    });

    it('isInAttendance=true conta como em atendimento mesmo com status defasado', () => {
        expect(rascunhoDeOutraTentativa({ serviceType: 'SERVICE', status: 'ASSIGNED', isInAttendance: true, etapa: 3 })).toBe(false);
    });

    it('sem etapa salva não é resíduo', () => {
        expect(rascunhoDeOutraTentativa({ serviceType: 'SERVICE', status: 'PENDING', etapa: undefined })).toBe(false);
    });
});

describe('descartarRascunhoDeOutraTentativa', () => {
    const cleaners = () => ({ clearLocal: jest.fn().mockResolvedValue(undefined), clearRemote: jest.fn().mockResolvedValue(undefined) });

    it('resíduo: limpa local e servidor e devolve true (a hidratação não aplica nada)', async () => {
        const c = cleaners();
        await expect(descartarRascunhoDeOutraTentativa('s1', { serviceType: 'SERVICE', status: 'PENDING', etapa: 3 }, c)).resolves.toBe(true);
        expect(c.clearLocal).toHaveBeenCalledWith('s1');
        expect(c.clearRemote).toHaveBeenCalledWith('s1');
    });

    it('rascunho válido: não limpa nada e devolve false', async () => {
        const c = cleaners();
        await expect(descartarRascunhoDeOutraTentativa('s1', { serviceType: 'SERVICE', status: 'IN_ATTENDANCE', etapa: 3 }, c)).resolves.toBe(false);
        expect(c.clearLocal).not.toHaveBeenCalled();
        expect(c.clearRemote).not.toHaveBeenCalled();
    });
});
