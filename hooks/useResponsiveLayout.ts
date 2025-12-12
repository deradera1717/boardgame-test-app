import { useState, useEffect } from 'react';

export interface BreakpointValues {
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
}

export interface ResponsiveConfig {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: keyof BreakpointValues;
  width: number;
  height: number;
}

/**
 * Hook for responsive design and layout optimization
 * Provides breakpoint information and responsive utilities
 */
export const useResponsiveLayout = (): ResponsiveConfig => {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Debounce resize events for performance
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const { width, height } = dimensions;

  // Material-UI breakpoints
  const breakpoints = {
    xs: width < 600,
    sm: width >= 600 && width < 900,
    md: width >= 900 && width < 1200,
    lg: width >= 1200 && width < 1536,
    xl: width >= 1536
  };

  // Determine current breakpoint
  const getCurrentBreakpoint = (): keyof BreakpointValues => {
    if (breakpoints.xl) return 'xl';
    if (breakpoints.lg) return 'lg';
    if (breakpoints.md) return 'md';
    if (breakpoints.sm) return 'sm';
    return 'xs';
  };

  return {
    isMobile: width < 600,
    isTablet: width >= 600 && width < 1200,
    isDesktop: width >= 1200,
    breakpoint: getCurrentBreakpoint(),
    width,
    height
  };
};

/**
 * Hook for adaptive component sizing based on screen size
 */
export const useAdaptiveSize = () => {
  const { isMobile, isTablet, isDesktop } = useResponsiveLayout();

  const getSize = (mobile: number, tablet: number, desktop: number): number => {
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
  };

  const getSizeObject = <T>(mobile: T, tablet: T, desktop: T): T => {
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
  };

  return {
    isMobile,
    isTablet,
    isDesktop,
    getSize,
    getSizeObject,
    
    // Common size presets
    boardSize: getSize(300, 450, 600),
    spotSize: getSize(70, 90, 120),
    pieceSize: getSize(20, 28, 32),
    fontSize: {
      small: getSize(12, 14, 16),
      medium: getSize(14, 16, 18),
      large: getSize(16, 18, 20),
      xlarge: getSize(18, 20, 24)
    },
    spacing: {
      xs: getSize(4, 6, 8),
      sm: getSize(8, 12, 16),
      md: getSize(12, 16, 24),
      lg: getSize(16, 24, 32),
      xl: getSize(24, 32, 48)
    }
  };
};

/**
 * Hook for managing touch and mouse interactions on different devices
 */
export const useInteractionMode = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTouchSupport = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouchSupport();
  }, []);

  return {
    isTouchDevice,
    isMouseDevice: !isTouchDevice,
    
    // Interaction preferences
    prefersDragAndDrop: !isTouchDevice,
    prefersClickToSelect: isTouchDevice,
    
    // Event handlers optimization
    getPointerEvents: () => isTouchDevice ? 'auto' : 'auto',
    getTouchAction: () => isTouchDevice ? 'manipulation' : 'auto'
  };
};