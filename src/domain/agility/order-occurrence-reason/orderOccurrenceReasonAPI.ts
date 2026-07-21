import { BaseResponse } from '@/api'
import { apiAgility } from '@/api/apiConfig'

import type { OrderOccurrenceReasonResponse } from './dto'

async function findAllActive(): Promise<BaseResponse<OrderOccurrenceReasonResponse[]>> {
  const { data } = await apiAgility.get<BaseResponse<OrderOccurrenceReasonResponse[]>>('/order-occurrence-reasons?activeOnly=true')
  return data
}

export const orderOccurrenceReasonAPI = {
  findAllActive,
}
