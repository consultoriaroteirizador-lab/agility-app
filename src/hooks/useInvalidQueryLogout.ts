import { useQueryClient } from "@tanstack/react-query";

import { isDevelopment } from "@/config/environment";

export function useInvalidQueryLogout() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.clear();
        if (isDevelopment) console.log('[Logout] Cache do React Query completamente limpo');
    };
}


// export function useInvalidQueryFindTransactionRequestByIdAndCardNumber() {
//     const queryClient = useQueryClient();

//     return () => {
//         queryClient.invalidateQueries({
//             queryKey: [KEY_FIND_TRANSACTION_REQUEST_BY_ID_AND_CARD_NUMBER],
//         });
//     };
// }

// export function useInvalidQueryFindTransactionRequestByCardNumber(cardNumber: string) {
//     const queryClient = useQueryClient();

//     return () => {
//         queryClient.invalidateQueries({
//             queryKey: [KEY_FIND_TRANSACTION_REQUEST_BY_CARD_NUMBER + cardNumber],
//         });
//     };
// }
