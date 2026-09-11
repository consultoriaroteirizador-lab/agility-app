import {
    addOffer,
    applySilenced,
    dropOffer,
    forgetSilenced,
    pruneExpired,
    rememberSilenced,
    activeOffer,
    expiresAtOf,
    isSilenced,
    silenceOffer,
} from './offerStore';
import type { SilencedOffers } from './offerStore';

const o = (id: string, offerExpiresAt?: string) => ({ id, offerExpiresAt });

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

it('expiresAtOf usa o instante absoluto do backend', () => {
    expect(expiresAtOf({ id: 'r1', offerExpiresAt: '1970-01-01T00:00:10.000Z', receivedAt: 0 })).toBe(10_000);
});

it('sem offerExpiresAt a oferta não expira localmente', () => {
    expect(expiresAtOf({ id: 'r1', receivedAt: 0 })).toBe(Number.POSITIVE_INFINITY);
});

it('pruneExpired remove a oferta cujo instante passou', () => {
    let l = addOffer([], { id: 'r1', offerExpiresAt: '1970-01-01T00:00:10.000Z' }, 0);
    l = pruneExpired(l, 11_000);
    expect(l.length).toBe(0);
});

it('oferta silenciada continua expirando pelo pruneExpired', () => {
    let l = addOffer([], { id: 'r1', offerExpiresAt: '1970-01-01T00:00:10.000Z' }, 0);
    l = silenceOffer(l, 'r1', 1);
    l = pruneExpired(l, 11_000);
    expect(l.length).toBe(0);
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

it('oferta silenciada continua podendo ser aceita/recusada por id', () => {
    let l = addOffer([], o('r1'), 0);
    l = silenceOffer(l, 'r1', 1);
    l = dropOffer(l, 'r1');
    expect(l.length).toBe(0);
});

it('pruneExpired preserva a referência quando nada expirou', () => {
    const l = addOffer([], o('r1'), 0);
    expect(pruneExpired(l, 1_000)).toBe(l);
});

// ─── Memória de ofertas dispensadas: sobrevive ao esvaziamento da fila ───────────────

it('o silêncio sobrevive ao ciclo silencia → indisponível → disponível → repovoa', () => {
    // t=0: oferta com prazo até 60s chega e o motorista manda "Ver detalhes".
    let fila = addOffer([], { id: 'r1', offerExpiresAt: '1970-01-01T00:01:00.000Z' }, 0);
    let memoria = rememberSilenced({}, fila[0], 0);
    expect(activeOffer(applySilenced(fila, memoria))).toBeUndefined();

    // t=10s: fica indisponível — a fila inteira é descartada, a memória não.
    fila = [];
    memoria = forgetSilenced(memoria, fila, 10_000);
    expect(Object.keys(memoria)).toEqual(['r1']);

    // t=15s: volta a ficar disponível e o poll reempilha A MESMA oferta.
    fila = addOffer(fila, { id: 'r1', offerExpiresAt: '1970-01-01T00:01:00.000Z' }, 15_000);
    expect(fila.length).toBe(1);

    // O alerta NÃO reabre por cima da tela de detalhe que ele está lendo.
    expect(activeOffer(applySilenced(fila, memoria))).toBeUndefined();
});

it('o prazo da memória é renovado pela oferta que reentrou (não vence antes dela)', () => {
    let memoria = rememberSilenced({}, { id: 'r1', offerExpiresAt: '1970-01-01T00:01:00.000Z', receivedAt: 0 }, 0);
    expect(memoria.r1.until).toBe(60_000);

    // Reentrou em t=50s com um offerExpiresAt novo do backend: expira só em 110s.
    const fila = [{ id: 'r1', offerExpiresAt: '1970-01-01T00:01:50.000Z', receivedAt: 50_000 }];
    memoria = forgetSilenced(memoria, fila, 50_000);
    expect(memoria.r1.until).toBe(110_000);

    // Em t=60s (prazo antigo) a memória continua valendo e o alerta não volta.
    memoria = forgetSilenced(memoria, fila, 60_000);
    expect(activeOffer(applySilenced(fila, memoria))).toBeUndefined();
});

it('a memória é esquecida quando a oferta expira de vez fora da fila', () => {
    let memoria = rememberSilenced({}, { id: 'r1', offerExpiresAt: '1970-01-01T00:01:00.000Z', receivedAt: 0 }, 0);
    memoria = forgetSilenced(memoria, [], 59_000); // ainda dentro do prazo
    expect(Object.keys(memoria)).toEqual(['r1']);
    memoria = forgetSilenced(memoria, [], 61_000); // prazo passou
    expect(memoria).toEqual({});
});

it('rememberSilenced preserva o instante do primeiro silêncio', () => {
    const oferta = { id: 'r1', offerExpiresAt: '1970-01-01T00:01:00.000Z', receivedAt: 0 };
    let memoria = rememberSilenced({}, oferta, 5);
    memoria = rememberSilenced(memoria, oferta, 99);
    expect(memoria.r1.at).toBe(5);
});

it('applySilenced usa o instante do silêncio, não o do render', () => {
    const fila = addOffer([], o('r1'), 0);
    const memoria = rememberSilenced({}, fila[0], 7);
    expect(applySilenced(fila, memoria)[0].silencedAt).toBe(7);
});

it('applySilenced devolve a mesma lista quando não há nada a silenciar', () => {
    const fila = addOffer([], o('r1'), 0);
    expect(applySilenced(fila, {})).toBe(fila);
    // memória de uma oferta que nem está na fila também não mexe na lista
    const memoria: SilencedOffers = { r404: { at: 0, until: 60_000 } };
    expect(applySilenced(fila, memoria)).toBe(fila);
});

it('forgetSilenced devolve a mesma memória quando nada muda', () => {
    const memoria = rememberSilenced({}, { id: 'r1', offerExpiresAt: '1970-01-01T00:01:00.000Z', receivedAt: 0 }, 0);
    expect(forgetSilenced(memoria, [], 10_000)).toBe(memoria);
});

// ─── Recusa: local, e o poll não pode reinsistir ─────────────────────────────

it('recusa → poll reempilha → não alerta de novo', () => {
    // O motorista recusa: a oferta NÃO sai da fila (segue visível/aceitável),
    // só entra na memória de dispensadas.
    let fila = addOffer([], { id: 'r1', offerExpiresAt: '1970-01-01T00:01:00.000Z' }, 0);
    const memoria = rememberSilenced({}, fila[0], 0);
    expect(activeOffer(applySilenced(fila, memoria))).toBeUndefined();

    // 25s depois o poll devolve a mesma rota (segue em broadcasting para todos).
    fila = addOffer(fila, { id: 'r1', offerExpiresAt: '1970-01-01T00:01:00.000Z' }, 25_000);
    expect(fila.length).toBe(1); // dedup por id
    expect(activeOffer(applySilenced(fila, memoria))).toBeUndefined();
});

it('recusar uma oferta não silencia as outras nem tira a recusada da fila', () => {
    let fila = addOffer([], o('r1'), 0);
    fila = addOffer(fila, o('r2'), 0);
    const memoria = rememberSilenced({}, fila[0], 0);
    const efetiva = applySilenced(fila, memoria);
    expect(efetiva.length).toBe(2); // a recusada continua na fila
    expect(activeOffer(efetiva)?.id).toBe('r2');
});

it('a recusa herda a renovação de prazo: a memória não vence antes da oferta', () => {
    // Recusa em t=0 uma oferta com prazo até 60s; como ela NÃO sai da fila, o
    // prazo da memória segue o mesmo instante absoluto enviado pelo backend, e
    // não há janela onde a oferta exista sem a memória.
    const fila = [{ id: 'r1', offerExpiresAt: '1970-01-01T00:01:00.000Z', receivedAt: 0 }];
    let memoria = rememberSilenced({}, fila[0], 0);
    memoria = forgetSilenced(memoria, fila, 59_000);
    expect(activeOffer(applySilenced(fila, memoria))).toBeUndefined();

    // Só quando a oferta some da fila por expiração é que a memória a esquece.
    const filaVazia = pruneExpired(fila, 61_000);
    expect(filaVazia.length).toBe(0);
    expect(forgetSilenced(memoria, filaVazia, 61_000)).toEqual({});
});

it('a memória de uma oferta não silencia as outras', () => {
    let fila = addOffer([], o('r1'), 0);
    fila = addOffer(fila, o('r2'), 0);
    const memoria = rememberSilenced({}, fila[0], 0);
    expect(activeOffer(applySilenced(fila, memoria))?.id).toBe('r2');
});
