import { BaseResponse } from '@/api'
import { apiAgility } from '@/api/apiConfig'

import type { CreateFormGroupAnswerRequest } from './dto/create-form-group-answer.request'
import type { FormGroupAnswerResponse } from './dto/form-group-answer.response'

async function create(payload: CreateFormGroupAnswerRequest): Promise<BaseResponse<FormGroupAnswerResponse>> {
  const { data } = await apiAgility.post<BaseResponse<FormGroupAnswerResponse>>('/form-group-answers', payload)
  return data
}

export const formGroupAnswerAPI = {
  create,
}
