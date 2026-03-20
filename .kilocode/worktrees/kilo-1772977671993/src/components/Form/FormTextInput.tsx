import { useState } from 'react';

import { Controller, UseControllerProps, FieldValues } from 'react-hook-form';

import { TextInput, TextInputProps } from '../TextInput/TextInput';

export function FormTextInput<T extends FieldValues>({
  control,
  name,
  isPassword,
  ...rest
}: TextInputProps & UseControllerProps<T>) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextInput
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
