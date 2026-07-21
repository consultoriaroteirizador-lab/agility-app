import { BaseResponse } from '@/api'

import type { OrderOccurrenceReasonResponse } from './dto'
import { orderOccurrenceReasonAPI } from './orderOccurrenceReasonAPI'

async function findAllActive(): Promise<BaseResponse<OrderOccurrenceReasonResponse[]>> {
  return orderOccurrenceReasonAPI.findAllActive()
}

export const orderOccurrenceReasonService = {
  findAllActive,
}
