import { BaseResponse } from '@/api'
import { apiAgility } from '@/api/apiConfig'

import type { OrderOccurrenceReasonResponse } from './dto'

async function findAllActive(context?: 'TRANSFER' | 'LAST_MILE' | 'SERVICE'): Promise<BaseResponse<OrderOccurrenceReasonResponse[]>> {
  const url = `/order-occurrence-reasons?activeOnly=true${context ? `&context=${context}` : ''}`
  const { data } = await apiAgility.get<BaseResponse<OrderOccurrenceReasonResponse[]>>(url)
  return data
}

export const orderOccurrenceReasonAPI = {
  findAllActive,
}
