const mockManipulate = jest.fn();
jest.mock('expo-image-manipulator', () => ({
    manipulateAsync: (...a: unknown[]) => mockManipulate(...a),
    SaveFormat: { JPEG: 'jpeg' },
}));

import { compressReceipt } from '../receiptPhoto';

beforeEach(() => mockManipulate.mockReset().mockResolvedValue({ uri: 'file://comprimida.jpg' }));

it('retrato: limita a ALTURA e mantém a proporção', async () => {
    await expect(compressReceipt({ uri: 'file://o.jpg', width: 3000, height: 4000 })).resolves.toBe('file://comprimida.jpg');
    expect(mockManipulate).toHaveBeenCalledWith('file://o.jpg', [{ resize: { height: 1600 } }], { compress: 0.7, format: 'jpeg' });
});

it('paisagem: limita a LARGURA', async () => {
    await compressReceipt({ uri: 'file://o.jpg', width: 4000, height: 3000 });
    expect(mockManipulate.mock.calls[0][1]).toEqual([{ resize: { width: 1600 } }]);
});

it('foto pequena não é ampliada, só recomprimida', async () => {
    await compressReceipt({ uri: 'file://o.jpg', width: 800, height: 600 });
    expect(mockManipulate.mock.calls[0][1]).toEqual([]);
});

it('falha na compressão: segue com a original', async () => {
    mockManipulate.mockRejectedValue(new Error('x'));
    await expect(compressReceipt({ uri: 'file://o.jpg', width: 3000, height: 4000 })).resolves.toBe('file://o.jpg');
});
