import React, { useCallback } from 'react'

import { Box, DatePicker } from '@/components'

interface DatePickerInputProps {
  value: string | undefined
  onChange: (value: string) => void
  title: string
}

export function DatePickerInput({ value, onChange, title }: DatePickerInputProps) {
  const date = value ? new Date(value + 'T12:00:00') : undefined

  const handleSetDate = useCallback(
    (d?: Date) => {
      if (d) {
        const iso = d.toISOString().split('T')[0]
        onChange(iso)
      }
    },
    [onChange],
  )

  return (
    <Box width="100%">
      <DatePicker
        title={title}
        date={date}
        setDate={handleSetDate}
      />
    </Box>
  )
}
