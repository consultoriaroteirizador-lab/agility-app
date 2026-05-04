import { BaseResponse } from '@/api'

import type { CreateFormGroupAnswerRequest } from './dto/create-form-group-answer.request'
import type { FormGroupAnswerResponse } from './dto/form-group-answer.response'
import { formGroupAnswerAPI } from './formGroupAnswerAPI'

async function create(payload: CreateFormGroupAnswerRequest): Promise<BaseResponse<FormGroupAnswerResponse>> {
  return formGroupAnswerAPI.create(payload)
}

export const formGroupAnswerService = {
  create,
}
