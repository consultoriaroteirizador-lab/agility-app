import React, { useCallback, useMemo, useState } from 'react'

import { Box, Button, ScreenBase, Text } from '@/components'
import { ButtonBack } from '@/components/Button/ButtonBack'
import { useToastService } from '@/services/Toast/useToast'
import { measure } from '@/theme'

import { useParada } from '../../_context/ParadaContext'

import { DynamicQuestionInput } from './DynamicQuestionInput'

interface SharedEtapaFormularioProps {
  serviceType: 'coleta' | 'entrega' | 'servico'
}

export function SharedEtapaFormulario({ serviceType }: SharedEtapaFormularioProps) {
  const { showToast } = useToastService()
  const [submitting, setSubmitting] = useState(false)
  const {
    formGroups,
    formAnswersMap,
    setFormAnswer,
    submitFormAnswers,
    setEtapa,
    goToNextStep,
  } = useParada()

  const handleBack = useCallback(() => {
    setEtapa(2)
  }, [setEtapa])

  const allQuestions = useMemo(() => {
    const questions: { formGroupId: string; formId: string; questionId: string; text: string }[] = []
    for (const fg of formGroups) {
      for (const form of fg.forms) {
        for (const q of form.questions) {
          questions.push({ formGroupId: fg.id, formId: form.id, questionId: q.id, text: q.text })
        }
      }
    }
    return questions
  }, [formGroups])

  const canProceed = useMemo(() => {
    return allQuestions.every((q) => {
      const answer = formAnswersMap[q.questionId]
      if (answer === undefined || answer === '') return false
      if (Array.isArray(answer) && answer.length === 0) return false
      return true
    })
  }, [allQuestions, formAnswersMap])

  const handleSubmit = useCallback(async () => {
    if (!canProceed || submitting) return
    setSubmitting(true)
    try {
      await submitFormAnswers()
      goToNextStep()
    } catch {
      showToast({ message: 'Erro ao enviar respostas. Tente novamente.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }, [canProceed, submitting, submitFormAnswers, showToast, goToNextStep])

  if (formGroups.length === 0) {
    return null
  }

  return (
    <ScreenBase
      buttonLeft={<ButtonBack onPress={handleBack} />}
      title={
        <Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
          Formulário
        </Text>
      }
    >
      <Box flex={1} backgroundColor="white">
        <Box scrollable pb="b32">
          <Box paddingTop="y24" paddingBottom="y4" >
            {formGroups.map((formGroup) => (
              <Box key={formGroup.id} marginBottom="y20">
                <Text preset="text18" color="colorTextPrimary" fontWeightPreset="bold" marginBottom="y12">
                  {formGroup.name}
                </Text>

                {formGroup.forms.map((form) => (
                  <Box key={form.id} marginBottom="y16">
                    {formGroup.forms.length > 1 && (
                      <Text preset="text16" color="gray600" fontWeightPreset="semibold" marginBottom="y12">
                        {form.title}
                      </Text>
                    )}

                    {form.questions.map((question) => (
                      <DynamicQuestionInput
                        key={question.id}
                        question={question}
                        value={formAnswersMap[question.id]}
                        onChange={setFormAnswer}
                      />
                    ))}
                  </Box>
                ))}
              </Box>
            ))}

            <Box paddingBottom="y24">
              <Button
                title={submitting ? 'Enviando...' : 'Avançar'}
                onPress={handleSubmit}
                width={measure.x330}
                disabled={!canProceed || submitting}
              />
              {!canProceed && (
                <Text preset="text12" color="primary100" textAlign="center" marginTop="y8">
                  * Preencha todas as perguntas para prosseguir
                </Text>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </ScreenBase>
  )
}
