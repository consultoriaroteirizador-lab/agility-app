import {useMemo} from 'react';

export function useImageBackground() {
  const backgroundImage = useMemo(
    () => require('../assets/images/newbackground.png'),
    []
  );
  return backgroundImage;
}
