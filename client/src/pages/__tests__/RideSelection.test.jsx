import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from '../../context/AuthContext';
import VehicleSelection from '../VehicleSelection';
import ConfirmRide from '../ConfirmRide';

// Mock axios
vi.mock('axios');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('Ride Selection & Confirmation Screens (Screens 7 & 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.setItem('token', 'rider-token-xyz');
    localStorage.setItem('role', 'rider');

    // Default session state
    const mockTrip = {
      pickup: { address: 'Grand Central', coordinates: { latitude: 40.7527, longitude: -73.9772 } },
      destination: { address: 'Empire State', coordinates: { latitude: 40.7484, longitude: -73.9857 } }
    };
    sessionStorage.setItem('tripDetails', JSON.stringify(mockTrip));
  });

  describe('VehicleSelection Component', () => {
    it('should calculate estimates and allow selecting vehicle type', () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <VehicleSelection />
          </AuthProvider>
        </BrowserRouter>
      );

      // Verify pickup/destination headers
      expect(screen.getAllByText('Grand Central')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Empire State')[0]).toBeInTheDocument();

      // Verify that Bike card is present
      expect(screen.getByText('Bike')).toBeInTheDocument();
      expect(screen.getByText('Rickshaw')).toBeInTheDocument();
      expect(screen.getByText('Car')).toBeInTheDocument();

      // Click Confirm Ride
      fireEvent.click(screen.getByRole('button', { name: /Confirm Ride/i }));

      // confirmDetails saved to sessionStorage
      const confirmDetails = JSON.parse(sessionStorage.getItem('confirmDetails'));
      expect(confirmDetails.vehicle_type).toBe('bike');
      expect(confirmDetails.fare.total).toBeGreaterThan(0);
      expect(mockNavigate).toHaveBeenCalledWith('/confirm-ride');
    });
  });

  describe('ConfirmRide Component', () => {
    it('should display selected vehicle and request ride via API', async () => {
      // Set confirmDetails in sessionStorage
      const mockConfirm = {
        pickup: { address: 'Grand Central', coordinates: { latitude: 40.7527, longitude: -73.9772 } },
        destination: { address: 'Empire State', coordinates: { latitude: 40.7484, longitude: -73.9857 } },
        vehicle_type: 'car',
        fare: { total: 42.50 }
      };
      sessionStorage.setItem('confirmDetails', JSON.stringify(mockConfirm));

      axios.post.mockResolvedValueOnce({
        data: {
          ride: { _id: 'ride999', otp_code: '4321', status: 'requested' }
        }
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <ConfirmRide />
          </AuthProvider>
        </BrowserRouter>
      );

      // Verify preview labels
      expect(screen.getByText('DriveNow Comfort')).toBeInTheDocument();
      expect(screen.getByText('$42.50')).toBeInTheDocument();

      // Click Confirm Car button
      fireEvent.click(screen.getByRole('button', { name: /Confirm Car/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/rides/request'),
          {
            pickup_address: 'Grand Central',
            pickup_coordinates: { latitude: 40.7527, longitude: -73.9772 },
            destination_address: 'Empire State',
            destination_coordinates: { latitude: 40.7484, longitude: -73.9857 },
            vehicle_type: 'car'
          },
          expect.objectContaining({
            headers: { Authorization: 'Bearer rider-token-xyz' }
          })
        );
        expect(JSON.parse(sessionStorage.getItem('activeRide'))._id).toBe('ride999');
        expect(mockNavigate).toHaveBeenCalledWith('/searching-driver');
      });
    });
  });
});
