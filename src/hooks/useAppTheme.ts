import {useTheme} from '@shopify/restyle';

import {Theme} from '@/theme/theme';

export function useAppTheme() {
  const theme = useTheme<Theme>();
  return theme;
}
