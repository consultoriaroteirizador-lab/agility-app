export interface OrderOccurrenceReasonResponse {
  id: string
  name: string
  description?: string | null
  sideEffect: 'CANCEL_ORDER' | 'RETURN_TO_POOL' | 'FAIL_ORDER'
  active: boolean
  contexts?: ('TRANSFER' | 'LAST_MILE' | 'SERVICE')[]
}
