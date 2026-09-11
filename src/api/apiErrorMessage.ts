/**
 * O interceptor (`apiConfig.ts:104,131`) rejeita um OBJETO `{ success, error: { message, code } }`,
 * não um `Error` — `error instanceof Error` nunca casa e a mensagem do backend se perdia.
 */
type ErroApi = { error?: { message?: string; code?: string }; message?: string };

export function mensagemDaApi(error: unknown, fallback: string): string {
    const e = error as ErroApi | undefined;
    return e?.error?.message || e?.message || fallback;
}

/** Sem resposta do servidor (sem internet, timeout, DNS) — `baseResponseAdapter.ts:53`. */
export function erroDeRede(error: unknown): boolean {
    return (error as ErroApi | undefined)?.error?.code === 'AU-000';
}
