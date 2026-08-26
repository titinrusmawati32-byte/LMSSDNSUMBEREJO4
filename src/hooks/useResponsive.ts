import { useState, useEffect } from 'react';

export interface ResponsiveState {
  width: number;
  isMobile: boolean;
}

export function useResponsive(breakpoint: number = 768): ResponsiveState {
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    width,
    isMobile: width < breakpoint,
  };
}
