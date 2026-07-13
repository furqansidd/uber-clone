import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from '../../context/AuthContext';
import CaptainSignup from '../CaptainSignup';
import CaptainLogin from '../CaptainLogin';

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

describe('Captain Auth Screens (Screens 3 & 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CaptainSignup Component', () => {
    it('should render signup fields and handle registration success', async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });

      render(
        <BrowserRouter>
          <CaptainSignup />
        </BrowserRouter>
      );

      // Verify rendering
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Plate Number/i)).toBeInTheDocument();

      // Fill fields
      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Captain Jack' } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '123456789' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'jack@captain.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
      fireEvent.change(screen.getByLabelText(/Plate Number/i), { target: { value: 'CAP-777' } });
      
      // select capacity
      const capacitySelect = screen.getByLabelText(/Capacity/i);
      fireEvent.change(capacitySelect, { target: { value: '4 people' } });

      // select color
      const colorInput = screen.getByLabelText(/Vehicle Color/i);
      fireEvent.change(colorInput, { target: { value: 'Silver' } });

      // Accept terms
      const termsCheckbox = screen.getByLabelText(/I agree to DriveNow's Captain Terms/i);
      fireEvent.click(termsCheckbox);

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Submit Registration/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/captain/signup'),
          expect.objectContaining({
            full_name: 'Captain Jack',
            phone_number: '123456789',
            email: 'jack@captain.com',
            password: 'password123',
            vehicle_type: 'bike',
            plate_number: 'CAP-777',
            capacity: 4,
            vehicle_color: 'Silver',
            terms_accepted: true
          })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/captain/login');
      });
    });
  });

  describe('CaptainLogin Component', () => {
    it('should render login fields and handle login success', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          token: 'captain-test-token',
          captain: { _id: 'captain123', full_name: 'Captain Jack' }
        }
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <CaptainLogin />
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'jack@captain.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/captain/login'),
          {
            email: 'jack@captain.com',
            password: 'password123'
          }
        );
        expect(mockNavigate).toHaveBeenCalledWith('/captain-home');
      });
    });
  });
});
