import { OPERATION_TIMEZONE } from './setup-timezone';

/**
 * Guard do pino de fuso: roda em cada worker, antes dos testes.
 *
 * Ler o fuso efetivo funciona dentro do sandbox do jest (só a ESCRITA em
 * `process.env.TZ` é que não chega no V8 — ver `test/setup-timezone.ts`).
 * Se alguém "simplificar" o `globalSetup` para um `setupFiles`, ou trocar a
 * config por uma que não carregue o setup, a suíte para aqui em vez de voltar
 * calada a rodar no relógio da máquina de quem executa.
 *
 * Registrado em `setupFilesAfterEnv`, e NÃO em `setupFiles`, de propósito: o
 * preset `jest-expo` já define `setupFiles` (os mocks de `react-native` e do
 * Expo), e no jest a config do projeto SUBSTITUI a do preset em vez de somar —
 * declarar `setupFiles` aqui apagaria os dois e derrubaria a suíte inteira.
 */
const effectiveTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

if (effectiveTimezone !== OPERATION_TIMEZONE) {
    throw new Error(
        `Fuso da suíte não foi aplicado: esperado "${OPERATION_TIMEZONE}", efetivo "${effectiveTimezone}". ` +
            `O pino vive em test/setup-timezone.ts e PRECISA estar registrado como "globalSetup" ` +
            `(em setupFiles ele não tem efeito). Sem ele os testes de data rodam no fuso da máquina.`,
    );
}
