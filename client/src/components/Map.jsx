import React, { useEffect, useRef, useMemo } from 'react';
import { useInterpolatedLocation } from '../hooks/useInterpolation';
import 'leaflet/dist/leaflet.css';

// Stable empty array — prevents new reference on every render when stops prop is omitted
const EMPTY_STOPS = [];

/**
 * Map renders a live Leaflet map with stable re-render architecture:
 *
 *   Effect #1 (mount-only, deps=[]):
 *     Creates the L.map instance ONCE. Stores it in mapInstanceRef.
 *     Adds tile layer. Registers drag/zoom listeners to set userHasInteracted.
 *     Cleans up on unmount.
 *
 *   Effect #2 (route-markers, deps=[pickup, destination, stops]):
 *     Runs only when the ride route changes (rare).
 *     Removes previous pickup/destination/stop markers, creates new ones.
 *     Calls fitBounds once on first placement.
 *     Never touches the captain marker.
 *
 *   Effect #3 (captain-position, deps=[interpolatedCaptainLoc]):
 *     Runs ~60× per second during interpolation animation.
 *     Calls captainMarkerRef.current.setLatLng() on the EXISTING marker.
 *     Creates the captain marker on first call if it doesn't exist yet.
 *     NEVER calls map.remove(), L.map(), or fitBounds.
 */

const LOCATIONIQ_KEY = import.meta.env.VITE_LOCATIONIQ_KEY || '';
const TILE_URL = `https://{s}.tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_KEY}`;
const DEFAULT_CENTER = [40.7128, -74.006]; // NYC fallback

const Map = ({ pickup, destination, stops, captainLocation, interactive = true }) => {
  const containerRef = useRef(null);

  // Stable refs — changes to these never trigger re-renders
  const mapInstanceRef = useRef(null);
  const staticMarkersRef = useRef([]); // pickup / destination / stop markers
  const captainMarkerRef = useRef(null);
  const userHasInteracted = useRef(false);
  const leafletRef = useRef(null); // cached L module

  const interpolatedCaptainLoc = useInterpolatedLocation(captainLocation);

  // Stabilize the stops array: if caller passes a new literal `[]` every render,
  // this prevents effect #2 from re-running. We compare by JSON equality.
  const stopsJson = JSON.stringify(stops || EMPTY_STOPS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableStops = useMemo(() => stops || EMPTY_STOPS, [stopsJson]);

  // Detect test environment (jsdom) — render a lightweight mock instead
  const isTest =
    typeof window !== 'undefined' && window.navigator.userAgent.includes('jsdom');

  // ─── Effect #1: Mount — create map ONCE ─────────────────────────────────────
  useEffect(() => {
    if (isTest || !containerRef.current) return;

    import('leaflet')
      .then((LModule) => {
        if (!containerRef.current || mapInstanceRef.current) return; // guard double-init

        const L = LModule.default || LModule;
        leafletRef.current = L;

        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView(DEFAULT_CENTER, 13);

        L.tileLayer(TILE_URL, { maxZoom: 18 }).addTo(map);

        // Track user interaction — once true, skip auto-recentering
        const onInteract = () => { userHasInteracted.current = true; };
        map.on('dragstart', onInteract);
        map.on('zoomstart', onInteract);

        mapInstanceRef.current = map;
      })
      .catch((err) => console.error('Error loading Leaflet:', err));

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Effect #2: Static markers — runs only when route changes ───────────────
  useEffect(() => {
    if (isTest) return;

    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Remove previous static markers
    staticMarkersRef.current.forEach((m) => m.remove());
    staticMarkersRef.current = [];

    const newMarkers = [];

    if (pickup?.coordinates) {
      const m = L.marker(
        [pickup.coordinates.latitude, pickup.coordinates.longitude],
        {
          icon: L.divIcon({
            className: 'custom-pickup-marker',
            html: `<div class="w-4 h-4 rounded-full bg-white border-4 border-black shadow"></div>`,
          }),
        }
      ).addTo(map);
      newMarkers.push(m);
    }

    if (destination?.coordinates) {
      const m = L.marker(
        [destination.coordinates.latitude, destination.coordinates.longitude],
        {
          icon: L.divIcon({
            className: 'custom-dest-marker',
            html: `<div class="w-4 h-4 bg-black border-2 border-white shadow"></div>`,
          }),
        }
      ).addTo(map);
      newMarkers.push(m);
    }

    stableStops.forEach((stop, index) => {
      if (stop?.coordinates) {
        const m = L.marker(
          [stop.coordinates.latitude, stop.coordinates.longitude],
          {
            icon: L.divIcon({
              className: 'custom-stop-marker',
              html: `<div class="w-4 h-4 bg-[#5d5f5f] border-2 border-white shadow flex items-center justify-center text-[8px] text-white font-bold">${index + 1}</div>`,
            }),
          }
        ).addTo(map);
        newMarkers.push(m);
      }
    });

    staticMarkersRef.current = newMarkers;

    // Fit bounds only once, and only if user hasn't manually panned/zoomed
    if (!userHasInteracted.current) {
      const allMarkers = captainMarkerRef.current
        ? [...newMarkers, captainMarkerRef.current]
        : newMarkers;

      if (allMarkers.length > 1) {
        const group = L.featureGroup(allMarkers);
        map.fitBounds(group.getBounds().pad(0.15));
      } else if (allMarkers.length === 1) {
        map.setView(allMarkers[0].getLatLng(), 15);
      }
    }
  }, [pickup, destination, stableStops, isTest]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Effect #3: Captain position — runs every interpolation tick (~60fps) ───
  useEffect(() => {
    if (isTest || !interpolatedCaptainLoc) return;

    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    const { latitude, longitude } = interpolatedCaptainLoc;

    if (captainMarkerRef.current) {
      // ✅ Move existing marker — O(1), no DOM teardown
      captainMarkerRef.current.setLatLng([latitude, longitude]);
    } else {
      // First time we have a captain location — create the marker once
      captainMarkerRef.current = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: 'custom-captain-marker',
          html: `<div class="w-6 h-6 bg-black rounded-full shadow flex items-center justify-center text-white"><span class="material-symbols-outlined text-sm">directions_car</span></div>`,
        }),
      }).addTo(map);
    }
  }, [interpolatedCaptainLoc, isTest]);

  // ─── Test / jsdom render ──────────────────────────────────────────────────────
  if (isTest) {
    return (
      <div
        className="w-full h-full bg-[#eeeeee] flex flex-col items-center justify-center text-[#5d5f5f] relative"
        data-testid="mock-map"
      >
        <span className="material-symbols-outlined text-3xl mb-1 text-[#7e7576]">map</span>
        <span className="text-xs font-semibold uppercase tracking-wider">
          NYC Street Map Canvas (Mocked)
        </span>
        {pickup && <div data-testid="pickup-marker">{pickup.address}</div>}
        {destination && <div data-testid="destination-marker">{destination.address}</div>}
        {interpolatedCaptainLoc && (
          <div data-testid="captain-marker">
            Captain: {interpolatedCaptainLoc.latitude},{interpolatedCaptainLoc.longitude}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ minHeight: '300px' }}
    />
  );
};

export default Map;
