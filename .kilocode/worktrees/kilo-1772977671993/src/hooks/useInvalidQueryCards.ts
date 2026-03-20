import { useQueryClient } from "@tanstack/react-query";

import { KEY_DASHBOARD_CARDS } from "@/types/queryKey";



export function useInvalidQueryCards() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({
            queryKey: [KEY_DASHBOARD_CARDS],
        });
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
