import { useCallback, useRef, useEffect } from 'react';
import { useAccessibility } from './useAccessibility';

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: string;
  fillMode?: 'forwards' | 'backwards' | 'both' | 'none';
}

/**
 * Hook for managing animations with accessibility considerations
 */
export const useAnimations = () => {
  const { prefersReducedMotion } = useAccessibility();
  const animationRefs = useRef<Set<Animation>>(new Set());

  // Clean up animations on unmount
  useEffect(() => {
    return () => {
      animationRefs.current.forEach(animation => {
        animation.cancel();
      });
      animationRefs.current.clear();
    };
  }, []);

  const createAnimation = useCallback((
    element: HTMLElement,
    keyframes: Keyframe[],
    config: AnimationConfig = {}
  ): Animation | null => {
    if (prefersReducedMotion) {
      // For reduced motion, apply final state immediately
      const finalKeyframe = keyframes[keyframes.length - 1];
      if (finalKeyframe) {
        Object.assign(element.style, finalKeyframe);
      }
      return null;
    }

    const animation = element.animate(keyframes, {
      duration: config.duration || 300,
      delay: config.delay || 0,
      easing: config.easing || 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: config.fillMode || 'forwards'
    });

    animationRefs.current.add(animation);

    animation.addEventListener('finish', () => {
      animationRefs.current.delete(animation);
    });

    animation.addEventListener('cancel', () => {
      animationRefs.current.delete(animation);
    });

    return animation;
  }, [prefersReducedMotion]);

  // Predefined animation functions
  const fadeIn = useCallback((element: HTMLElement, config?: AnimationConfig) => {
    return createAnimation(element, [
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 300, ...config });
  }, [createAnimation]);

  const fadeOut = useCallback((element: HTMLElement, config?: AnimationConfig) => {
    return createAnimation(element, [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-10px)' }
    ], { duration: 300, ...config });
  }, [createAnimation]);

  const slideIn = useCallback((element: HTMLElement, direction: 'left' | 'right' | 'up' | 'down' = 'left', config?: AnimationConfig) => {
    const transforms = {
      left: ['translateX(-20px)', 'translateX(0)'],
      right: ['translateX(20px)', 'translateX(0)'],
      up: ['translateY(-20px)', 'translateY(0)'],
      down: ['translateY(20px)', 'translateY(0)']
    };

    return createAnimation(element, [
      { opacity: 0, transform: transforms[direction][0] },
      { opacity: 1, transform: transforms[direction][1] }
    ], { duration: 400, ...config });
  }, [createAnimation]);

  const bounce = useCallback((element: HTMLElement, config?: AnimationConfig) => {
    return createAnimation(element, [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-8px)' },
      { transform: 'translateY(0)' },
      { transform: 'translateY(-4px)' },
      { transform: 'translateY(0)' }
    ], { duration: 600, ...config });
  }, [createAnimation]);

  const pulse = useCallback((element: HTMLElement, config?: AnimationConfig) => {
    return createAnimation(element, [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0.7, transform: 'scale(1.05)' },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 1000, ...config });
  }, [createAnimation]);

  const shake = useCallback((element: HTMLElement, config?: AnimationConfig) => {
    return createAnimation(element, [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-2px)' },
      { transform: 'translateX(2px)' },
      { transform: 'translateX(-2px)' },
      { transform: 'translateX(2px)' },
      { transform: 'translateX(0)' }
    ], { duration: 500, ...config });
  }, [createAnimation]);

  const scaleIn = useCallback((element: HTMLElement, config?: AnimationConfig) => {
    return createAnimation(element, [
      { opacity: 0, transform: 'scale(0.8)' },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 300, ...config });
  }, [createAnimation]);

  const scaleOut = useCallback((element: HTMLElement, config?: AnimationConfig) => {
    return createAnimation(element, [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.8)' }
    ], { duration: 300, ...config });
  }, [createAnimation]);

  // Utility function to animate multiple elements in sequence
  const animateSequence = useCallback(async (
    animations: Array<{
      element: HTMLElement;
      animation: (element: HTMLElement, config?: AnimationConfig) => Animation | null;
      config?: AnimationConfig;
      delay?: number;
    }>
  ) => {
    for (const { element, animation, config, delay } of animations) {
      if (delay) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const anim = animation(element, config);
      if (anim) {
        await anim.finished;
      }
    }
  }, []);

  // Utility function to animate multiple elements in parallel
  const animateParallel = useCallback(async (
    animations: Array<{
      element: HTMLElement;
      animation: (element: HTMLElement, config?: AnimationConfig) => Animation | null;
      config?: AnimationConfig;
    }>
  ) => {
    const promises = animations.map(({ element, animation, config }) => {
      const anim = animation(element, config);
      return anim ? anim.finished : Promise.resolve();
    });

    await Promise.all(promises);
  }, []);

  return {
    // Core animation function
    createAnimation,
    
    // Predefined animations
    fadeIn,
    fadeOut,
    slideIn,
    bounce,
    pulse,
    shake,
    scaleIn,
    scaleOut,
    
    // Sequence utilities
    animateSequence,
    animateParallel,
    
    // State
    prefersReducedMotion,
    
    // Cleanup
    cancelAllAnimations: () => {
      animationRefs.current.forEach(animation => animation.cancel());
      animationRefs.current.clear();
    }
  };
};

/**
 * Hook for managing CSS class-based animations
 */
export const useCSSAnimations = () => {
  const { prefersReducedMotion } = useAccessibility();

  const getAnimationClass = useCallback((animationName: string): string => {
    if (prefersReducedMotion) {
      return ''; // Return empty string to disable animations
    }
    return `animate-${animationName}`;
  }, [prefersReducedMotion]);

  const getTransitionClass = useCallback((property: string = 'all'): string => {
    if (prefersReducedMotion) {
      return ''; // Return empty string to disable transitions
    }
    return `transition-${property}`;
  }, [prefersReducedMotion]);

  return {
    getAnimationClass,
    getTransitionClass,
    prefersReducedMotion
  };
};