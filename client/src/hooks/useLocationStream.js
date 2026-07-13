import { useEffect } from 'react';

export const useLocationStream = (socket, rideId, isStreaming, intervalMs = 4000) => {
  useEffect(() => {
    if (!socket || !rideId || !isStreaming) return;

    let location = { latitude: 40.7580, longitude: -73.9855 }; // Default Times Square coordinates

    // Try to get geolocation defensively
    if (navigator.geolocation && typeof navigator.geolocation.getCurrentPosition === 'function') {
      try {
        navigator.geolocation.getCurrentPosition((pos) => {
          location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          };
        }, (err) => console.log(err));
      } catch (e) {
        console.log('Error accessing geolocation', e);
      }
    }

    const sendUpdate = () => {
      // Slightly jitter coordinates to simulate movement
      location.latitude += (Math.random() - 0.5) * 0.0002;
      location.longitude += (Math.random() - 0.5) * 0.0002;

      socket.emit('captain_location_update', {
        ride_id: rideId,
        latitude: location.latitude,
        longitude: location.longitude
      });
    };

    // Send first update immediately
    sendUpdate();

    const interval = setInterval(sendUpdate, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [socket, rideId, isStreaming, intervalMs]);
};
