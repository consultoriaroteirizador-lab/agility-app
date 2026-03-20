import {useEffect} from 'react';

import {useNavigation} from 'expo-router';

export function useNavigationNotActionOnBack() {
  const navigation = useNavigation();

  useEffect(() => {
    const callback = (e: any) => {
      if (e.data?.action?.type === 'GO_BACK') {
        e.preventDefault();
      }
    };
    navigation.addListener('beforeRemove', callback);
    return () => navigation.removeListener('beforeRemove', callback);
  }, []);
}
