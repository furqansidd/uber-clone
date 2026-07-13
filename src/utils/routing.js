const https = require('https');

const getRoute = async (pickup, destination, stops = []) => {
  const apiKey = process.env.LOCATIONIQ_API_KEY;

  const extractCoords = (point) => {
    // Handle both { coordinates: [lng, lat] } and Mongoose GeoJSON documents
    const coords = point.coordinates.coordinates || point.coordinates;
    return `${coords[0]},${coords[1]}`;
  };

  const coordsList = [];
  coordsList.push(extractCoords(pickup));
  for (const stop of stops) {
    coordsList.push(extractCoords(stop));
  }
  coordsList.push(extractCoords(destination));

  const coordsStr = coordsList.join(';');

  // If no API key or running in mock environment, fallback to straight-line estimation
  if (!apiKey || apiKey === 'mock_key') {
    return calculateFallbackRoute(pickup, destination, stops);
  }

  const url = `https://us1.locationiq.com/v1/directions/driving/${coordsStr}?key=${apiKey}&overview=false`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            // distance in meters -> km, duration in seconds -> minutes
            resolve({
              distance: Number((route.distance / 1000).toFixed(2)),
              duration: Number((route.duration / 60).toFixed(2))
            });
          } else {
            resolve(calculateFallbackRoute(pickup, destination, stops));
          }
        } catch (e) {
          resolve(calculateFallbackRoute(pickup, destination, stops));
        }
      });
    }).on('error', () => {
      resolve(calculateFallbackRoute(pickup, destination, stops));
    });
  });
};

const calculateFallbackRoute = (pickup, destination, stops = []) => {
  const getCoords = (point) => point.coordinates.coordinates || point.coordinates;

  const getDistance = (c1, c2) => {
    const dx = (c1[0] - c2[0]) * 111.32; // Approx degrees to km conversion
    const dy = (c1[1] - c2[1]) * 110.57;
    return Math.sqrt(dx * dx + dy * dy);
  };

  let totalDistance = 0;
  let current = getCoords(pickup);

  for (const stop of stops) {
    const stopCoords = getCoords(stop);
    totalDistance += getDistance(current, stopCoords);
    current = stopCoords;
  }

  totalDistance += getDistance(current, getCoords(destination));

  // Average speed of 30km/h (2 mins per km)
  const totalDuration = totalDistance * 2.0;

  return {
    distance: Number(totalDistance.toFixed(2)),
    duration: Number(totalDuration.toFixed(2))
  };
};

module.exports = {
  getRoute
};
