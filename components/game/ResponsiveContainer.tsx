import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  mobileLayout?: 'stack' | 'scroll' | 'tabs';
  tabletLayout?: 'sidebar' | 'grid' | 'stack';
  desktopLayout?: 'sidebar' | 'grid' | 'columns';
  className?: string;
}

/**
 * Responsive container that adapts layout based on screen size
 */
const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  mobileLayout = 'stack',
  tabletLayout = 'grid',
  desktopLayout = 'sidebar',
  className
}) => {
  const theme = useTheme();
  const { isMobile, isTablet, isDesktop } = useResponsiveLayout();
  
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isTabletScreen = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
  const isDesktopScreen = useMediaQuery(theme.breakpoints.up('lg'));

  const getLayoutStyles = (): any => {
    if (isMobileScreen) {
      switch (mobileLayout) {
        case 'stack':
          return {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: 2,
            p: 1
          };
        case 'scroll':
          return {
            display: 'flex',
            flexDirection: 'column' as const,
            height: '100vh',
            overflow: 'auto',
            p: 1
          };
        case 'tabs':
          return {
            display: 'flex',
            flexDirection: 'column' as const,
            minHeight: '100vh',
            p: 1
          };
        default:
          return { p: 1 };
      }
    }

    if (isTabletScreen) {
      switch (tabletLayout) {
        case 'sidebar':
          return {
            display: 'flex',
            flexDirection: 'row' as const,
            gap: 3,
            p: 2,
            '& > :first-of-type': { flex: 2 },
            '& > :last-of-type': { flex: 1 }
          };
        case 'grid':
          return {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2,
            p: 2
          };
        case 'stack':
          return {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: 2,
            p: 2
          };
        default:
          return { p: 2 };
      }
    }

    if (isDesktopScreen) {
      switch (desktopLayout) {
        case 'sidebar':
          return {
            display: 'flex',
            flexDirection: 'row' as const,
            gap: 4,
            p: 3,
            '& > :first-of-type': { flex: 2 },
            '& > :last-of-type': { flex: 1 }
          };
        case 'grid':
          return {
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 3,
            p: 3
          };
        case 'columns':
          return {
            display: 'flex',
            flexDirection: 'row' as const,
            gap: 4,
            p: 3,
            '& > *': { flex: 1 }
          };
        default:
          return { p: 3 };
      }
    }

    return { p: 2 };
  };

  return (
    <Box
      sx={{
        ...getLayoutStyles(),
        transition: 'all 0.3s ease-in-out',
        minHeight: '100vh',
        backgroundColor: 'background.default'
      }}
      className={className}
    >
      {children}
    </Box>
  );
};

/**
 * Responsive grid component for game elements
 */
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  minItemWidth?: number;
  gap?: number;
  className?: string;
}> = ({
  children,
  minItemWidth = 200,
  gap = 2,
  className
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`,
        gap,
        width: '100%'
      }}
      className={className}
    >
      {children}
    </Box>
  );
};

/**
 * Responsive stack component that changes direction based on screen size
 */
export const ResponsiveStack: React.FC<{
  children: React.ReactNode;
  mobileDirection?: 'row' | 'column';
  desktopDirection?: 'row' | 'column';
  spacing?: number;
  className?: string;
}> = ({
  children,
  mobileDirection = 'column',
  desktopDirection = 'row',
  spacing = 2,
  className
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: (isMobile ? mobileDirection : desktopDirection) as any,
        gap: spacing,
        alignItems: isMobile && mobileDirection === 'column' ? 'center' : 'flex-start',
        width: '100%'
      }}
      className={className}
    >
      {children}
    </Box>
  );
};

export default ResponsiveContainer;