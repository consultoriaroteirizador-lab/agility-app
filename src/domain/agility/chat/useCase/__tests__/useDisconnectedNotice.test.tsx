import React from 'react';

import TestRenderer, { act } from 'react-test-renderer';

import { useDisconnectedNotice } from '../useDisconnectedNotice';

let visible = false;
function Probe({ connected }: { connected: boolean }) {
    visible = useDisconnectedNotice(connected, 3000);
    return null;
}

let tree: TestRenderer.ReactTestRenderer | null = null;

function render(connected: boolean) {
    act(() => {
        tree = TestRenderer.create(<Probe connected={connected} />);
    });
    return tree!;
}

beforeEach(() => {
    jest.useFakeTimers();
    visible = false;
});

afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = null;
    jest.clearAllTimers();
    jest.useRealTimers();
});

describe('useDisconnectedNotice', () => {
    it('so mostra depois de 3s desconectado (sem piscar na conexao inicial)', () => {
        render(false);
        act(() => jest.advanceTimersByTime(2999));
        expect(visible).toBe(false);
        act(() => jest.advanceTimersByTime(1));
        expect(visible).toBe(true);
    });

    it('some na hora ao reconectar', () => {
        const t = render(false);
        act(() => jest.advanceTimersByTime(3000));
        expect(visible).toBe(true);
        act(() => t.update(<Probe connected />));
        expect(visible).toBe(false);
    });

    it('reconectar antes do prazo nao mostra nada', () => {
        const t = render(false);
        act(() => jest.advanceTimersByTime(1000));
        act(() => t.update(<Probe connected />));
        act(() => jest.advanceTimersByTime(5000));
        expect(visible).toBe(false);
    });
});
