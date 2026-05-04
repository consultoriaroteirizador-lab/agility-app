export enum FormEntityType {
  SERVICE = 'SERVICE',
  COLLABORATOR = 'COLLABORATOR',
  DRIVER = 'DRIVER',
  ROUTING = 'ROUTING',
  SHIPPER = 'SHIPPER',
  CUSTOMER = 'CUSTOMER',
}

export interface QuestionAnswerPayload {
  questionId: string
  value: string | string[]
}

export interface FormAnswerPayload {
  formId: string
  answers: QuestionAnswerPayload[]
}

export interface CreateFormGroupAnswerRequest {
  formGroupId: string
  respondedAt: string
  entityType: FormEntityType
  entityId: string
  formAnswers: FormAnswerPayload[]
}
