import React from 'react'

import { Box, Text, TouchableOpacityBox } from '@/components'
import { measure } from '@/theme'

interface CheckboxGroupInputProps {
  options: string[]
  selectedValues: string[]
  onChange: (values: string[]) => void
}

export function CheckboxGroupInput({ options, selectedValues, onChange }: CheckboxGroupInputProps) {
  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((v) => v !== option))
    } else {
      onChange([...selectedValues, option])
    }
  }

  return (
    <Box gap="y8">
      {options.map((option) => {
        const isSelected = selectedValues.includes(option)
        return (
          <TouchableOpacityBox
            key={option}
            onPress={() => toggleOption(option)}
            flexDirection="row"
            alignItems="center"
            paddingVertical="y12"
            paddingHorizontal="x14"
            borderWidth={measure.m1Dot5}
            borderColor={isSelected ? 'primary100' : 'gray200'}
            borderRadius="s8"
            backgroundColor={isSelected ? 'primary10' : 'white'}
            gap="x10"
          >
            <Box
              width={measure.x20}
              height={measure.y20}
              borderWidth={measure.m2}
              borderColor={isSelected ? 'primary100' : 'gray400'}
              borderRadius="s4"
              alignItems="center"
              justifyContent="center"
            >
              {isSelected && (
                <Text preset="text14" color="primary100" fontWeightPreset="bold">
                  ✓
                </Text>
              )}
            </Box>
            <Text
              preset="text15"
              color={isSelected ? 'primary100' : 'colorTextPrimary'}
              fontWeightPreset={isSelected ? 'semibold' : 'regular'}
            >
              {option}
            </Text>
          </TouchableOpacityBox>
        )
      })}
    </Box>
  )
}
