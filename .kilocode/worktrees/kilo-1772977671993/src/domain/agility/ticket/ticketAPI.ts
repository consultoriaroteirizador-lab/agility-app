import { apiAgility } from '@/api/apiConfig'
import type { BaseResponse } from '@/api/baseResponse'
import type { Id } from '@/types/base'

export type TicketItem = { id: Id } & Record<string, unknown>

type ListTicketsParams = { page?: number; limit?: number; status?: string; priority?: string }

export async function create(payload: Record<string, unknown>): Promise<BaseResponse<TicketItem>> {
  const { data } = await apiAgility.post<BaseResponse<TicketItem>>('/tickets', payload)
  return data
}

export async function findAll(params: ListTicketsParams = {}): Promise<BaseResponse<TicketItem[]>> {
  const qs = new URLSearchParams()
  if (params.status) qs.append('status', params.status)
  if (params.priority) qs.append('priority', params.priority)
  if (params.page) qs.append('page', String(params.page))
  if (params.limit) qs.append('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const { data } = await apiAgility.get<BaseResponse<TicketItem[]>>(`/tickets${suffix}`)
  return data
}

export async function findOne(id: Id): Promise<BaseResponse<TicketItem>> {
  const { data } = await apiAgility.get<BaseResponse<TicketItem>>(`/tickets/${id}`)
  return data
}

export async function update(id: Id, payload: Record<string, unknown>): Promise<BaseResponse<TicketItem>> {
  const { data } = await apiAgility.patch<BaseResponse<TicketItem>>(`/tickets/${id}`, payload)
  return data
}

export async function addMessage(id: Id, payload: Record<string, unknown>): Promise<BaseResponse<TicketItem>> {
  const { data } = await apiAgility.post<BaseResponse<TicketItem>>(`/tickets/${id}/messages`, payload)
  return data
}

export async function close(id: Id): Promise<BaseResponse<TicketItem>> {
  const { data } = await apiAgility.patch<BaseResponse<TicketItem>>(`/tickets/${id}/close`)
  return data
}

export async function remove(id: Id): Promise<BaseResponse<void>> {
  const { data } = await apiAgility.delete<BaseResponse<void>>(`/tickets/${id}`)
  return data
}