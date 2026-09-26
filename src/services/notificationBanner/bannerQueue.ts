import type { NotificationResponse } from '@/domain/agility/notification/dto';
import { NotificationStatus, NotificationType } from '@/domain/agility/notification/dto';
import {
    caminhoComparavelDoDestino,
    normalizarCaminho,
    resolverDestinoDaNotificacao,
} from '@/domain/agility/notification/notificationTarget';

/**
 * Notificação mais velha que isto não vira banner. O gateway `/notifications` não reenvia nada
 * na conexão hoje, mas se um dia reenviar, o banner não deve anunciar como novidade o que
 * aconteceu há muito tempo. A folga larga cobre relógio do aparelho fora de hora.
 */
export const IDADE_MAXIMA_MS = 5 * 60 * 1000;

/** Quantos ids já tratados o banner lembra, para não repetir o mesmo aviso. */
export const LIMITE_VISTOS = 100;

export interface ContextoDoBanner {
    /** `usePathname()` no momento em que a notificação chegou. */
    caminhoAtual: string;
    agora: number;
}

export type MotivoDeSupressao = 'invalida' | 'duplicada' | 'lida' | 'antiga' | 'oferta' | 'tela-atual';

export type DecisaoDoBanner = { exibir: true } | { exibir: false; motivo: MotivoDeSupressao };

/**
 * O motorista já está onde a notificação levaria — a conversa aberta, a rota aberta. Aí o banner
 * não acrescenta nada: a própria tela já está mostrando (ou vai buscar) a novidade.
 */
export function destinoEhTelaAtual(notificacao: NotificationResponse, caminhoAtual: string): boolean {
    const destino = resolverDestinoDaNotificacao(notificacao);
    const caminhoDestino = destino ? caminhoComparavelDoDestino(destino) : null;
    return !!caminhoDestino && caminhoDestino === normalizarCaminho(caminhoAtual);
}

export function avaliarNotificacao(
    notificacao: NotificationResponse,
    vistos: ReadonlySet<string>,
    contexto: ContextoDoBanner,
): DecisaoDoBanner {
    if (!notificacao?.id) return { exibir: false, motivo: 'invalida' };
    if (vistos.has(notificacao.id)) return { exibir: false, motivo: 'duplicada' };
    if (notificacao.status === NotificationStatus.READ) return { exibir: false, motivo: 'lida' };

    const criadaEm = Date.parse(notificacao.createdAt);
    if (Number.isFinite(criadaEm) && contexto.agora - criadaEm > IDADE_MAXIMA_MS) {
        return { exibir: false, motivo: 'antiga' };
    }

    // A oferta de rota já tem o alerta dela (OfferAlertProvider), com Aceitar/Recusar.
    // Um banner por cima seria o mesmo aviso duas vezes.
    if (notificacao.type === NotificationType.ROUTE_OFFER) return { exibir: false, motivo: 'oferta' };

    if (destinoEhTelaAtual(notificacao, contexto.caminhoAtual)) return { exibir: false, motivo: 'tela-atual' };

    return { exibir: true };
}

export interface EstadoDoBanner {
    /** A notificação na tela (ou esperando o alerta de oferta fechar). Sempre a mais nova. */
    atual: NotificationResponse | null;
    /** Quantas chegaram antes da atual sem o motorista dispensar — o "+N novas". */
    novas: number;
    /** Ids já tratados (exibidos OU suprimidos), do mais antigo para o mais novo. */
    vistos: string[];
}

export const ESTADO_INICIAL_BANNER: EstadoDoBanner = { atual: null, novas: 0, vistos: [] };

export type AcaoDoBanner =
    | { tipo: 'recebida'; notificacao: NotificationResponse; contexto: ContextoDoBanner }
    | { tipo: 'dispensada' };

function lembrar(vistos: string[], id: string): string[] {
    const proximo = [...vistos, id];
    return proximo.length > LIMITE_VISTOS ? proximo.slice(proximo.length - LIMITE_VISTOS) : proximo;
}

/**
 * Fila do banner: um banner só, sempre com a notificação mais nova, e um contador das que
 * chegaram por cima. Nada se empilha. O alerta de oferta não entra aqui: enquanto ele estiver
 * na tela o provider só não DESENHA o banner, e a fila segue acumulando — quando a oferta fecha,
 * aparece a mais nova com o contador.
 */
export function reduzirBanner(estado: EstadoDoBanner, acao: AcaoDoBanner): EstadoDoBanner {
    switch (acao.tipo) {
        case 'recebida': {
            const decisao = avaliarNotificacao(acao.notificacao, new Set(estado.vistos), acao.contexto);
            if (!decisao.exibir) {
                if (decisao.motivo === 'duplicada' || decisao.motivo === 'invalida') return estado;
                return { ...estado, vistos: lembrar(estado.vistos, acao.notificacao.id) };
            }
            return {
                atual: acao.notificacao,
                novas: estado.atual ? estado.novas + 1 : 0,
                vistos: lembrar(estado.vistos, acao.notificacao.id),
            };
        }
        case 'dispensada':
            if (!estado.atual && estado.novas === 0) return estado;
            return { ...estado, atual: null, novas: 0 };
        default:
            return estado;
    }
}
