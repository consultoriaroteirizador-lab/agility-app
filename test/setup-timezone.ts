/**
 * Fuso da suíte de testes — fixado ANTES de os workers do jest nascerem.
 *
 * POR QUE ISTO NÃO É "o fuso de produção":
 * este app roda no CELULAR do motorista, então o fuso de produção é o do
 * aparelho — não há servidor cujo relógio copiar. O pino serve para
 * DETERMINISMO: a operação da Agility é no Brasil, então a suíte assume o fuso
 * da OPERAÇÃO (America/Sao_Paulo, UTC-3 o ano todo desde o fim do horário de
 * verão em 2019) em vez do fuso de quem executa o teste. Consequência prática:
 * as funções de dia-calendário passam a ser exercitadas em offset NEGATIVO, que
 * é onde o bug de off-by-one aparece — em UTC ele some.
 *
 * POR QUE `globalSetup` E NÃO `setupFiles` (nem um assign no topo do spec):
 * dentro de um teste — e dentro de um `setupFiles` — `process` é um objeto do
 * SANDBOX do jest, não o `process` real. Escrever `process.env.TZ = '...'` lá
 * guarda a string na cópia e o V8 nunca é notificado: `getHours()` e
 * `toLocaleTimeString()` continuam no fuso com que o processo subiu. Medido em
 * 07/08/2026 (Node 22): com `TZ=UTC` externo, `dateFunctions.test.ts` falhava
 * 3 de 7 APESAR do `process.env.TZ` no topo do arquivo. O comentário lá ("Node
 * relê o TZ em runtime") vale para Node puro, mas não sob o jest.
 * O `globalSetup` roda no processo principal, fora do sandbox, então a
 * atribuição vale de verdade e os workers herdam o env ao serem forkados.
 *
 * O guard que confere se isto pegou está em `test/assert-timezone.ts`
 * (registrado em `setupFilesAfterEnv`, porque `setupFiles` pertence ao preset
 * `jest-expo` — ver o comentário lá) — ler o fuso efetivo funciona no sandbox,
 * só escrever é que não.
 */
export const OPERATION_TIMEZONE = 'America/Sao_Paulo';

export default async function setupTimezone(): Promise<void> {
    process.env.TZ = OPERATION_TIMEZONE;
}
