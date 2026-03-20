import { useState } from "react";
import { TextStyle, Text as RNText } from "react-native";


import { colors, measure } from "@/theme";

import { Box } from "../BoxBackGround/BoxBackGround";
import { DropdownBox, DropDownBoxProps, MyItemTypeDropDown } from "../RestyleComponent/RestyleComponent";
import { FontWeightPreset, Text } from "../Text/Text";


export interface DropdownProps extends DropDownBoxProps {
  search?: boolean
  title?: string,
  inputCenter?: boolean,
  fontWeight?: FontWeightPreset
  data: MyItemTypeDropDown[];
  value: MyItemTypeDropDown | undefined;
  setItemSelected: (item: any) => void;
  labelField: "value" | "label";
  valueField: "value" | "label";
  placeholder?: string;
  renderItem?: (item: any, selected?: boolean) => React.ReactElement;
  selectedItemTextStyle: TextStyle;
  widthIcon: number,
  heightIcon: number,
  messageError?: string;
}

export function Dropdown({
  title,
  inputCenter,
  data,
  value,
  fontWeight = 'regular',
  setItemSelected,
  labelField,
  valueField,
  placeholder,
  renderItem,
  search = true,
  selectedItemTextStyle,
  widthIcon,
  messageError,
  heightIcon,
  ...dropDownBoxProps
}: DropdownProps) {



  const FontWeight = {
    light: 'Ubuntu_300Light',
    regular: 'Ubuntu_400Regular',
    semibold: 'Ubuntu_500Medium',
    bold: 'Ubuntu_700Bold',
  }

  const [dropdownWidth, setDropdownWidth] = useState(measure.x100);
  const displayText = (value?.label)?.replace(" ", "");

  return (
    <Box>
      <RNText
        style={{
          fontSize: selectedItemTextStyle.fontSize,
          position: "absolute",
          opacity: 0,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit={false}
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          if (width + measure.x36 !== dropdownWidth) {
            setDropdownWidth(width + measure.x32);
          }
        }}
      >
        {displayText}
      </RNText>

      {title && <Box pl='l4' mb="b12">
        <Text color='gray600' preset='text14' fontWeightPreset='semibold'>{title}</Text>
      </Box>}

      <DropdownBox
        fontFamily={FontWeight[fontWeight]}
        height={'auto'}
        alignItems="center"
        justifyContent="center"
        width={dropdownWidth}
        data={data}
        search={search}
        maxHeight={measure.y200}
        labelField={labelField}
        valueField={valueField}
        placeholder={placeholder || "Selecione uma opção"}
        searchPlaceholder="Buscar..."
        value={value}
        placeholderStyle={{
          fontSize: measure.f14,
          textAlign: "center",
        }}
        selectedTextStyle={[selectedItemTextStyle, inputCenter ? { textAlign: 'center' } : { textAlign: "left" }]}
        inputSearchStyle={{
          height: measure.y50,
          fontSize: measure.f12,
          borderRadius: measure.m8
        }}
        iconStyle={{
          width: widthIcon,
          height: heightIcon,
          tintColor: colors.primary100,
        }}

        renderItem={(item: any, selected: any) => {
          return renderItem ? renderItem(item, selected) : <Box borderBottomColor="gray100" borderBottomWidth={measure.m1}><Text preset="text14" paddingLeft="l4" marginVertical="y6" color="primary100">{item[labelField]}</Text></Box>;
        }}
        {...dropDownBoxProps}
      />
      {
        messageError && (
          <Text preset="textValidateError" color="redError" marginLeft="l4">
            {messageError}
          </Text>
        )
      }
    </Box>
  )
}

