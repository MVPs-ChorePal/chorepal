// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ForgotPassword from '../../app/forgot-password';
import { supabase, __setTableResponse, __setRpcResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockReplace, useLocalSearchParams } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

describe('ForgotPassword', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  it('defaults to the parent role and an email field', async () => {
    const { findByPlaceholderText } = await render(<ForgotPassword />);
    expect(await findByPlaceholderText('you@email.com')).toBeTruthy();
  });

  it('preselects the child role when passed via params', async () => {
    useLocalSearchParams.mockReturnValue({ role: 'child' });
    const { findByPlaceholderText } = await render(<ForgotPassword />);
    expect(await findByPlaceholderText('username')).toBeTruthy();
  });

  it('parent: requesting a code calls resetPasswordForEmail and advances to step 2', async () => {
    const { findByPlaceholderText, findByText } = await render(<ForgotPassword />);

    await fireEvent.changeText(await findByPlaceholderText('you@email.com'), 'parent@example.com');
    await fireEvent.press(await findByText('Send reset code'));

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('parent@example.com');
    });
    expect(await findByText('Enter the code sent to parent@example.com and choose a new password.')).toBeTruthy();
  });

  it("child: asks the server to email the code to their grown-up - no email is looked up", async () => {
    useLocalSearchParams.mockReturnValue({ role: 'child' });
    const { findByPlaceholderText, findByText } = await render(<ForgotPassword />);

    await fireEvent.changeText(await findByPlaceholderText('username'), ' TestyKid ');
    await fireEvent.press(await findByText('Send reset code'));

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('child-reset-code', { body: { username: 'testykid' } });
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(await findByText('If that username is in a household, we emailed a code to your grown-up. Enter it and choose a new password.')).toBeTruthy();
  });

  it("child: the code is checked against the child's own login address", async () => {
    useLocalSearchParams.mockReturnValue({ role: 'child' });
    __setTableResponse('users', { data: { role: 'child', family_id: 'family-1' }, error: null });
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid credentials' } });
    const screen = await render(<ForgotPassword />);

    await fireEvent.changeText(await screen.findByPlaceholderText('username'), 'testykid');
    await fireEvent.press(await screen.findByText('Send reset code'));
    await screen.findByText('Reset code');
    await fireEvent.changeText(await screen.findByPlaceholderText('123456'), '654321');
    await fireEvent.changeText(await screen.findByPlaceholderText('new password'), 'newpassword123');
    await fireEvent.press(await screen.findByText('Reset password'));

    await waitFor(() => {
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ email: 'testykid@chorepal.internal', token: '654321', type: 'recovery' });
      expect(__mockReplace).toHaveBeenCalledWith('/(child)/(tabs)/home');
    });
  });

  it('shows an error for a username that could never exist, without calling the server', async () => {
    useLocalSearchParams.mockReturnValue({ role: 'child' });
    const { findByPlaceholderText, findByText } = await render(<ForgotPassword />);

    await fireEvent.changeText(await findByPlaceholderText('username'), 'a@b');
    await fireEvent.press(await findByText('Send reset code'));

    expect(await findByText('could not find that username')).toBeTruthy();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  async function advanceToConfirmStep({ findByPlaceholderText, findByText }) {
    await fireEvent.changeText(await findByPlaceholderText('you@email.com'), 'parent@example.com');
    await fireEvent.press(await findByText('Send reset code'));
    await findByText('Reset code'); // the step-2 Input's label - waits for the step transition
  }

  it('entering a code and new password verifies, updates, and routes in', async () => {
    __setTableResponse('users', { data: { role: 'parent', family_id: 'family-1' }, error: null });
    // the "new password must differ from current" check works by trying to
    // sign in with it - a rejection here means it's genuinely different
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'invalid credentials' },
    });
    const screen = await render(<ForgotPassword />);
    await advanceToConfirmStep(screen);

    await fireEvent.changeText(await screen.findByPlaceholderText('123456'), '123456');
    await fireEvent.changeText(await screen.findByPlaceholderText('new password'), 'newpassword123');
    await fireEvent.press(await screen.findByText('Reset password'));

    await waitFor(() => {
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'parent@example.com',
        token: '123456',
        type: 'recovery',
      });
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
      expect(__mockReplace).toHaveBeenCalledWith('/(parent)/(tabs)/home');
    });
  });

  it('rejects a new password that matches the current one', async () => {
    // signInWithPassword succeeding with the "new" password means it's unchanged
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: { id: 'test-user-id' } }, error: null });
    const screen = await render(<ForgotPassword />);
    await advanceToConfirmStep(screen);

    await fireEvent.changeText(await screen.findByPlaceholderText('123456'), '123456');
    await fireEvent.changeText(await screen.findByPlaceholderText('new password'), 'sameoldpassword');
    await fireEvent.press(await screen.findByText('Reset password'));

    expect(await screen.findByText('new password must be different from your current password')).toBeTruthy();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('shows an error for an invalid or expired code', async () => {
    supabase.auth.verifyOtp.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid token' } });
    const screen = await render(<ForgotPassword />);
    await advanceToConfirmStep(screen);

    await fireEvent.changeText(await screen.findByPlaceholderText('123456'), '000000');
    await fireEvent.changeText(await screen.findByPlaceholderText('new password'), 'newpassword123');
    await fireEvent.press(await screen.findByText('Reset password'));

    expect(await screen.findByText('that code is invalid or expired')).toBeTruthy();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('"Try again" goes back to step 1', async () => {
    const screen = await render(<ForgotPassword />);
    await advanceToConfirmStep(screen);
    await screen.findByText('Reset password');

    await fireEvent.press(await screen.findByText("Didn't get a code? Try again"));

    expect(await screen.findByPlaceholderText('you@email.com')).toBeTruthy();
  });

  it('"Back to Login" replaces to login-page', async () => {
    const { findByText } = await render(<ForgotPassword />);

    await fireEvent.press(await findByText('Back to Login'));

    expect(__mockReplace).toHaveBeenCalledWith('/login-page');
  });
});
