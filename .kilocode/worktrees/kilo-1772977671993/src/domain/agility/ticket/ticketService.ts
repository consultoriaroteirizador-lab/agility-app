import type { BaseResponse } from '@/api/baseResponse'
import type { Id } from '@/types/base'

import {
  create,
  findOne,
  findByNumber,
  findByChatId,
  findByDriver,
  findByCustomer,
  findOpen,
  findMyAssigned,
  findAll,
  assign,
  start,
  resolve,
  close,
  reopen,
  update,
  type TicketItem,
} from './ticketAPI'

export async function createTicketService(payload: Record<string, unknown>): Promise<BaseResponse<TicketItem>> {
  return create(payload)
}

export async function getTicketService(id: Id): Promise<BaseResponse<TicketItem>> {
  return findOne(id)
}

export async function getTicketByNumberService(ticketNumber: string): Promise<BaseResponse<TicketItem>> {
  return findByNumber(ticketNumber)
}

export async function getTicketByChatIdService(chatId: Id): Promise<BaseResponse<TicketItem>> {
  return findByChatId(chatId)
}

export async function getTicketsByDriverService(driverId: Id): Promise<BaseResponse<TicketItem[]>> {
  return findByDriver(driverId)
}

export async function getTicketsByCustomerService(customerId: Id): Promise<BaseResponse<TicketItem[]>> {
  return findByCustomer(customerId)
}

export async function getOpenTicketsService(): Promise<BaseResponse<TicketItem[]>> {
  return findOpen()
}

export async function getMyAssignedTicketsService(): Promise<BaseResponse<TicketItem[]>> {
  return findMyAssigned()
}

export async function getAllTicketsService(params?: { limit?: number; offset?: number }): Promise<BaseResponse<TicketItem[]>> {
  return findAll(params)
}

export async function assignTicketService(id: Id, assignedToId?: string): Promise<BaseResponse<TicketItem>> {
  return assign(id, assignedToId)
}

export async function startTicketService(id: Id): Promise<BaseResponse<TicketItem>> {
  return start(id)
}

export async function resolveTicketService(id: Id): Promise<BaseResponse<TicketItem>> {
  return resolve(id)
}

export async function closeTicketService(id: Id): Promise<BaseResponse<TicketItem>> {
  return close(id)
}

export async function reopenTicketService(id: Id): Promise<BaseResponse<TicketItem>> {
  return reopen(id)
}

export async function updateTicketService(id: Id, payload: Record<string, unknown>): Promise<BaseResponse<TicketItem>> {
  return update(id, payload)
}

export type { TicketItem }
