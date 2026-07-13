import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from '../../context/AuthContext';
import CaptainActiveTrip from '../CaptainActiveTrip';
import FinishRideSummary from '../FinishRideSummary';

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
      token: 'test-captain-token',
      role: 'captain',
      socket: mockSocket,
      login: vi.fn(),
      logout: vi.fn()
    }),
    AuthProvider: ({ children }) => <div>{children}</div>
  };
});

describe('Trip Execution & Summary Screens (Screens 15 & 16)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
  });

  describe('CaptainActiveTrip Component', () => {
    it('should render ride details and complete trip via API', async () => {
      const mockRide = {
        _id: 'ride777',
        pickup_address: 'Point A',
        destination_address: 'Point B',
        status: 'ongoing',
        fare: { total: 18.50 },
        rider: { first_name: 'Sarah' }
      };
      sessionStorage.setItem('activeRide', JSON.stringify(mockRide));

      axios.post.mockResolvedValueOnce({
        data: {
          ride: { ...mockRide, status: 'completed' }
        }
      });

      render(
        <BrowserRouter>
          <CaptainActiveTrip />
        </BrowserRouter>
      );

      // Wait for useEffect to load activeRide and render rider name
      expect(await screen.findByText('Sarah')).toBeInTheDocument();
      expect(screen.getAllByText('Point B')[0]).toBeInTheDocument();
      expect(screen.getByText('$18.50')).toBeInTheDocument();

      const completeBtn = screen.getByRole('button', { name: /Complete Ride/i });
      fireEvent.click(completeBtn);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/rides/ride777/complete'),
          {},
          expect.any(Object)
        );
        expect(screen.getByTestId('success-splash')).toBeInTheDocument();
      });
    });
  });

  describe('FinishRideSummary Component', () => {
    it('should display finished details and support accordion toggling', async () => {
      const mockCompleted = {
        _id: 'ride777',
        pickup_address: 'Point A',
        destination_address: 'Point B',
        status: 'completed',
        fare: { base_fare: 5.0, distance_fare: 10.0, time_fare: 3.0, taxes_fees: 0.5, total: 18.50 },
        rider: { first_name: 'Alex' }
      };
      sessionStorage.setItem('completedRide', JSON.stringify(mockCompleted));

      render(
        <BrowserRouter>
          <FinishRideSummary />
        </BrowserRouter>
      );

      expect(await screen.findByText('You\'ve Arrived')).toBeInTheDocument();
      expect(screen.getByTestId('completed-fare')).toHaveTextContent('$18.50');

      // Accordion closed initially
      expect(screen.queryByTestId('fare-breakdown-details')).not.toBeInTheDocument();

      // Click Fare Breakdown to open
      const toggleBtn = screen.getByRole('button', { name: /Fare Breakdown/i });
      fireEvent.click(toggleBtn);

      // Verify accordion is visible
      expect(screen.getByTestId('fare-breakdown-details')).toBeInTheDocument();
      expect(screen.getByText('$10.00')).toBeInTheDocument(); // distance fare

      // Click Finish Ride button
      const finishBtn = screen.getByRole('button', { name: /Finish Ride/i });
      fireEvent.click(finishBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/captain-home');
    });
  });
});
