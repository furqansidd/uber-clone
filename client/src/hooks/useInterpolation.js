import { useState, useEffect, useRef } from 'react';

export const useInterpolatedLocation = (targetLocation, durationMs = 3000) => {
  const [currentLocation, setCurrentLocation] = useState(targetLocation);
  const animationRef = useRef(null);
  const prevTargetRef = useRef(targetLocation);

  useEffect(() => {
    if (!targetLocation) return;

    // If there was no previous target, set immediately
    if (!prevTargetRef.current) {
      setCurrentLocation(targetLocation);
      prevTargetRef.current = targetLocation;
      return;
    }

    const startLat = currentLocation ? currentLocation.latitude : targetLocation.latitude;
    const startLng = currentLocation ? currentLocation.longitude : targetLocation.longitude;
    const endLat = targetLocation.latitude;
    const endLng = targetLocation.longitude;

    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Linear interpolation
      const currentLat = startLat + (endLat - startLat) * progress;
      const currentLng = startLng + (endLng - startLng) * progress;

      setCurrentLocation({ latitude: currentLat, longitude: currentLng });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);

    prevTargetRef.current = targetLocation;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetLocation, durationMs]);

  return currentLocation;
};
