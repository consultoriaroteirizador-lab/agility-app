import { BaseResponse } from '@/api'
import { apiAgility } from '@/api/apiConfig'

import type { MyRosterResponse } from './dto'

/**
 * `GET /teams/roster/me`: o `TeamController` devolve `{personId, personType,
 * members}` cru (sem passar por `ResponseHelper.success`), mas isso não quer
 * dizer que o cliente recebe o objeto cru. O `agility-services` registra
 * `app.useGlobalInterceptors(new ResponseInterceptor())` em `src/main.ts`, e
 * esse interceptor do NEST embrulha QUALQUER retorno de handler em
 * `{ success, message, result, error }` — inclusive este. Então `data` aqui
 * é `BaseResponse<MyRosterResponse>`, e o payload real mora em `data.result`.
 *
 * A versão anterior deste comentário afirmava o contrário, dizendo que a
 * resposta vinha crua: checou só o interceptor do AXIOS (`apiConfig.ts`, que
 * de fato apenas loga e repassa `response.data` sem desembrulhar nada) e
 * esqueceu o interceptor do NEST, que já embrulha antes de chegar no axios.
 * Resultado: `data.members` era sempre `undefined`, e a tela "Minha equipe"
 * caía no estado vazio pra todo mundo, com ou sem equipe — sem exceção, sem
 * erro de tipo, sem teste vermelho. É a armadilha que vale deixar escrita.
 */
async function getMyRoster(date?: string): Promise<BaseResponse<MyRosterResponse>> {
    const { data } = await apiAgility.get<BaseResponse<MyRosterResponse>>('/teams/roster/me', {
        params: date ? { date } : {},
    })
    return data
}

export const teamAPI = {
    getMyRoster,
}
