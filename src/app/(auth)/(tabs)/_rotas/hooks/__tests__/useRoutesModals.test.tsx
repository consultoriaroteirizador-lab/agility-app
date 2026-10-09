/**
 * Tocar no cartão de uma rota ainda não iniciada abre a prévia (as paradas, com o botão
 * Iniciar) em vez de pedir para iniciar direto (decisão de 09/10/2026).
 */
import React from 'react';

import TestRenderer, { act } from 'react-test-renderer';

import { useRoutesModals } from '../useRoutesModals';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

type Retorno = ReturnType<typeof useRoutesModals>;

function montar(isAvailable: boolean) {
    let atual!: Retorno;
    function Probe() {
        atual = useRoutesModals(isAvailable);
        return null;
    }
    act(() => {
        TestRenderer.create(<Probe />);
    });
    return () => atual;
}

beforeEach(() => mockPush.mockClear());

it('rota a iniciar abre a prévia, sem pedir para iniciar no toque', () => {
    const hook = montar(true);

    act(() => hook().openRoute('rota-1'));

    expect(mockPush).toHaveBeenCalledWith('/(auth)/(tabs)/rotas-detalhadas/rota-1');
    // O hook não tem mais popup de iniciar: o início é pelo botão da prévia.
    expect(Object.keys(hook()).sort()).toEqual(['closeUnavailablePopup', 'openRoute', 'unavailablePopup']);
});

it('motorista indisponível vê o aviso e não abre a rota', () => {
    const hook = montar(false);

    act(() => hook().openRoute('rota-1'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(hook().unavailablePopup).toBe(true);

    act(() => hook().closeUnavailablePopup());
    expect(hook().unavailablePopup).toBe(false);
});
