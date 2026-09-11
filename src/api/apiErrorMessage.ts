/**
 * O interceptor (`apiConfig.ts:104,131`) rejeita um OBJETO `{ success, error: { message, code } }`,
 * não um `Error` — `error instanceof Error` nunca casa e a mensagem do backend se perdia.
 * `response.status` é preservado à parte pelo mesmo interceptor (`apiConfig.ts:107`).
 */
type ErroApi = { error?: { message?: string; code?: string }; message?: string; response?: { status?: number } };

// `baseResponseAdapter.toBaseResponseError` (linhas 35/63) preenche a mensagem
// com este texto fixo quando o servidor não manda nenhuma — não é uma
// mensagem de verdade, então não deve aparecer no toast no lugar do fallback
// que o chamador já escreveu pensando na ação (ex.: "Erro ao aceitar rota").
const MENSAGEM_GENERICA_DO_ADAPTER = 'Erro desconhecido';

export function mensagemDaApi(error: unknown, fallback: string): string {
    const e = error as ErroApi | undefined;
    const mensagem = e?.error?.message || e?.message;
    return mensagem && mensagem !== MENSAGEM_GENERICA_DO_ADAPTER ? mensagem : fallback;
}

/** Sem resposta do servidor (sem internet, timeout, DNS) — `baseResponseAdapter.ts:53`. */
export function erroDeRede(error: unknown): boolean {
    return (error as ErroApi | undefined)?.error?.code === 'AU-000';
}

/**
 * Erro sem resposta ÚTIL do servidor: sem rede OU o próprio servidor caiu
 * (5xx). Nos dois casos o estado da oferta não mudou de verdade — vale manter
 * na fila e deixar o motorista tentar de novo, ao contrário de um 4xx (409
 * tomada, 400 regra de negócio), que é uma resposta definitiva.
 */
export function erroTransitorio(error: unknown): boolean {
    const status = (error as ErroApi | undefined)?.response?.status;
    return erroDeRede(error) || (typeof status === 'number' && status >= 500);
}
