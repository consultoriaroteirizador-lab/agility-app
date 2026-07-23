import { addOffer, dropOffer, pruneExpired, activeOffer, expiresAtOf } from './offerStore';

const o = (id: string, offerTime = '00:10') => ({ id, offerTime });

it('dedup por id ao adicionar', () => {
    let l = addOffer([], o('r1'), 0);
    l = addOffer(l, o('r1'), 5); // mesmo id
    expect(l.length).toBe(1);
});

it('enfileira ofertas distintas em ordem', () => {
    let l = addOffer([], o('r1'), 0);
    l = addOffer(l, o('r2'), 1);
    expect(activeOffer(l)?.id).toBe('r1'); // primeira da fila
});

it('dropOffer remove por id', () => {
    let l = addOffer([], o('r1'), 0);
    l = dropOffer(l, 'r1');
    expect(l.length).toBe(0);
});

it('pruneExpired remove ofertas cujo timer passou', () => {
    // offerTime '00:00' cai no fallback de 60s (ver testes de expiresAtOf abaixo).
    let l = addOffer([], { id: 'r1', offerTime: '00:00' }, 0);
    l = pruneExpired(l, 61_000); // 61s depois: já passou do fallback de 60s
    expect(l.length).toBe(0);
});

it('expiresAtOf usa fallback de 60s quando offerTime é "00:00" (duração zero)', () => {
    const o = { id: 'r1', offerTime: '00:00', receivedAt: 0 };
    expect(expiresAtOf(o)).toBe(60_000);
});

it('expiresAtOf usa fallback de 60s quando offerTime está ausente', () => {
    const o = { id: 'r1', receivedAt: 0 };
    expect(expiresAtOf(o)).toBe(60_000);
});

it('expiresAtOf usa fallback de 60s quando offerTime está em branco', () => {
    const o = { id: 'r1', offerTime: '   ', receivedAt: 0 };
    expect(expiresAtOf(o)).toBe(60_000);
});

it('expiresAtOf respeita offerTime válido não-zero (não aplica fallback)', () => {
    const o = { id: 'r1', offerTime: '00:10', receivedAt: 0 };
    expect(expiresAtOf(o)).toBe(10_000);
});
