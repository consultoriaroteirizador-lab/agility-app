// import {useToastContext} from './useToastContext';
import { ToastService } from './ToastType';
import { useToastServiceZustand, useToastZustand } from './useToastZustand';


export function useToast(): ToastService['toast'] {
    return useToastZustand();
}

export function useToastService(): Pick<
    ToastService,
    'showToast' | 'hideToast'
> {
    return useToastServiceZustand();
}