import { useInfinitePagedList } from '@/domain/hooks/useInfinitePagedList';
import { KEY_FUEL_ENTRIES } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import type { FuelEntry } from '../dto/types';
import { fuelEntryAPI } from '../fuelEntryAPI';

const PAGE_SIZE = 20;

/** "Meus abastecimentos", mais novo primeiro (`GET /fuel-entries/me`). */
export function useInfiniteMyFuelEntries() {
    const { authCredentials } = useAuthCredentialsService();
    const enabled = !!authCredentials?.accessToken && !!authCredentials?.tenantId;
    return useInfinitePagedList<FuelEntry>([KEY_FUEL_ENTRIES, 'mine', 'infinite'], (page) => fuelEntryAPI.listMine(page, PAGE_SIZE), { enabled });
}
