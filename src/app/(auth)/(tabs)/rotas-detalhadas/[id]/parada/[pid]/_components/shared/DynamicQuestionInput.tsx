import React, { useCallback } from 'react'

import * as ImagePicker from 'expo-image-picker'

import { Box, Input, Text } from '@/components'
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker'
import type { QuestionResponse, QuestionType } from '@/domain/agility/form-group/dto/form-group.response'
import { measure } from '@/theme'


import { CheckboxGroupInput } from './CheckboxGroupInput'
import { DatePickerInput } from './DatePickerInput'
import { RadioGroupInput } from './RadioGroupInput'

interface DynamicQuestionInputProps {
  question: QuestionResponse
  value: string | string[] | undefined
  onChange: (questionId: string, value: string | string[]) => void
}

function getKeyboardType(type: QuestionType): 'default' | 'numeric' | 'decimal-pad' {
  switch (type) {
    case 'INTEGER':
      return 'numeric'
    case 'DECIMAL':
      return 'decimal-pad'
    default:
      return 'default'
  }
}

export function DynamicQuestionInput({ question, value, onChange }: DynamicQuestionInputProps) {
  const { id, text, responseType, options } = question

  const handleTextChange = useCallback(
    (v: string) => onChange(id, v),
    [id, onChange],
  )

  const handlePhotoChange = useCallback(
    (photos: ImagePicker.ImagePickerAsset[]) => {
      const uris = photos.map((p) => p.uri)
      onChange(id, uris.length === 1 ? uris[0] : uris.length > 1 ? uris.join(',') : '')
    },
    [id, onChange],
  )

  const handleMultiChoiceChange = useCallback(
    (values: string[]) => onChange(id, values),
    [id, onChange],
  )

  const renderInput = () => {
    switch (responseType) {
      case 'TEXT':
      case 'INTEGER':
      case 'DECIMAL':
        return (
          <Input
            title={text}
            value={(value as string) || ''}
            onChangeText={handleTextChange}
            placeholder={text}
            keyboardType={getKeyboardType(responseType)}
            width={measure.x330}
          />
        )

      case 'PHOTO':
        return (
          <Box>
            <Text preset="text14" color="gray600" fontWeightPreset="semibold" marginBottom="y8" paddingLeft="l4">
              {text}
            </Text>
            <MultiPhotoPicker
              photos={[]}
              onPhotosChange={handlePhotoChange}
              maxPhotos={1}
              label="Foto"
              allowCamera={true}
              padding="y4"
            />
          </Box>
        )

      case 'DATE':
        return (
          <Box paddingLeft="l4" paddingRight="r14" width="100%">
            <DatePickerInput
              value={value as string | undefined}
              onChange={handleTextChange}
              title={text}
            />
          </Box>
        )

      case 'SINGLE_CHOICE':
        return (
          <Box>
            <Text preset="text14" color="gray600" fontWeightPreset="semibold" marginBottom="y8" paddingLeft="l4">
              {text}
            </Text>
            <Box paddingLeft="l4" paddingRight="r14">
              <RadioGroupInput
                options={options || []}
                selectedValue={value as string | undefined}
                onSelect={handleTextChange}
              />
            </Box>
          </Box>
        )

      case 'MULTIPLE_CHOICE':
        return (
          <Box>
            <Text preset="text14" color="gray600" fontWeightPreset="semibold" marginBottom="y8" paddingLeft="l4">
              {text}
            </Text>
            <Box paddingLeft="l4" paddingRight="r14">
              <CheckboxGroupInput
                options={options || []}
                selectedValues={Array.isArray(value) ? value : []}
                onChange={handleMultiChoiceChange}
              />
            </Box>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Box marginBottom="y16">
      {renderInput()}
    </Box>
  )
}
