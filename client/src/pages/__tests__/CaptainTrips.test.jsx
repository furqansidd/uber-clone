import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from '../../context/AuthContext';
import IncomingRequest from '../IncomingRequest';
import CaptainConfirmation from '../CaptainConfirmation';

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

// Mock Socket.io-client
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

vi.mock('../../context/AuthContext', () => {
  return {
    useAuth: () => ({
      token: 'captain-token-123',
      role: 'captain',
      socket: mockSocket,
      login: vi.fn(),
      logout: vi.fn()
    }),
    AuthProvider: ({ children }) => <div>{children}</div>
  };
});

describe('Incoming Requests & Ride Confirmation (Screens 13 & 14)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
  });

  describe('IncomingRequest Component', () => {
    it('should render details and accept ride', async () => {
      const mockRide = {
        _id: 'ride555',
        pickup_address: 'Rider Pickup',
        destination_address: 'Rider Dropoff',
        fare: { total: 18.50 },
        vehicle_type: 'car',
        rider: { first_name: 'Sarah' }
      };
      sessionStorage.setItem('rideOffer', JSON.stringify(mockRide));
      sessionStorage.setItem('offerTimeout', '15');

      axios.post.mockResolvedValueOnce({
        data: {
          ride: { _id: 'ride555', status: 'driver_arriving' }
        }
      });

      render(
        <BrowserRouter>
          <IncomingRequest />
        </BrowserRouter>
      );

      expect(screen.getAllByText('Sarah')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Rider Pickup')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Rider Dropoff')[0]).toBeInTheDocument();
      expect(screen.getByText('$18.50')).toBeInTheDocument();

      const acceptBtn = screen.getByRole('button', { name: /ACCEPT RIDE/i });
      fireEvent.click(acceptBtn);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/rides/ride555/accept'),
          {},
          expect.any(Object)
        );
        expect(mockNavigate).toHaveBeenCalledWith('/captain-confirmation');
      });
    });
  });

  describe('CaptainConfirmation Component', () => {
    it('should show arrived button when status is driver_arriving', async () => {
      const mockRide = {
        _id: 'ride555',
        pickup_address: 'Rider Pickup',
        destination_address: 'Rider Dropoff',
        status: 'driver_arriving',
        rider: { first_name: 'Sarah' }
      };
      sessionStorage.setItem('activeRide', JSON.stringify(mockRide));

      axios.post.mockResolvedValueOnce({
        data: {
          ride: { ...mockRide, status: 'driver_arrived' }
        }
      });

      render(
        <BrowserRouter>
          <CaptainConfirmation />
        </BrowserRouter>
      );

      // Wait for useEffect to load activeRide and render rider name
      expect(await screen.findByText('Sarah')).toBeInTheDocument();

      const arrivedBtn = screen.getByRole('button', { name: /MARK AS ARRIVED/i });
      fireEvent.click(arrivedBtn);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/rides/ride555/arrived'),
          {},
          expect.any(Object)
        );
        // Status updated to driver_arrived in view
        expect(screen.getByText("Enter Rider's Verification Code")).toBeInTheDocument();
      });
    });

    it('should submit OTP code and navigate to active trip on confirm', async () => {
      const mockRide = {
        _id: 'ride555',
        pickup_address: 'Rider Pickup',
        destination_address: 'Rider Dropoff',
        status: 'driver_arrived',
        rider: { first_name: 'Sarah' }
      };
      sessionStorage.setItem('activeRide', JSON.stringify(mockRide));

      axios.post.mockResolvedValueOnce({
        data: {
          ride: { ...mockRide, status: 'ongoing' }
        }
      });

      render(
        <BrowserRouter>
          <CaptainConfirmation />
        </BrowserRouter>
      );

      // Wait for useEffect to load activeRide and render rider name
      expect(await screen.findByText('Sarah')).toBeInTheDocument();

      // Enter OTP: 1, 2, 3, 4
      const digits = ['1', '2', '3', '4'];
      digits.forEach((digit, i) => {
        const input = screen.getByTestId(`otp-input-${i}`);
        fireEvent.change(input, { target: { value: digit } });
      });

      const confirmBtn = screen.getByRole('button', { name: /Confirm Ride/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/rides/ride555/start'),
          { otp_code: '1234' },
          expect.any(Object)
        );
        expect(mockNavigate).toHaveBeenCalledWith('/captain-trip');
      });
    });
  });
});
