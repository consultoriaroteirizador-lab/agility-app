/**
 * Cor das ações por tipo de nota.
 *
 * O fluxo de serviço reusa os componentes do fluxo de entrega, então a cor do
 * botão não vem do componente — vem do tema que o `ServiceFlowTheme` instala.
 * Este teste guarda esse contrato: nota SERVICE pinta os destaques de laranja,
 * qualquer outra (e a nota que ainda não chegou do fetch) continua roxa.
 */
import React from 'react';

import { useTheme } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { ServiceType } from '@/domain/agility/service/dto/types';
import { colors, Theme } from '@/theme';

import { ServiceFlowTheme } from '../ServiceFlowTheme';

/** Sonda: devolve os tokens de destaque que o provider entrega à árvore. */
function tokensPara(props: { serviceType?: ServiceType | string | null; isFieldService?: boolean }) {
    let vistos = { botao: '', destaque: '', fundoClaro: '' };

    function Sonda() {
        const { colors: c } = useTheme<Theme>();
        vistos = { botao: c.colorBackgroundMainButton, destaque: c.primary100, fundoClaro: c.primary10 };
        return null;
    }

    act(() => {
        TestRenderer.create(
            <ServiceFlowTheme {...props}>
                <Sonda />
            </ServiceFlowTheme>,
        );
    });

    return vistos;
}

describe('ServiceFlowTheme', () => {
    it('pinta os destaques de laranja quando a nota é SERVICE', () => {
        expect(tokensPara({ serviceType: ServiceType.SERVICE })).toEqual({
            botao: colors.secondary100,
            destaque: colors.secondary100,
            fundoClaro: colors.secondary10,
        });
    });

    it.each([ServiceType.DELIVERY, ServiceType.PICKUP, ServiceType.TRANSFER, ServiceType.RETURN])(
        'mantém o roxo em %s',
        (serviceType) => {
            expect(tokensPara({ serviceType })).toEqual({
                botao: colors.primary100,
                destaque: colors.primary100,
                fundoClaro: colors.primary10,
            });
        },
    );

    it('mantém o roxo enquanto a nota ainda não chegou do fetch', () => {
        expect(tokensPara({})).toEqual({
            botao: colors.primary100,
            destaque: colors.primary100,
            fundoClaro: colors.primary10,
        });
    });

    it('pinta os destaques de laranja quando a ROTA é de serviço em campo', () => {
        expect(tokensPara({ isFieldService: true })).toEqual({
            botao: colors.secondary100,
            destaque: colors.secondary100,
            fundoClaro: colors.secondary10,
        });
    });

    it('mantém o roxo quando a rota não é de serviço em campo', () => {
        expect(tokensPara({ isFieldService: false })).toEqual({
            botao: colors.primary100,
            destaque: colors.primary100,
            fundoClaro: colors.primary10,
        });
    });
});
