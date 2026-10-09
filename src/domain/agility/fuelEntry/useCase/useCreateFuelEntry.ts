import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_FUEL_ENTRIES } from '@/domain/queryKeys';

import type { ReceiptPhoto } from '../dto/types';
import { fuelEntryAPI } from '../fuelEntryAPI';
import type { FuelEntryPayload } from '../fuelEntryForm';

/**
 * `mutateAsync`: REJEITA no erro, e a tela mostra a frase no toast (sem o modal do useMutationService).
 * `onSettled`: o contexto (último odômetro) e "Meus abastecimentos" moram sob a mesma chave.
 */
export function useCreateFuelEntry() {
    const queryClient = useQueryClient();
    const { mutateAsync, isPending } = useMutation({
        mutationFn: (v: { payload: FuelEntryPayload; photo: ReceiptPhoto }) => fuelEntryAPI.create(v.payload, v.photo),
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: [KEY_FUEL_ENTRIES] });
        },
    });
    return { createFuelEntry: mutateAsync, isPending };
}
