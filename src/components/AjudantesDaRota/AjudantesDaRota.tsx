import { useState } from 'react'

import { Box, Text, TouchableOpacityBox, PessoaContatoRow } from '@/components'
import { Icon } from '@/components/Icon/Icon'
import type { RoutingHelperResponse } from '@/domain/agility/routing/dto'
import { measure } from '@/theme'

interface AjudantesDaRotaProps {
    ajudantes: RoutingHelperResponse[] | undefined
}

/**
 * Quem está nesta viagem junto com o motorista, num bloco recolhível.
 *
 * Aparece no detalhe da rota e no card da lista de rotas — o mesmo componente
 * nos dois lugares, para o motorista ver a tripulação antes de começar.
 *
 * Renderiza `null` quando não há ajudante: rota sem tripulação extra é o caso
 * comum, e um título com lista vazia só ocuparia a tela e sugeriria que alguém
 * deveria estar ali. Isso também cobre o período em que o backend que devolve
 * `helpers` na listagem ainda não estiver deployado.
 *
 * Nasce SEMPRE fechado, e o estado não persiste: sair da tela e voltar recomeça
 * recolhido. Persistir exigiria decidir a chave (por rota? por sessão?) sem que
 * ninguém tenha pedido isso.
 */
export function AjudantesDaRota({ ajudantes }: AjudantesDaRotaProps) {
    const [aberto, setAberto] = useState(false)

    if (!ajudantes?.length) return null

    const total = ajudantes.length
    const rotulo = total === 1 ? '1 ajudante' : `${total} ajudantes`

    return (
        <Box marginBottom="y16">
            <TouchableOpacityBox
                flexDirection="row"
                alignItems="center"
                gap="x8"
                paddingVertical="y8"
                onPress={() => setAberto((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: aberto }}
                accessibilityLabel={`${rotulo} nesta rota. Toque para ${aberto ? 'recolher' : 'ver'}.`}
                hitSlop={measure.x8}
            >
                <Icon name="group" size={measure.m20} color="gray500" />
                <Text
                    preset="text14"
                    fontWeightPreset="bold"
                    color="colorTextPrimary"
                    style={{ flex: 1 }}
                >
                    {rotulo}
                </Text>
                <Icon
                    name={aberto ? 'expand-less' : 'expand-more'}
                    size={measure.m20}
                    color="gray400"
                />
            </TouchableOpacityBox>

            {aberto &&
                ajudantes.map((ajudante) => (
                    <PessoaContatoRow
                        key={ajudante.id}
                        nome={ajudante.helperName ?? 'Ajudante sem nome'}
                        telefone={ajudante.helperPhone ?? null}
                    />
                ))}
        </Box>
    )
}
