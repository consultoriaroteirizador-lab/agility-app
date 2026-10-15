/**
 * Retomar a parada depois de recarregar o app: o rascunho devolve a `etapa`, mas não
 * `delivered` nem `formCompleted`, que só existem na memória. Sem estas regras, a
 * etapa 3 volta com `delivered` falso, as telas de check são puladas e o fluxo cai em
 * "Dados da entrega" com itens pendentes.
 */
import type { ServiceResponse } from '@/domain/agility/service/dto';

import { deliveredFromDraftEtapa, formAnsweredOnServer } from '../draftResume';

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
