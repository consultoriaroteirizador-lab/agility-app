import {
  TouchableOpacity,
  TouchableOpacityProps as RNTouchableOpacityProps,
  TextInput,
  TextInputProps,
  Image,
  ImageProps,
  ImageBackground,
  ImageBackgroundProps
} from 'react-native';

import {
  Picker,
  PickerProps,
  PickerItemProps,
} from '@react-native-picker/picker';
import {
  createRestyleComponent,
  backgroundColor,
  BackgroundColorProps,
  spacing,
  SpacingProps,
  layout,
  LayoutProps,
  border,
  BorderProps,
  spacingShorthand,
  SpacingShorthandProps,
  ColorProps,
  BoxProps,
} from '@shopify/restyle';
import { BlurView, BlurViewProps } from "expo-blur";
// import { CameraView, CameraViewProps } from 'expo-camera'
import { Dropdown } from 'react-native-element-dropdown';
import { DropdownProps } from 'react-native-element-dropdown/src/components/Dropdown/model'
import { TextInputMask, TextInputMaskProps } from 'react-native-masked-text';
import { WebView, WebViewProps } from 'react-native-webview';


import { Theme } from '@/theme';

export type TouchableOpacityBoxProps =
  BackgroundColorProps<Theme> &
  SpacingProps<Theme> &
  LayoutProps<Theme> &
  BorderProps<Theme> &
  BoxProps<Theme> &
  SpacingShorthandProps<Theme> &
  ColorProps<Theme> &
  RNTouchableOpacityProps;

export const TouchableOpacityBox = createRestyleComponent<
  TouchableOpacityBoxProps,
  Theme
>(
  [backgroundColor, spacing, spacingShorthand, layout, border],
  TouchableOpacity
);

export type TextInputBoxProps =
  BackgroundColorProps<Theme> &
  SpacingProps<Theme> &
  LayoutProps<Theme> &
  BorderProps<Theme> &
  SpacingShorthandProps<Theme> &
  ColorProps<Theme> &
  TextInputProps;


export const TextInputBox = createRestyleComponent<TextInputBoxProps, Theme>(
  [backgroundColor, spacing, spacingShorthand, layout, border],
  TextInput
);

export type TextInputMaskBoxProps =
  BackgroundColorProps<Theme> &
  SpacingProps<Theme> &
  LayoutProps<Theme> &
  BorderProps<Theme> &
  SpacingShorthandProps<Theme> &
  ColorProps<Theme> &
  // TextInputProps &
  TextInputMaskProps;

export const TextInputMaskBox = createRestyleComponent<TextInputMaskBoxProps, Theme>(
  [backgroundColor, spacing, spacingShorthand, layout, border],
  TextInputMask
);

export type PickerBoxProps =
  BackgroundColorProps<Theme> &
  SpacingProps<Theme> &
  LayoutProps<Theme> &
  BorderProps<Theme> &
  SpacingShorthandProps<Theme> &
  ColorProps<Theme> &
  PickerProps &
  PickerItemProps;

export const PickerBox = createRestyleComponent<PickerBoxProps, Theme>(
  [backgroundColor, spacing, spacingShorthand, layout, border],
  Picker
);

export type MyItemTypeDropDown = { label: string, value: any };
export type DropDownBoxProps =
  BackgroundColorProps<Theme> &
  SpacingProps<Theme> &
  LayoutProps<Theme> &
  BorderProps<Theme> &
  SpacingShorthandProps<Theme> &
  ColorProps<Theme> &
  DropdownProps<MyItemTypeDropDown>;

export const DropdownBox = createRestyleComponent<DropDownBoxProps, Theme>(
  [backgroundColor, spacing, spacingShorthand, layout, border],
  Dropdown
);

export type ImageBoxProps =
  BackgroundColorProps<Theme> &
  SpacingProps<Theme> &
  LayoutProps<Theme> &
  BorderProps<Theme> &
  SpacingShorthandProps<Theme> &
  ImageProps;


export const ImageBox = createRestyleComponent<ImageBoxProps, Theme>(
  [backgroundColor, spacing, spacingShorthand, layout, border],
  Image
);

// export type CameraViewBoxProps =
//   BackgroundColorProps<Theme> &
//   SpacingProps<Theme> &
//   LayoutProps<Theme> &
//   BorderProps<Theme> &
//   SpacingShorthandProps<Theme> &
//   ColorProps<Theme> &
//   CameraViewProps;

// export const CameraViewBox = createRestyleComponent<
//   CameraViewBoxProps,
//   Theme
// >(
//   [backgroundColor, spacing, spacingShorthand, layout, border],
//   CameraView
// );

export type WebViewBoxProps =
  BackgroundColorProps<Theme> &
  SpacingProps<Theme> &
  LayoutProps<Theme> &
  BorderProps<Theme> &
  SpacingShorthandProps<Theme> &
  ColorProps<Theme> &
  WebViewProps;

export const WebViewBox = createRestyleComponent<
  WebViewBoxProps,
  Theme
>(
  [backgroundColor, spacing, spacingShorthand, layout, border],
  WebView
);

export type BlurViewBoxProps =
  BackgroundColorProps<Theme> &
  SpacingProps<Theme> &
  LayoutProps<Theme> &
  BorderProps<Theme> &
  SpacingShorthandProps<Theme> &
  ColorProps<Theme> &
  BlurViewProps;

export const BlurViewBox = createRestyleComponent<
  BlurViewBoxProps,
  Theme
>(
  [backgroundColor, spacing, spacingShorthand, layout, border],
  BlurView
);

export type ImageBackgroundBoxProps = BackgroundColorProps<Theme> &
  SpacingProps<Theme> &
  LayoutProps<Theme> &
  BorderProps<Theme> &
  BoxProps<Theme> &
  SpacingShorthandProps<Theme> &
  ImageBackgroundProps

export const ImageBackgroundBox = createRestyleComponent<
  ImageBackgroundBoxProps,
  Theme
>(
  [backgroundColor, spacing, spacingShorthand, layout, border],
  ImageBackground
)
