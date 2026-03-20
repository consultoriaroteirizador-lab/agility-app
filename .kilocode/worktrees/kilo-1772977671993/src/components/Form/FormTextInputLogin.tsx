import { Controller, FieldValues, UseControllerProps } from 'react-hook-form';

import {
  TextInputLogin,
  TextInputLoginProps,
} from '../TextInputLogin/TextInputLogin';

export function FormTextInputLogin<T extends FieldValues>({
  control,
  name,
  messageError: externalMessageError,
  ...rest
}: TextInputLoginProps & UseControllerProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextInputLogin
          value={field.value}
          onChangeText={field.onChange}
          messageError={externalMessageError || fieldState.error?.message}
          {...rest}
        />
      )}
    />
  );
}
