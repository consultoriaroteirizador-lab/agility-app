import {Controller, FieldValues, UseControllerProps} from 'react-hook-form';

import {DatePicker, DatePickerProps} from '../DatePicker/DatePicker';

export function FormDatePicker<T extends FieldValues>({
  control,
  name,
  setDate,
  ...rest
}: DatePickerProps & UseControllerProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field, fieldState}) => (
        <DatePicker
          date={field.value}
          setDate={date => {
            field.onChange(date);
            // setDate?.(date);
          }}
          messageError={fieldState.error?.message}
          {...rest}
        />
      )}
    />
  );
}
