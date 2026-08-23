/**
 * `readyAfterChecks` de cada fluxo — a pergunta "ja terminei os meus checks
 * proprios (itens, formulario dinamico, retorno)?" que cada `index.tsx` passa
 * para `resolveCompletionStep`.
 *
 * Antes vivia solta, inline, dentro de cada orchestrator — sem teste proprio
 * e sem nada que protegesse a expressao de um erro de digitacao (por exemplo
 * trocar um `&&` por `||`, ou esquecer um dos checks). Extraida aqui para ser
 * testada isoladamente.
 *
 * O `transfer` e o caso mais perigoso: e o unico com `requirements` dinamico
 * (o bucket depende de `sharedType`, que por sua vez depende de `isPickup`).
 * Se alguem inverter `isPickup` ou fixar `sharedType` num valor constante em
 * `transfer/index.tsx`, nem o `tsc` nem a suite pegam — os dois continuam
 * `'coleta' | 'entrega'` validos. Por isso `transferReadyAfterChecks` devolve
 * o par (`readyAfterChecks`, `sharedType`) como uma unidade so, testada junto:
 * o teste que prende `sharedType` a `isPickup` fica num lugar so, em vez de
 * depender de quem le `transfer/index.tsx` reparar a relacao a olho.
 */

export interface EntregaReadyInput {
    delivered: boolean
    needsDeliveryCheck: boolean
    needsReturnCheck: boolean
    hasFormGroups: boolean
    formCompleted: boolean
}

export function entregaReadyAfterChecks({
    delivered,
    needsDeliveryCheck,
    needsReturnCheck,
    hasFormGroups,
    formCompleted,
}: EntregaReadyInput): boolean {
    return delivered && !needsDeliveryCheck && !needsReturnCheck && (!hasFormGroups || formCompleted)
}

export interface ColetaReadyInput {
    delivered: boolean
    needsMaterialCheck: boolean
    hasFormGroups: boolean
    formCompleted: boolean
}

export function coletaReadyAfterChecks({
    delivered,
    needsMaterialCheck,
    hasFormGroups,
    formCompleted,
}: ColetaReadyInput): boolean {
    return delivered && !needsMaterialCheck && (!hasFormGroups || formCompleted)
}

export interface ServicoReadyInput {
    delivered: boolean
    hasFormGroups: boolean
    formCompleted: boolean
}

export function servicoReadyAfterChecks({ delivered, hasFormGroups, formCompleted }: ServicoReadyInput): boolean {
    return delivered && (!hasFormGroups || formCompleted)
}

export type TransferSharedType = 'coleta' | 'entrega'

export interface TransferReadyInput {
    /** true na perna de coleta (origem), false na de entrega (destino). */
    isPickup: boolean
    delivered: boolean
    needsCheck: boolean
}

export interface TransferReadyResult {
    readyAfterChecks: boolean
    /** Bucket de requisitos a usar — sempre o espelho de `isPickup`. */
    sharedType: TransferSharedType
}

export function transferReadyAfterChecks({ isPickup, delivered, needsCheck }: TransferReadyInput): TransferReadyResult {
    return {
        readyAfterChecks: delivered && !needsCheck,
        sharedType: isPickup ? 'coleta' : 'entrega',
    }
}
