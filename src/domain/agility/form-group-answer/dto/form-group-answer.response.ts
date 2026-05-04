export interface QuestionAnswerResponse {
  id: string
  formAnswerId: string
  questionId: string | null
  questionText: string
  value: string | string[]
}

export interface FormAnswerResponse {
  id: string
  formGroupAnswerId: string
  formId: string | null
  formTitle: string
  questionAnswers: QuestionAnswerResponse[]
}

export interface FormGroupAnswerResponse {
  id: string
  formGroupId: string
  respondedAt: string
  entityType: string
  entityId: string
  formAnswers: FormAnswerResponse[]
}
