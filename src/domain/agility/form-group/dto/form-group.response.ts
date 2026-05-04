export enum QuestionType {
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  DECIMAL = 'DECIMAL',
  PHOTO = 'PHOTO',
  DATE = 'DATE',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
}

export interface QuestionResponse {
  id: string
  formId: string
  text: string
  responseType: QuestionType
  options: string[] | null
}

export interface FormResponse {
  id: string
  formGroupId: string
  title: string
  questions: QuestionResponse[]
}

export interface FormGroupResponse {
  id: string
  name: string
  forms: FormResponse[]
}
