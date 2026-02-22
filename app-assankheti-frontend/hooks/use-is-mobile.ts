import * as React from 'react';
import { useWindowDimensions } from 'react-native';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const { width } = useWindowDimensions();

  return React.useMemo(() => width < MOBILE_BREAKPOINT, [width]);
}
