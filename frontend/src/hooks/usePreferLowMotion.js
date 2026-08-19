import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

// Combines OS-level reduced motion with mobile/touch heuristics
export default function usePreferLowMotion() {
  const prefersReducedMotion = useReducedMotion();
  const [isTouchOrCoarse, setIsTouchOrCoarse] = useState(false);
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => setIsTouchOrCoarse(!!mq.matches);
    update();
    // Support older browsers
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(update);
      return () => mq.removeListener(update);
    }
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    const evaluate = () => {
      const saveData = !!connection?.saveData;
      const effectiveType = connection?.effectiveType || '';
      const slowNetwork = /(^|-)2g/.test(effectiveType) || effectiveType === 'slow-2g';
      const memory = navigator.deviceMemory;
      const cores = navigator.hardwareConcurrency;
      const lowSpec =
        (typeof memory === 'number' && memory <= 4 && typeof cores === 'number' && cores <= 4) ||
        (typeof memory === 'number' && memory <= 2) ||
        (typeof cores === 'number' && cores <= 2);

      setIsLowPower(Boolean(saveData || slowNetwork || lowSpec));
    };

    evaluate();

    if (connection?.addEventListener) {
      connection.addEventListener('change', evaluate);
      return () => connection.removeEventListener('change', evaluate);
    }
    if (connection?.addListener) {
      connection.addListener(evaluate);
      return () => connection.removeListener(evaluate);
    }
    return undefined;
  }, []);

  const shouldReduce = useMemo(
    () => prefersReducedMotion || isTouchOrCoarse || isLowPower,
    [prefersReducedMotion, isTouchOrCoarse, isLowPower],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (shouldReduce) {
      root.dataset.reduceMotion = 'true';
    } else {
      delete root.dataset.reduceMotion;
    }
  }, [shouldReduce]);

  return shouldReduce;
}
