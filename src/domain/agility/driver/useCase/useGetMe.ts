import { useQuery } from '@tanstack/react-query'

import { KEY_DRIVER } from '@/domain/queryKeys'

import { driverService } from '../driverService'

/**
 * Perfil do motorista logado — funcionário OU terceirizado (vinculado a Provider).
 *
 * Substitui `useGetProfile` (que bate em `/collaborators/profile` e dava 404 para
 * o terceirizado, deixando-o sem perfil e sem as regras operacionais da empresa).
 *
 * `retry: 3` é proposital, diferente do `retry: false` do `useFindOneDriver`: quem
 * consome este hook lê `companyFeatures` para decidir uma REGRA OPERACIONAL (uma
 * parada por vez / ordem obrigatória). Desistir na primeira falha de rede faz a
 * regra sumir silenciosamente — falha de rede não pode ser confundida com "app não
 * tem essa regra".
 */
export function useGetMe() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_DRIVER, 'me'],
        queryFn: () => driverService.getMe(),
        retry: 3,
        staleTime: 5 * 60 * 1000,
    })

    return {
        me: data?.result ?? null,
        isLoading: isLoading || isRefetching,
        isError,
        refetch,
    }
}
