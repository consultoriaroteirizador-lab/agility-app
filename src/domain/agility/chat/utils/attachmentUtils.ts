/**
 * Diz se o anexo já pode ser aberto pelo visualizador do sistema.
 *
 * O backend guarda a chave (`chat/<empresa>/arquivo.ext`) e só assina a URL ao
 * listar as mensagens. Enquanto a bolha é otimista, a URI é local (`file://`,
 * `content://`). Nos dois casos o `Linking` não abre nada, então o card fica
 * sem ação em vez de falhar na cara do motorista.
 */
export function isOpenableAttachmentUrl(url?: string | null): boolean {
    if (!url) return false;
    return /^https?:\/\//i.test(url.trim());
}
