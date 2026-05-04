import React from 'react'

import { Box, Text, TouchableOpacityBox } from '@/components'
import { measure } from '@/theme'

interface RadioGroupInputProps {
  options: string[]
  selectedValue: string | undefined
  onSelect: (value: string) => void
}

export function RadioGroupInput({ options, selectedValue, onSelect }: RadioGroupInputProps) {
  return (
    <Box gap="y8">
      {options.map((option) => {
        const isSelected = selectedValue === option
        return (
          <TouchableOpacityBox
            key={option}
            onPress={() => onSelect(option)}
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
              borderRadius="s10"
              alignItems="center"
              justifyContent="center"
            >
              {isSelected && (
                <Box
                  width={measure.x10}
                  height={measure.y10}
                  backgroundColor="primary100"
                  borderRadius="s5"
                />
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
