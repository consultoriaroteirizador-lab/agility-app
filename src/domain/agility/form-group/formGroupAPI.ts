import { BaseResponse, PaginatedResult } from '@/api'
import { apiAgility } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type { FormGroupResponse } from './dto/form-group.response'

async function findOne(id: Id): Promise<BaseResponse<FormGroupResponse>> {
  const { data } = await apiAgility.get<BaseResponse<FormGroupResponse>>(`/form-groups/${id}`)
  return data
}

// O back retorna paginado ({ data, meta }).
async function findAll(): Promise<BaseResponse<PaginatedResult<FormGroupResponse>>> {
  const { data } = await apiAgility.get<BaseResponse<PaginatedResult<FormGroupResponse>>>('/form-groups')
  return data
}

export const formGroupAPI = {
  findOne,
  findAll,
}
