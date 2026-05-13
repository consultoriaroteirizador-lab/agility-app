import { useMutation } from '@tanstack/react-query'

import type { BaseResponse } from '@/api'

import type { CreateFormGroupAnswerRequest } from '../dto/create-form-group-answer.request'
import type { FormGroupAnswerResponse } from '../dto/form-group-answer.response'
import { formGroupAnswerService } from '../formGroupAnswerService'


export function useCreateFormGroupAnswer() {
  const mutation = useMutation<BaseResponse<FormGroupAnswerResponse>, Error, CreateFormGroupAnswerRequest>({
    mutationFn: (payload: CreateFormGroupAnswerRequest) => formGroupAnswerService.create(payload),
  })

  return {
    createFormGroupAnswer: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
    reset: mutation.reset,
  }
}
