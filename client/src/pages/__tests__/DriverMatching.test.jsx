import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from '../../context/AuthContext';
import SearchingDriver from '../SearchingDriver';
import DriverMatched from '../DriverMatched';

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

// Mock Socket.io-client via AuthContext mock
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

vi.mock('../../context/AuthContext', () => {
  return {
    useAuth: () => ({
      token: 'test-token',
      role: 'rider',
      socket: mockSocket,
      login: vi.fn(),
      logout: vi.fn()
    }),
    AuthProvider: ({ children }) => <div>{children}</div>
  };
});

describe('Searching Driver & Driver Matched Screens (Screens 9 & 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    
    const mockRide = {
      _id: 'ride111',
      pickup_address: 'Start Point',
      destination_address: 'End Point',
      otp_code: '9876',
      status: 'requested',
      fare: { total: 15.50 },
      captain: {
        full_name: 'John Doe',
        rating: 4.8,
        vehicle_color: 'Black',
        vehicle_type: 'car',
        plate_number: 'ABC-123',
        phone_number: '5551212'
      }
    };
    sessionStorage.setItem('activeRide', JSON.stringify(mockRide));
  });

  describe('SearchingDriver Component', () => {
    it('should render searching status and trigger cancel ride request API', async () => {
      axios.delete.mockResolvedValueOnce({ data: { success: true } });

      render(
        <BrowserRouter>
          <SearchingDriver />
        </BrowserRouter>
      );

      expect(screen.getByText('Looking for a Driver')).toBeInTheDocument();
      expect(screen.getAllByText('Start Point')[0]).toBeInTheDocument();
      expect(screen.getAllByText('End Point')[0]).toBeInTheDocument();

      const cancelBtn = screen.getByRole('button', { name: /Cancel Request/i });
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          expect.stringContaining('/rides/ride111'),
          expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/rider-home');
      });
    });

    it('should register socket handler for ride_matched and navigate', () => {
      render(
        <BrowserRouter>
          <SearchingDriver />
        </BrowserRouter>
      );

      // Verify socket events joined
      expect(mockSocket.emit).toHaveBeenCalledWith('join_ride', { ride_id: 'ride111' });
      expect(mockSocket.on).toHaveBeenCalledWith('ride_matched', expect.any(Function));

      // Trigger socket ride_matched handler manually
      const matchedCallback = mockSocket.on.mock.calls.find(c => c[0] === 'ride_matched')[1];
      matchedCallback({ ride: { _id: 'ride111', status: 'driver_arriving', otp_code: '9876' } });

      expect(mockNavigate).toHaveBeenCalledWith('/driver-matched');
    });
  });

  describe('DriverMatched Component', () => {
    it('should display captain info, OTP code, and handle chat toggling', async () => {
      axios.get.mockResolvedValueOnce({ data: { messages: [] } });

      render(
        <BrowserRouter>
          <DriverMatched />
        </BrowserRouter>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('ABC-123')).toBeInTheDocument();
      expect(screen.getByTestId('otp-display')).toHaveTextContent('9876');

      // Click Message button to open chat modal
      const messageBtn = screen.getByRole('button', { name: /Message/i });
      fireEvent.click(messageBtn);

      // Verify chat component is rendered
      expect(screen.getByText('Ride Chat')).toBeInTheDocument();
    });

    it('should register socket handler for ride_arrived and navigate to tracking', () => {
      render(
        <BrowserRouter>
          <DriverMatched />
        </BrowserRouter>
      );

      expect(mockSocket.on).toHaveBeenCalledWith('ride_arrived', expect.any(Function));

      // Trigger socket ride_arrived handler manually
      const arrivedCallback = mockSocket.on.mock.calls.find(c => c[0] === 'ride_arrived')[1];
      arrivedCallback({ ride: { _id: 'ride111', status: 'driver_arrived' } });

      expect(mockNavigate).toHaveBeenCalledWith('/rider-tracking');
    });
  });
});
