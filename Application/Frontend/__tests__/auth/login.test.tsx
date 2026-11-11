// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginPage from '../../app/login-page';
import { supabase, __setTableResponse, __setRpcResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockReplace } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

describe('LoginPage', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  it('shows an email field for the default (parent) role', async () => {
    const { findByText, getByPlaceholderText } = await render(<LoginPage />);

    expect(await findByText('Welcome Back!')).toBeTruthy();
    expect(getByPlaceholderText('you@email.com')).toBeTruthy();
  });

  it('switching to "I\'m a child" shows a username field instead of email', async () => {
    const { findByText, getByPlaceholderText, queryByPlaceholderText } = await render(<LoginPage />);

    await fireEvent.press(await findByText("I'm a child"));

    expect(getByPlaceholderText('username')).toBeTruthy();
    expect(queryByPlaceholderText('you@email.com')).toBeNull();
  });

  it('parent login with no household routes to join-household', async () => {
    __setTableResponse('users', { data: { role: 'parent', family_id: null }, error: null });
    const { findByPlaceholderText, findByText } = await render(<LoginPage />);

    await fireEvent.changeText(await findByPlaceholderText('you@email.com'), 'parent@example.com');
    await fireEvent.changeText(await findByPlaceholderText('password'), 'password123');
    await fireEvent.press(await findByText('login'));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'parent@example.com',
        password: 'password123',
      });
      expect(__mockReplace).toHaveBeenCalledWith('/join-household');
    });
  });

  it('parent login with a household routes to the parent home', async () => {
    __setTableResponse('users', { data: { role: 'parent', family_id: 'family-1' }, error: null });
    const { findByPlaceholderText, findByText } = await render(<LoginPage />);

    await fireEvent.changeText(await findByPlaceholderText('you@email.com'), 'parent@example.com');
    await fireEvent.changeText(await findByPlaceholderText('password'), 'password123');
    await fireEvent.press(await findByText('login'));

    await waitFor(() => {
      expect(__mockReplace).toHaveBeenCalledWith('/(parent)/(tabs)/home');
    });
  });

  it('child login with a household routes to the child home', async () => {
    __setTableResponse('users', { data: { role: 'child', family_id: 'family-1' }, error: null });
    __setRpcResponse('find_email_by_username', { data: 'testykid@chorepal.internal', error: null });
    const { findByText, findByPlaceholderText } = await render(<LoginPage />);

    await fireEvent.press(await findByText("I'm a child"));
    await fireEvent.changeText(await findByPlaceholderText('username'), 'testykid');
    await fireEvent.changeText(await findByPlaceholderText('password'), 'password123');
    await fireEvent.press(await findByText('login'));

    await waitFor(() => {
      expect(__mockReplace).toHaveBeenCalledWith('/(child)/(tabs)/home');
    });
  });

  it('shows an inline error when parent credentials are rejected', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });
    const { findByPlaceholderText, findByText } = await render(<LoginPage />);

    await fireEvent.changeText(await findByPlaceholderText('you@email.com'), 'parent@example.com');
    await fireEvent.changeText(await findByPlaceholderText('password'), 'wrongpassword');
    await fireEvent.press(await findByText('login'));

    expect(await findByText('invalid login credentials')).toBeTruthy();
    expect(__mockReplace).not.toHaveBeenCalled();
  });

  it('shows a generic error when the child username cannot be resolved', async () => {
    const { findByText, findByPlaceholderText } = await render(<LoginPage />);

    await fireEvent.press(await findByText("I'm a child"));
    await fireEvent.changeText(await findByPlaceholderText('username'), 'nobody');
    await fireEvent.changeText(await findByPlaceholderText('password'), 'password123');
    await fireEvent.press(await findByText('login'));

    expect(await findByText('invalid username or password')).toBeTruthy();
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('tapping "Forgot password?" replaces to forgot-password with the current role', async () => {
    const { findByText } = await render(<LoginPage />);

    await fireEvent.press(await findByText('Forgot password?'));

    expect(__mockReplace).toHaveBeenCalledWith({ pathname: '/forgot-password', params: { role: 'parent' } });
  });

  it('tapping "New here? Sign up" replaces to signup-page', async () => {
    const { findByText } = await render(<LoginPage />);

    // "New here? " and "Sign up" are separate Text children of the same
    // parent Text - findByText matches on the full concatenated content.
    await fireEvent.press(await findByText('New here? Sign up'));

    expect(__mockReplace).toHaveBeenCalledWith('/signup-page');
  });
});
