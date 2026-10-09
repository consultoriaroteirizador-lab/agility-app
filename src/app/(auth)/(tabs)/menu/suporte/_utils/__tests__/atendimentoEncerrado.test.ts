// Rodada de 09/10/2026: a motorista encerrou pelo app e a tela disse "finalizado pelo operador".
import { textoAtendimentoEncerrado } from '../atendimentoEncerrado';

it('a própria motorista encerrou nesta tela', () => {
    expect(textoAtendimentoEncerrado({ encerradoNestaTela: true, ticket: null })).toBe('Você encerrou este atendimento.');
});

it('o protocolo diz que foi o solicitante (reabrindo a conversa depois)', () => {
    expect(textoAtendimentoEncerrado({ encerradoNestaTela: false, ticket: { resolvedByRequester: true } }))
        .toBe('Você encerrou este atendimento.');
    // Back sem o campo: o texto gravado pelo resolve-by-requester.
    expect(textoAtendimentoEncerrado({
        encerradoNestaTela: false,
        ticket: { resolutionDescription: 'Encerrado pelo solicitante: resolvi com o cliente' },
    })).toBe('Você encerrou este atendimento.');
});

it('operador encerrou', () => {
    expect(textoAtendimentoEncerrado({ encerradoNestaTela: false, ticket: { resolvedByRequester: false, resolutionDescription: 'Pedido localizado' } }))
        .toBe('Atendimento finalizado pelo operador.');
    expect(textoAtendimentoEncerrado({ encerradoNestaTela: false, ticket: null })).toBe('Atendimento finalizado pelo operador.');
});
