/**
 * Trava de execução única para operações assíncronas do SDK.
 *
 * Existe por causa de um erro real e recorrente no console:
 * `Erro ao iniciar tracking: Error: Waiting for previous start action to
 * complete`. O SDK da TransistorSoft rejeita um `start()` emitido enquanto
 * outro ainda não terminou, e o caminho de start do app não tinha como impedir
 * isso: a guarda em `startLocationTracking` lia `trackingState.isTracking`, uma
 * flag de módulo que só vira `true` DEPOIS do `await BackgroundGeolocation
 * .start()`. Entre a guarda e a atribuição existem três `await` — inclusive
 * `ensureTrackingPermissions()`, que no Android abre o diálogo de otimização de
 * bateria e pode ficar segundos esperando o usuário. Duas chamadas nessa janela
 * passavam as duas.
 *
 * É um check-then-act: nenhuma leitura de flag resolve, porque a janela é entre
 * a leitura e a escrita. Guardar a PROMESSA em voo resolve por construção — não
 * por temporização.
 *
 * A chave é o que identifica a operação (o `driverId`, no caso do start):
 *  - mesma chave em voo  -> devolve A MESMA promessa (ninguém dispara de novo);
 *  - chave diferente     -> ENFILEIRA depois da atual, porque rodar junto é
 *                           exatamente o que se quer evitar. Vale para o
 *                           logout→login com outro motorista no meio do start.
 */
export function createSingleFlight<T>() {
    let current: { key: string; promise: Promise<T> } | null = null;

    return function run(key: string, op: () => Promise<T>): Promise<T> {
        if (current && current.key === key) return current.promise;

        // `then(op, op)`: a fila anda mesmo se a operação anterior falhar — uma
        // falha de permissão do motorista A não pode deixar o B sem tracking.
        const previous = current?.promise;
        const promise = previous ? previous.then(() => op(), () => op()) : op();

        const entry = { key, promise };
        current = entry;

        // Devolve a trava quando ESTA execução termina, em sucesso ou falha (sem
        // a segunda metade, um start que falha travaria o app para sempre). O
        // `current === entry` evita apagar uma entrada mais nova que já assumiu
        // o lugar. `then(fn, fn)` e não `finally`: além de tratar os dois casos,
        // consome a rejeição desta cadeia de bookkeeping, que ninguém aguarda —
        // com `finally` ela viraria unhandled rejection.
        const release = () => {
            if (current === entry) current = null;
        };
        promise.then(release, release);

        return promise;
    };
}
