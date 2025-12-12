import { useEffect, useState, useCallback, useRef } from 'react';

export interface AccessibilityPreferences {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  prefersLargeText: boolean;
  screenReaderActive: boolean;
}

/**
 * Hook for managing accessibility features and preferences
 */
export const useAccessibility = (): AccessibilityPreferences => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersLargeText: false,
    screenReaderActive: false
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updatePreferences = () => {
      setPreferences({
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        prefersHighContrast: window.matchMedia('(prefers-contrast: high)').matches,
        prefersLargeText: window.matchMedia('(prefers-reduced-data: reduce)').matches,
        screenReaderActive: !!document.querySelector('[aria-live]') || 
                           !!window.navigator.userAgent.match(/NVDA|JAWS|VoiceOver|TalkBack/)
      });
    };

    updatePreferences();

    // Listen for media query changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    const handleMotionChange = () => updatePreferences();
    const handleContrastChange = () => updatePreferences();

    motionQuery.addEventListener('change', handleMotionChange);
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  return preferences;
};

/**
 * Hook for managing focus and keyboard navigation
 */
export const useFocusManagement = () => {
  const [focusVisible, setFocusVisible] = useState(false);
  const lastInteractionRef = useRef<'mouse' | 'keyboard' | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMouseDown = () => {
      lastInteractionRef.current = 'mouse';
      setFocusVisible(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) {
        lastInteractionRef.current = 'keyboard';
        setFocusVisible(true);
      }
    };

    const handleFocus = () => {
      if (lastInteractionRef.current === 'keyboard') {
        setFocusVisible(true);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocus);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocus);
    };
  }, []);

  const createFocusTrap = useCallback((containerRef: React.RefObject<HTMLElement>) => {
    if (!containerRef.current) return () => {};

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return {
    focusVisible,
    createFocusTrap
  };
};

/**
 * Hook for managing ARIA live regions and announcements
 */
export const useAriaLiveRegion = () => {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Create live region if it doesn't exist
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.id = 'aria-live-region';
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    return () => {
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) return;

    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = message;

    // Clear the message after a delay to allow for re-announcements
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  return { announce };
};

/**
 * Hook for generating accessible descriptions and labels
 */
export const useAccessibleLabels = () => {
  const generateGameStateDescription = useCallback((
    currentPlayer: string,
    phase: string,
    round: number,
    waitingPlayers: string[]
  ): string => {
    let description = `ゲーム進行状況: ラウンド${round}、${phase}フェーズ。`;
    description += `現在のプレイヤー: ${currentPlayer}。`;
    
    if (waitingPlayers.length > 0) {
      description += `アクション待ちプレイヤー: ${waitingPlayers.join('、')}。`;
    } else {
      description += `全プレイヤーがアクションを完了しています。`;
    }
    
    return description;
  }, []);

  const generateBoardDescription = useCallback((
    totalSpots: number,
    occupiedSpots: number,
    totalPieces: number
  ): string => {
    return `花道ボード: ${totalSpots}個のスポットのうち${occupiedSpots}個が使用中。合計${totalPieces}個のオタクコマが配置されています。`;
  }, []);

  const generatePlayerDescription = useCallback((
    name: string,
    money: number,
    points: number,
    availablePieces: number,
    isCurrentPlayer: boolean
  ): string => {
    let description = `${name}: 資金${money}金、ポイント${points}点、`;
    description += `利用可能なオタクコマ${availablePieces}個。`;
    
    if (isCurrentPlayer) {
      description += `現在のアクティブプレイヤーです。`;
    }
    
    return description;
  }, []);

  return {
    generateGameStateDescription,
    generateBoardDescription,
    generatePlayerDescription
  };
};