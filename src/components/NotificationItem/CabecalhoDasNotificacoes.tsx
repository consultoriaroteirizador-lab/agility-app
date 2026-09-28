import React from 'react';

import { measure } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';
import { TouchableOpacityBox } from '../RestyleComponent/RestyleComponent';
import { Text } from '../Text/Text';

interface CabecalhoDasNotificacoesProps {
    naoLidas: number;
    marcando?: boolean;
    onMarcarTodas: () => void;
}

export function rotuloDeNaoLidas(naoLidas: number): string {
    if (naoLidas === 0) return 'Nenhuma não lida';
    return naoLidas === 1 ? '1 não lida' : `${naoLidas} não lidas`;
}

/**
 * Topo da aba Notificações: UMA contagem de não lidas (a que antes aparecia duas vezes, numa
 * pílula solta e no título da seção) e a ação "Marcar todas como lidas", desligada quando não
 * há o que marcar ou enquanto a marcação está em curso.
 */
export function CabecalhoDasNotificacoes({ naoLidas, marcando = false, onMarcarTodas }: CabecalhoDasNotificacoesProps) {
    const desabilitado = naoLidas === 0 || marcando;
    const rotulo = rotuloDeNaoLidas(naoLidas);

    return (
        <Box flexDirection="row" alignItems="center" justifyContent="space-between" marginBottom="y16">
            <Text
                preset="text14"
                color="gray700"
                accessibilityRole="header"
                accessibilityLabel={`Notificações: ${rotulo}`}
            >
                {rotulo}
            </Text>
            <TouchableOpacityBox
                testID="marcar-todas-como-lidas"
                onPress={onMarcarTodas}
                disabled={desabilitado}
                accessibilityRole="button"
                accessibilityState={{ disabled: desabilitado, busy: marcando }}
                accessibilityLabel="Marcar todas como lidas"
                accessibilityHint={desabilitado && !marcando ? 'Não há notificações não lidas' : undefined}
                hitSlop={measure.x8}
                paddingVertical="y4"
            >
                <Text preset="text14" fontWeightPreset="semibold" color={desabilitado ? 'mutedElementsColor' : 'primary100'}>
                    {marcando ? 'Marcando…' : 'Marcar todas como lidas'}
                </Text>
            </TouchableOpacityBox>
        </Box>
    );
}
