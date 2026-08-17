import { createSingleFlight } from '../singleFlight';

/** Promessa que só resolve quando o teste mandar. */
function deferred<T = void>() {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe('createSingleFlight', () => {
    it('com a MESMA chave em voo, executa uma vez só e devolve a mesma promessa', async () => {
        const run = createSingleFlight<string>();
        const d = deferred<string>();
        const op = jest.fn(() => d.promise);

        const a = run('driver-1', op);
        const b = run('driver-1', op);

        expect(op).toHaveBeenCalledTimes(1);
        expect(a).toBe(b);

        d.resolve('ok');
        await expect(a).resolves.toBe('ok');
        await expect(b).resolves.toBe('ok');
    });

    it('libera a trava ao terminar — a próxima chamada executa de novo', async () => {
        const run = createSingleFlight<string>();
        const op = jest.fn().mockResolvedValue('ok');

        await run('driver-1', op);
        await run('driver-1', op);

        expect(op).toHaveBeenCalledTimes(2);
    });

    // Sem isto, um start que falha travaria o app para sempre: nenhuma tentativa
    // posterior rodaria, porque a trava nunca seria devolvida.
    it('libera a trava também quando a execução FALHA', async () => {
        const run = createSingleFlight<string>();
        const op = jest.fn()
            .mockRejectedValueOnce(new Error('sem permissão'))
            .mockResolvedValueOnce('ok');

        await expect(run('driver-1', op)).rejects.toThrow('sem permissão');
        await expect(run('driver-1', op)).resolves.toBe('ok');
        expect(op).toHaveBeenCalledTimes(2);
    });

    it('propaga a falha para quem estava pendurado na mesma promessa', async () => {
        const run = createSingleFlight<string>();
        const d = deferred<string>();
        const op = jest.fn(() => d.promise);

        const a = run('driver-1', op);
        const b = run('driver-1', op);

        d.reject(new Error('falhou'));

        await expect(a).rejects.toThrow('falhou');
        await expect(b).rejects.toThrow('falhou');
    });

    // Chave diferente NÃO pode rodar junto: o ponto da trava é que nunca existam
    // duas execuções simultâneas. A segunda espera a primeira terminar.
    it('com chave DIFERENTE, enfileira em vez de rodar simultaneamente', async () => {
        const run = createSingleFlight<string>();
        const d1 = deferred<string>();
        const op1 = jest.fn(() => d1.promise);
        const op2 = jest.fn().mockResolvedValue('segundo');

        const a = run('driver-1', op1);
        const b = run('driver-2', op2);

        // Enquanto o primeiro não terminou, o segundo nem começou.
        await Promise.resolve();
        expect(op2).not.toHaveBeenCalled();

        d1.resolve('primeiro');
        await expect(a).resolves.toBe('primeiro');
        await expect(b).resolves.toBe('segundo');
        expect(op2).toHaveBeenCalledTimes(1);
    });

    it('enfileira a chave diferente mesmo se a primeira FALHAR', async () => {
        const run = createSingleFlight<string>();
        const d1 = deferred<string>();
        const op1 = jest.fn(() => d1.promise);
        const op2 = jest.fn().mockResolvedValue('segundo');

        const a = run('driver-1', op1);
        const b = run('driver-2', op2);

        d1.reject(new Error('primeiro falhou'));

        await expect(a).rejects.toThrow('primeiro falhou');
        await expect(b).resolves.toBe('segundo');
    });
});
