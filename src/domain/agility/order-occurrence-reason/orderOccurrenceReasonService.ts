import { BaseResponse } from '@/api'

import type { OrderOccurrenceReasonResponse } from './dto'
import { orderOccurrenceReasonAPI } from './orderOccurrenceReasonAPI'

async function findAllActive(context?: 'TRANSFER' | 'LAST_MILE' | 'SERVICE'): Promise<BaseResponse<OrderOccurrenceReasonResponse[]>> {
  return orderOccurrenceReasonAPI.findAllActive(context)
}

export const orderOccurrenceReasonService = {
  findAllActive,
}
