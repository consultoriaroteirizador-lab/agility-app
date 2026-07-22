export interface OrderOccurrenceReasonResponse {
  id: string
  name: string
  description?: string | null
  sideEffect: 'CANCEL_ORDER' | 'RETURN_TO_POOL'
  active: boolean
}
