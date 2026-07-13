/**
 * Map.test.jsx — Architecture contract tests.
 *
 * Core invariant verified: L.map is created ONCE (not per captain location update).
 *
 * Approach:
 *   - vi.mock('leaflet') hoisted by vitest intercepts both static AND dynamic imports.
 *   - navigator.userAgent is stubbed to bypass the jsdom-mock branch in Map.jsx.
 *   - We use waitFor to handle the async import('leaflet') inside the mount effect.
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

// ─── These spies MUST be declared before vi.mock (vitest hoists the factory) ──
const spySetLatLng = vi.fn().mockReturnThis();
const spyMarkerRemove = vi.fn();
const spyFitBounds = vi.fn();
const spyMapOn = vi.fn();
const spyMapRemove = vi.fn();

// Stable map instance returned by every L.map() call
const mapInst = {
  setView: vi.fn().mockReturnThis(),
  fitBounds: spyFitBounds,
  on: spyMapOn,
  remove: spyMapRemove,
};

const spyLMap = vi.fn(() => mapInst);

const spyMarker = vi.fn((latlng, opts) => ({
  _latlng: latlng,
  _className: opts?.icon?._className,
  addTo: vi.fn().mockReturnThis(),
  setLatLng: spySetLatLng,
  getLatLng: vi.fn(() => latlng),
  remove: spyMarkerRemove,
}));

// ─── Mock leaflet — factory runs synchronously, vitest hoists this call ───────
vi.mock('leaflet', () => {
  return {
    default: {
      map: spyLMap,
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      marker: spyMarker,
      divIcon: vi.fn((opts) => ({ _className: opts?.className })),
      featureGroup: vi.fn(() => ({
        getBounds: vi.fn(() => ({ pad: vi.fn(() => ({})) })),
      })),
    },
  };
});

// ─── Mock hook: pass captainLocation through unchanged ────────────────────────
vi.mock('../../hooks/useInterpolation', () => ({
  useInterpolatedLocation: (loc) => loc,
}));

// ─── Import Map AFTER mocks (vitest hoists vi.mock anyway, but explicit is safe) ─
import Map from '../Map';

// ─── Override userAgent so Map.jsx doesn't return the jsdom mock branch ───────
beforeAll(() => {
  vi.stubGlobal('navigator', {
    ...window.navigator,
    userAgent: 'Mozilla/5.0 Chrome/120',
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  // Restore chainable returns after clearAllMocks resets them
  mapInst.setView.mockReturnValue(mapInst);
  spyMarker.mockImplementation((latlng, opts) => ({
    _latlng: latlng,
    _className: opts?.icon?._className,
    addTo: vi.fn().mockReturnThis(),
    setLatLng: spySetLatLng,
    getLatLng: vi.fn(() => latlng),
    remove: spyMarkerRemove,
  }));
  spyLMap.mockReturnValue(mapInst);
  spySetLatLng.mockReturnThis();
});

// ─── Stable test data ─────────────────────────────────────────────────────────
const pickup = { address: '5th Ave', coordinates: { latitude: 40.7128, longitude: -74.006 } };
const destination = { address: 'JFK', coordinates: { latitude: 40.6413, longitude: -73.7781 } };
const loc1 = { latitude: 40.71, longitude: -74.01 };
const loc2 = { latitude: 40.72, longitude: -74.02 };
const loc3 = { latitude: 40.73, longitude: -74.03 };

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Map component — render architecture', () => {

  it('creates L.map exactly ONCE regardless of how many captainLocation updates occur', async () => {
    const { rerender } = render(
      <Map pickup={pickup} destination={destination} captainLocation={loc1} />
    );

    // Wait for the async import('leaflet').then() chain to complete
    await waitFor(() => expect(spyLMap).toHaveBeenCalledTimes(1));

    // Simulate 5 rapid location updates (representing 60fps RAF ticks)
    await act(async () => {
      rerender(<Map pickup={pickup} destination={destination} captainLocation={loc2} />);
      rerender(<Map pickup={pickup} destination={destination} captainLocation={loc3} />);
      rerender(<Map pickup={pickup} destination={destination} captainLocation={loc1} />);
      rerender(<Map pickup={pickup} destination={destination} captainLocation={loc2} />);
      rerender(<Map pickup={pickup} destination={destination} captainLocation={loc3} />);
    });

    // THE core assertion — L.map constructed once and only once
    expect(spyLMap).toHaveBeenCalledTimes(1);
  });

  it('calls setLatLng on subsequent captain location updates instead of creating new markers', async () => {
    const { rerender } = render(
      <Map pickup={pickup} destination={destination} captainLocation={null} />
    );

    // Wait for map to be ready
    await waitFor(() => expect(spyLMap).toHaveBeenCalledTimes(1));

    // First captain location → Effect #3 creates the captain marker
    await act(async () => {
      rerender(<Map pickup={pickup} destination={destination} captainLocation={loc1} />);
    });

    // Count captain marker creations at this point
    const captainMarkersBorn = spyMarker.mock.calls.filter(
      ([, opts]) => opts?.icon?._className === 'custom-captain-marker'
    ).length;
    expect(captainMarkersBorn).toBe(1);

    const totalMarkersSnapshot = spyMarker.mock.calls.length;

    // Second and third captain location updates
    await act(async () => {
      rerender(<Map pickup={pickup} destination={destination} captainLocation={loc2} />);
    });
    await act(async () => {
      rerender(<Map pickup={pickup} destination={destination} captainLocation={loc3} />);
    });

    // No new markers should have been created — only setLatLng
    expect(spyMarker.mock.calls.length).toBe(totalMarkersSnapshot);

    // setLatLng was called for each position update
    expect(spySetLatLng).toHaveBeenCalledWith([loc2.latitude, loc2.longitude]);
    expect(spySetLatLng).toHaveBeenCalledWith([loc3.latitude, loc3.longitude]);
  });

  it('does not recreate the map when route (pickup/destination) changes', async () => {
    const dest2 = { address: 'Central Park', coordinates: { latitude: 40.785, longitude: -73.968 } };

    const { rerender } = render(
      <Map pickup={pickup} destination={destination} captainLocation={null} />
    );

    await waitFor(() => expect(spyLMap).toHaveBeenCalledTimes(1));
    const mapCallCount = spyLMap.mock.calls.length;

    // Change destination
    await act(async () => {
      rerender(<Map pickup={pickup} destination={dest2} captainLocation={null} />);
    });

    // L.map was NOT called again — only static markers were refreshed
    expect(spyLMap.mock.calls.length).toBe(mapCallCount);
  });

});
