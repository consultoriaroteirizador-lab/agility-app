import { apiAgility } from '@/api/apiConfig'
import type { BaseResponse } from '@/api/baseResponse'
import type { Id } from '@/types/base'

import type { Ticket, CreateTicketPayload, UpdateTicketPayload } from './dto/types'

// Reexportar o tipo completo
export type TicketItem = Ticket

type ListTicketsParams = { page?: number; limit?: number; status?: string; priority?: string }

// ================== CRUD Básico ==================

export async function create(payload: CreateTicketPayload): Promise<BaseResponse<TicketItem>> {
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

export async function update(id: Id, payload: UpdateTicketPayload): Promise<BaseResponse<TicketItem>> {
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

// ================== Buscas Específicas ==================

// Buscar por número do protocolo
export async function findByNumber(ticketNumber: string): Promise<BaseResponse<TicketItem>> {
  const { data } = await apiAgility.get<BaseResponse<TicketItem>>(`/tickets/number/${ticketNumber}`)
  return data
}

// Buscar por chatId
export async function findByChatId(chatId: Id): Promise<BaseResponse<TicketItem>> {
  const { data } = await apiAgility.get<BaseResponse<TicketItem>>(`/tickets/chat/${chatId}`)
  return data
}

// Buscar por driverId
export async function findByDriver(driverId: Id): Promise<BaseResponse<TicketItem[]>> {
  const { data } = await apiAgility.get<BaseResponse<TicketItem[]>>(`/tickets/driver/${driverId}`)
  return data
}

// Buscar por customerId
export async function findByCustomer(customerId: Id): Promise<BaseResponse<TicketItem[]>> {
  const { data } = await apiAgility.get<BaseResponse<TicketItem[]>>(`/tickets/customer/${customerId}`)
  return data
}

// Buscar tickets abertos
export async function findOpen(): Promise<BaseResponse<TicketItem[]>> {
  const { data } = await apiAgility.get<BaseResponse<TicketItem[]>>('/tickets/open')
  return data
}

// Buscar tickets atribuídos ao usuário atual
export async function findMyAssigned(): Promise<BaseResponse<TicketItem[]>> {
  const { data } = await apiAgility.get<BaseResponse<TicketItem[]>>('/tickets/my-assigned')
  return data
}

// ================== Ações de Workflow ==================

// Atribuir ticket a um agente
export async function assign(id: Id, assignedToId?: string): Promise<BaseResponse<TicketItem>> {
  const { data } = await apiAgility.patch<BaseResponse<TicketItem>>(`/tickets/${id}/assign`, { assignedToId })
  return data
}

// Iniciar atendimento
export async function start(id: Id): Promise<BaseResponse<TicketItem>> {
  const { data } = await apiAgility.patch<BaseResponse<TicketItem>>(`/tickets/${id}/start`)
  return data
}

// Resolver ticket
export async function resolve(id: Id, resolution?: string): Promise<BaseResponse<TicketItem>> {
  const { data } = await apiAgility.patch<BaseResponse<TicketItem>>(`/tickets/${id}/resolve`, { resolution })
  return data
}

// Reabrir ticket
export async function reopen(id: Id): Promise<BaseResponse<TicketItem>> {
  const { data } = await apiAgility.patch<BaseResponse<TicketItem>>(`/tickets/${id}/reopen`)
  return data
}
