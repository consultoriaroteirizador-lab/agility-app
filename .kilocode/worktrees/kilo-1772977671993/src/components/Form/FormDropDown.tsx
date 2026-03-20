import { Controller, FieldValues, UseControllerProps } from 'react-hook-form';

import { Dropdown, DropdownProps } from '../DropDown/DropDown';
import { MyItemTypeDropDown } from '../RestyleComponent/RestyleComponent';



export function FormDropDown<T extends FieldValues>({
  control,
  name,
  onChange,
  ...rest
}: DropdownProps & UseControllerProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Dropdown
          key={field.value}
          onChange={(item: MyItemTypeDropDown) => {
            field.onChange(item.value);
            onChange?.(item,);
          }}
          messageError={fieldState.error?.message}
          {...rest}
        />
      )}
    />
  );
}
