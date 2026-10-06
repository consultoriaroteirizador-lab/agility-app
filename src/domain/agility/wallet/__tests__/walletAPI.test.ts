import { walletAPI } from '../walletAPI';

const mockPost = jest.fn();
const mockGet = jest.fn();
jest.mock('@/api/apiConfig', () => ({
    apiAgility: { post: (...a: unknown[]) => mockPost(...a), get: (...a: unknown[]) => mockGet(...a) },
}));

beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
});

describe('walletAPI.requestWithdrawal', () => {
    it('manda exatamente { amount, idempotencyKey } (forbidNonWhitelisted no back)', async () => {
        mockPost.mockResolvedValue({ data: { success: true, result: { id: 'w-1', status: 'PENDING' } } });

        const w = await walletAPI.requestWithdrawal({ amount: 5000, idempotencyKey: 'k-1' });

        expect(mockPost).toHaveBeenCalledWith('/wallet/withdrawal', { amount: 5000, idempotencyKey: 'k-1' });
        expect(w).toEqual({ id: 'w-1', status: 'PENDING' });
    });
});
