import { useState } from 'react';

import { Controller, UseControllerProps, FieldValues } from 'react-hook-form';

import { Input, InputProps } from '../Input/Input';

export function FormTextInput<T extends FieldValues>({
  control,
  name,
  isPassword,
  ...rest
}: InputProps & UseControllerProps<T> & { isPassword?: boolean }) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          onChangeText={field.onChange}
          value={field.value}
          borderColor={
            fieldState.error
              ? 'redError'
              : isFocused
                ? 'primary100'
                : 'gray300'
          }
          messageError={isPassword ? undefined : fieldState.error?.message}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
      )}
    />
  );
}
