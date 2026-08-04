import { Box, Text, PessoaContatoRow } from '@/components'
import type { RoutingHelperResponse } from '@/domain/agility/routing/dto'

interface AjudantesDaRotaProps {
    ajudantes: RoutingHelperResponse[] | undefined
}

/**
 * Quem está nesta viagem junto com o motorista.
 *
 * Renderiza `null` quando não há ajudante: rota sem tripulação extra é o caso
 * comum, e um título com lista vazia só ocuparia a tela e sugeriria que alguém
 * deveria estar ali.
 */
export function AjudantesDaRota({ ajudantes }: AjudantesDaRotaProps) {
    if (!ajudantes?.length) return null

    return (
        <Box marginBottom="y24">
            <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary" marginBottom="y8">
                {ajudantes.length === 1 ? 'Ajudante nesta rota' : 'Ajudantes nesta rota'}
            </Text>

            {ajudantes.map((ajudante) => (
                <PessoaContatoRow
                    key={ajudante.id}
                    nome={ajudante.helperName ?? 'Ajudante sem nome'}
                    telefone={ajudante.helperPhone ?? null}
                />
            ))}
        </Box>
    )
}
