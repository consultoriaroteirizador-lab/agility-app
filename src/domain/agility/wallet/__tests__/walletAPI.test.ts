import { AdvanceStatus } from '../dto/types';
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

describe('walletAPI.getAdvances', () => {
    it('sem status: só página e limite (o back lista todos)', async () => {
        mockGet.mockResolvedValue({ data: { success: true, result: { data: [], meta: { page: 1, totalPages: 1 } } } });
        await walletAPI.getAdvances(2, 20);
        expect(mockGet).toHaveBeenCalledWith('/wallet/advances', { params: { page: 2, limit: 20 } });
    });

    it('com status: vírgula, no formato que o back aceita', async () => {
        mockGet.mockResolvedValue({ data: { success: true, result: { data: [], meta: { page: 1, totalPages: 1 } } } });
        await walletAPI.getAdvances(1, 20, [AdvanceStatus.PENDING, AdvanceStatus.PARTIAL]);
        expect(mockGet).toHaveBeenCalledWith('/wallet/advances', { params: { page: 1, limit: 20, status: 'PENDING,PARTIAL' } });
    });
});
