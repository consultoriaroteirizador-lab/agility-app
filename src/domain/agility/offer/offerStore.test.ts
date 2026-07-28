import {
    addOffer,
    dropOffer,
    pruneExpired,
    activeOffer,
    expiresAtOf,
    isSilenced,
    silenceOffer,
} from './offerStore';

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

// ─── Silenciar (Ver detalhes) ────────────────────────────────────────────────

it('silenceOffer mantém a oferta na fila (não é recusa)', () => {
    let l = addOffer([], o('r1'), 0);
    l = silenceOffer(l, 'r1', 1);
    expect(l.length).toBe(1);
    expect(isSilenced(l[0])).toBe(true);
});

it('oferta silenciada deixa de ser a oferta que alerta', () => {
    let l = addOffer([], o('r1'), 0);
    l = silenceOffer(l, 'r1', 1);
    expect(activeOffer(l)).toBeUndefined();
});

it('uma segunda oferta alerta normalmente com a primeira silenciada', () => {
    let l = addOffer([], o('r1'), 0);
    l = silenceOffer(l, 'r1', 1);
    l = addOffer(l, o('r2'), 2);
    expect(activeOffer(l)?.id).toBe('r2');
});

it('silenciar a segunda não ressuscita o alerta da primeira', () => {
    let l = addOffer([], o('r1'), 0);
    l = addOffer(l, o('r2'), 1);
    l = silenceOffer(l, 'r1', 2);
    l = silenceOffer(l, 'r2', 3);
    expect(activeOffer(l)).toBeUndefined();
});

it('repovoar a fila (polling/WS) não desfaz o silêncio', () => {
    let l = addOffer([], o('r1'), 0);
    l = silenceOffer(l, 'r1', 1);
    l = addOffer(l, o('r1'), 2); // mesmo id chegando de novo pelo polling
    expect(l.length).toBe(1);
    expect(activeOffer(l)).toBeUndefined();
});

it('silenceOffer é idempotente e preserva o instante do primeiro silêncio', () => {
    let l = addOffer([], o('r1'), 0);
    l = silenceOffer(l, 'r1', 1);
    const depois = silenceOffer(l, 'r1', 9);
    expect(depois).toBe(l); // mesma referência: nada mudou
    expect(depois[0].silencedAt).toBe(1);
});

it('silenceOffer com id inexistente devolve a mesma lista', () => {
    const l = addOffer([], o('r1'), 0);
    expect(silenceOffer(l, 'r404', 1)).toBe(l);
});

it('oferta silenciada continua expirando pelo pruneExpired', () => {
    let l = addOffer([], { id: 'r1', offerTime: '00:10' }, 0);
    l = silenceOffer(l, 'r1', 1);
    l = pruneExpired(l, 11_000);
    expect(l.length).toBe(0);
});

it('oferta silenciada continua podendo ser aceita/recusada por id', () => {
    let l = addOffer([], o('r1'), 0);
    l = silenceOffer(l, 'r1', 1);
    l = dropOffer(l, 'r1');
    expect(l.length).toBe(0);
});
