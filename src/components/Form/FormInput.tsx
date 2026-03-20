
import { Controller, UseControllerProps, FieldValues } from 'react-hook-form';

import { Box } from '../BoxBackGround/BoxBackGround';
import { Input, InputProps } from '../Input/Input';

export function FormInput<T extends FieldValues>({
  control,
  name,
  style,
  rules,
  ...rest
}: InputProps & UseControllerProps<T>) {
  return (
    <Controller
      control={control}
      rules={rules}
      name={name}
      render={({ field, fieldState }) => (
        <Box style={style}>
          <Input
            value={field.value}
            onChangeText={field.onChange}
            messageError={fieldState.error?.message}
            {...rest}
          />
        </Box>
      )}
    />
  );
}
