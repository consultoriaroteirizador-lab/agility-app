import { BaseResponse } from '@/api'
import { apiAgility } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type { FormGroupResponse } from './dto/form-group.response'

async function findOne(id: Id): Promise<BaseResponse<FormGroupResponse>> {
  const { data } = await apiAgility.get<BaseResponse<FormGroupResponse>>(`/form-groups/${id}`)
  return data
}

async function findAll(): Promise<BaseResponse<FormGroupResponse[]>> {
  const { data } = await apiAgility.get<BaseResponse<FormGroupResponse[]>>('/form-groups')
  return data
}

export const formGroupAPI = {
  findOne,
  findAll,
}
