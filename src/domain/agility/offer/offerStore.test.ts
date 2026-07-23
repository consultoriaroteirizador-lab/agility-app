import { addOffer, dropOffer, pruneExpired, activeOffer } from './offerStore';

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
    // offerTime '00:00' + receivedAt 0 → expira em receivedAt + 0*60s... usar offerTime em segundos via helper
    let l = addOffer([], { id: 'r1', offerTime: '00:00' }, 0);
    l = pruneExpired(l, 61_000); // 61s depois
    expect(l.length).toBe(0);
});
