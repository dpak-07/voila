import React, { useEffect, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';

export function AnimatedNumber({ 
  value, 
  duration = 1.8, 
  decimals = 1,
  delay = 0,
  className = "" 
}) {
  const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    count.set(0);
    const controls = animate(count, numValue, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1], // Smooth, gradual executive ease-out curve
      onUpdate: (latest) => {
        if (Number.isInteger(numValue) && decimals === 0) {
          setDisplayValue(Math.round(latest).toLocaleString());
        } else if (decimals > 0 && numValue % 1 !== 0) {
          setDisplayValue(latest.toLocaleString(undefined, {
            minimumFractionDigits: decimals > 0 ? 1 : 0,
            maximumFractionDigits: decimals,
          }));
        } else {
          setDisplayValue(Math.round(latest).toLocaleString());
        }
      },
    });

    return () => controls.stop();
  }, [numValue, duration, decimals, delay]);

  return <span className={className}>{displayValue}</span>;
}

export default AnimatedNumber;
