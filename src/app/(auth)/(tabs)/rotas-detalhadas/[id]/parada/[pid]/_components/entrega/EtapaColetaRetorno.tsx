import { useParada } from '../../_context/ParadaContext';

import { EtapaCheckItens } from './EtapaCheckItens';

/**
 * Etapa de coleta de retorno (devolução no mesmo stop da entrega).
 *
 * Aparece no fluxo de ENTREGA quando a parada tem `hasReturn` — após o motorista
 * confirmar a entrega e checar os itens entregues, ele confere os itens que está
 * RECOLHENDO (materiais direction=PICKUP, ex.: devolução, casco vazio).
 *
 * Reaproveita o check de materiais (estratégia "via check de material"): cada item
 * de retorno é conferido via PATCH /services/:id/materials/:mid/check, que o app já
 * usa. A finalização única no fim do wizard fecha entrega + retorno.
 */
export function EtapaColetaRetorno() {
    const { completeReturnCheck } = useParada();

    return (
        <EtapaCheckItens
            direction="PICKUP"
            title="Coleta de Retorno"
            summaryLabel="Itens para recolher (devolução)"
            emptyLabel="Nenhum item de retorno cadastrado para esta parada"
            onComplete={completeReturnCheck}
        />
    );
}
