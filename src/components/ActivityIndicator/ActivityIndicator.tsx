import {
  ActivityIndicatorProps as RNActivityIndicatorProps,
  ActivityIndicator as RNActivityIndicator,
} from 'react-native';

import { useTheme } from '@shopify/restyle';

import { measure, Theme } from '@/theme';


type ActivityIndicatorProps = RNActivityIndicatorProps
export function ActivityIndicator({ ...RNActivityIndicatorProps }: ActivityIndicatorProps) {
  const { colors } = useTheme<Theme>();

  return <RNActivityIndicator color={colors.primary10} size={measure.m52} {...RNActivityIndicatorProps} />;
}
