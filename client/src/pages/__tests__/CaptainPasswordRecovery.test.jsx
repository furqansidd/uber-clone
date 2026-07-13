import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import CaptainForgotPassword from '../CaptainForgotPassword';
import CaptainResetPassword from '../CaptainResetPassword';

// Mock axios
vi.mock('axios');

// Mock useNavigate and useSearchParams
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams('');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams]
  };
});

describe('Captain Password Recovery Flows (State A & B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('');
  });

  describe('CaptainForgotPassword Component', () => {
    it('should submit forgot-password request successfully', async () => {
      axios.post.mockResolvedValueOnce({
        data: { message: 'Reset email sent.' }
      });

      render(
        <BrowserRouter>
          <CaptainForgotPassword />
        </BrowserRouter>
      );

      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'captain@forgot.com' } });

      fireEvent.click(screen.getByRole('button', { name: /Request Reset/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/captain/forgot-password'),
          { email: 'captain@forgot.com' }
        );
        expect(screen.getByRole('status')).toHaveTextContent('Reset email sent.');
      });
    });
  });

  describe('CaptainResetPassword Component', () => {
    it('should submit reset-password request successfully when passwords match', async () => {
      mockSearchParams = new URLSearchParams('token=reset-token-123');
      axios.post.mockResolvedValueOnce({
        data: { message: 'Password has been reset.' }
      });

      render(
        <BrowserRouter>
          <CaptainResetPassword />
        </BrowserRouter>
      );

      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpassword123' } });
      fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'newpassword123' } });

      fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/captain/reset-password'),
          {
            token: 'reset-token-123',
            new_password: 'newpassword123'
          }
        );
        expect(screen.getByRole('status')).toHaveTextContent('Password has been reset.');
      });
    });

    it('should show error when passwords do not match', async () => {
      mockSearchParams = new URLSearchParams('token=reset-token-123');

      render(
        <BrowserRouter>
          <CaptainResetPassword />
        </BrowserRouter>
      );

      fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpassword123' } });
      fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'different' } });

      fireEvent.click(screen.getByRole('button', { name: /Reset Password/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.');
      });
    });
  });
});
