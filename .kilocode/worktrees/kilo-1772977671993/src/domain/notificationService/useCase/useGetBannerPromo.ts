import { useQuery } from "@tanstack/react-query"

import { useAuthCredentialsService } from "@/services"
import { KEY_BANNER_PROMO } from "@/types/queryKey"

import { notificationService } from "../notificationService"


export function useGetBannerPromo() {
    const { authCredentials } = useAuthCredentialsService();

    const { data, isLoading, isError, isRefetching, refetch, error } = useQuery({
        queryKey: [KEY_BANNER_PROMO],
        queryFn: () => notificationService.getBannerPromo(),
        enabled: !!authCredentials, // Só executa quando o token estiver disponível
        retry: false,
        retryOnMount: false,
        refetchOnWindowFocus: false,
        // Não fazer retry automático em caso de erro 401 (evitar loops)
        retryDelay: 0,
    })

    return {
        bannerPromo: data?.result!,
        isLoadingBannerPromo: isLoading,
        isErrorBannerPromo: isError,
        error,
        refetch,
        isRefetchingBannerPromo: isRefetching
    }

}