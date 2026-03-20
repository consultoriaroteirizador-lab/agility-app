import type { BaseResponse } from '@/api/baseResponse'
import type { Id, PaginationQuery } from '@/types/base'

import { create, findAll, findOne, update, schedule, start, complete, cancel, remove, type Order } from './orderAPI'

type ListOrdersParams = PaginationQuery & { customerId?: Id; status?: string }

export async function createOrderService(payload: Record<string, unknown>): Promise<BaseResponse<Order>> { return create(payload) }
export async function listOrdersService(params: ListOrdersParams = {}): Promise<BaseResponse<Order[]>> { return findAll(params) }
export async function getOrderService(id: Id): Promise<BaseResponse<Order>> { return findOne(id) }
export async function updateOrderService(id: Id, payload: Record<string, unknown>): Promise<BaseResponse<Order>> { return update(id, payload) }
export async function scheduleOrderService(id: Id): Promise<BaseResponse<Order>> { return schedule(id) }
export async function startOrderService(id: Id): Promise<BaseResponse<Order>> { return start(id) }
export async function completeOrderService(id: Id): Promise<BaseResponse<Order>> { return complete(id) }
export async function cancelOrderService(id: Id): Promise<BaseResponse<Order>> { return cancel(id) }
export async function deleteOrderService(id: Id): Promise<BaseResponse<void>> { return remove(id) }

export type { Order }
