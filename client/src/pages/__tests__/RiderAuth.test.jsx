import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from '../../context/AuthContext';
import RiderSignup from '../RiderSignup';
import RiderLogin from '../RiderLogin';

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

describe('Rider Auth Screens (Screens 1 & 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RiderSignup Component', () => {
    it('should render signup fields and handle registration success', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          token: 'rider-test-token',
          user: { _id: 'rider123', first_name: 'John', last_name: 'Doe' }
        }
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <RiderSignup />
          </AuthProvider>
        </BrowserRouter>
      );

      // Verify rendering
      expect(screen.getByLabelText('First name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();

      // Fill in fields
      fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      // Click Create account
      fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/signup'),
          {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            password: 'password123'
          }
        );
        expect(mockNavigate).toHaveBeenCalledWith('/rider-home');
      });
    });

    it('should show error when backend registration fails', async () => {
      axios.post.mockRejectedValueOnce({
        response: { data: { error: 'Email already exists.' } }
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <RiderSignup />
          </AuthProvider>
        </BrowserRouter>
      );

      fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Email already exists.');
      });
    });
  });

  describe('RiderLogin Component', () => {
    it('should render login fields and handle login success', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          token: 'rider-test-token',
          user: { _id: 'rider123', email: 'john@example.com' }
        }
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <RiderLogin />
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      fireEvent.click(screen.getByRole('button', { name: /Login/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/login'),
          {
            email: 'john@example.com',
            password: 'password123'
          }
        );
        expect(mockNavigate).toHaveBeenCalledWith('/rider-home');
      });
    });

    it('should show error when login fails', async () => {
      axios.post.mockRejectedValueOnce({
        response: { data: { error: 'Invalid credentials.' } }
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <RiderLogin />
          </AuthProvider>
        </BrowserRouter>
      );

      fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } });

      fireEvent.click(screen.getByRole('button', { name: /Login/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials.');
      });
    });
  });
});
