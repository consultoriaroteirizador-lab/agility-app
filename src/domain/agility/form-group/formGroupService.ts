import { BaseResponse } from '@/api'
import type { Id } from '@/types/base'

import type { FormGroupResponse } from './dto/form-group.response'
import { formGroupAPI } from './formGroupAPI'

async function findOne(id: Id): Promise<BaseResponse<FormGroupResponse>> {
  return formGroupAPI.findOne(id)
}

async function findAll(): Promise<BaseResponse<FormGroupResponse[]>> {
  return formGroupAPI.findAll()
}

export const formGroupService = {
  findOne,
  findAll,
}
