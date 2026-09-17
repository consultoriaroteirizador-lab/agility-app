import { isRemoteUrl } from './messageUtils';

/**
 * Diz se o anexo já pode ser aberto pelo visualizador do sistema.
 *
 * O backend guarda a chave (`chat/<empresa>/arquivo.ext`) e só assina a URL ao
 * listar as mensagens. Enquanto a bolha é otimista, a URI é local (`file://`,
 * `content://`). Nos dois casos o `Linking` não abre nada, então o card fica
 * sem ação em vez de falhar na cara do motorista.
 *
 * A regra é a mesma de `isRemoteUrl`, que a fila de envio já usava: este nome
 * continua aqui porque a tela e os testes da PR #52 o importam, mas a lógica
 * mora num lugar só.
 */
export function isOpenableAttachmentUrl(url?: string | null): boolean {
    return isRemoteUrl(url?.trim());
}
