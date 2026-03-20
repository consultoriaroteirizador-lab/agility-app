import { BaseResponse } from '@/api';
import { apiAgility } from '@/api/apiConfig';
import type { Id } from '@/types/base';

import type {
  CreatePaymentRequest,
  UpdatePaymentRequest,
  ListPaymentsRequest,
  PaymentResponse,
  DriverSummaryItem,
} from './dto';


type ListPaymentsParams = ListPaymentsRequest;

async function create(
  payload: CreatePaymentRequest,
): Promise<BaseResponse<PaymentResponse>> {
  const { data } = await apiAgility.post<BaseResponse<PaymentResponse>>(
    '/finance/payments',
    payload,
  );
  return data;
}

async function findAll(
  params: ListPaymentsParams = {},
): Promise<BaseResponse<PaymentResponse[]>> {
  const { data } = await apiAgility.get<BaseResponse<PaymentResponse[]>>(
    '/finance/payments',
    {
      params: {
        ...(params.driverId && { driverId: params.driverId }),
        ...(params.routingId && { routingId: params.routingId }),
        ...(params.serviceId && { serviceId: params.serviceId }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.status && { status: params.status }),
      },
    },
  );
  return data;
}

async function findOne(id: Id): Promise<BaseResponse<PaymentResponse>> {
  const { data } = await apiAgility.get<BaseResponse<PaymentResponse>>(
    `/finance/payments/${id}`,
  );
  return data;
}

async function update(
  id: Id,
  payload: UpdatePaymentRequest,
): Promise<BaseResponse<PaymentResponse>> {
  const { data } = await apiAgility.patch<BaseResponse<PaymentResponse>>(
    `/finance/payments/${id}`,
    payload,
  );
  return data;
}

async function remove(id: Id): Promise<BaseResponse<void>> {
  const { data } = await apiAgility.delete<BaseResponse<void>>(
    `/finance/payments/${id}`,
  );
  return data;
}

async function getDriverSummary(
  driverId?: Id,
): Promise<BaseResponse<DriverSummaryItem[]>> {
  const { data } = await apiAgility.get<BaseResponse<DriverSummaryItem[]>>(
    '/finance/summary/drivers',
    {
      params: {
        ...(driverId && { driverId }),
      },
    },
  );
  return data;
}

export const financeAPI = {
  create,
  findAll,
  findOne,
  update,
  remove,
  getDriverSummary,
};
