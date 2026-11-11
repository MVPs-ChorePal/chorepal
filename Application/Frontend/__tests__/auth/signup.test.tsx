// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SignupPage from '../../app/signup-page';
import { supabase, __setTableResponse, __setRpcResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockReplace } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

async function fillCommonFields({ getByPlaceholderText }, { name = 'Testy Kid', username = 'testykid', password = 'password123' } = {}) {
  await fireEvent.changeText(getByPlaceholderText('e.g. John Doe'), name);
  await fireEvent.changeText(getByPlaceholderText('e.g. johndoe'), username);
  await fireEvent.changeText(getByPlaceholderText('********'), password);
}

describe('SignupPage', () => {
  beforeEach(() => {
    __resetMockSupabase();
    __setRpcResponse('is_username_taken', { data: false, error: null });
  });

  it('shows the username-unique hint', async () => {
    const { findByText } = await render(<SignupPage />);
    expect(await findByText('must be unique')).toBeTruthy();
  });

  it('switching to "I\'m a child" hides the email field and changes the hint', async () => {
    const { findByText, getByPlaceholderText, queryByPlaceholderText } = await render(<SignupPage />);

    await fireEvent.press(await findByText("I'm a child"));

    expect(queryByPlaceholderText('you@email.com')).toBeNull();
    expect(await findByText("must be unique - this is what you'll log in with")).toBeTruthy();
  });

  it('parent signup creates a household and routes to the parent home', async () => {
    jest.useFakeTimers();
    const insertCalls = [];
    __setTableResponse('families', { data: null, error: null });
    __setTableResponse('users', (calls) => {
      const insertCall = calls.find((c) => c.method === 'insert');
      if (insertCall) insertCalls.push(insertCall.args[0]);
      return { data: null, error: null };
    });
    const screen = await render(<SignupPage />);
    await fillCommonFields(screen);
    await fireEvent.changeText(screen.getByPlaceholderText('you@email.com'), 'parent@example.com');

    await fireEvent.press(await screen.findByText('Create family account'));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('is_username_taken', { p_username: 'testykid' });
      expect(insertCalls[0]).toMatchObject([
        expect.objectContaining({ username: 'testykid', role: 'parent', email: 'parent@example.com' }),
      ]);
    });

    await act(async () => { jest.runAllTimers(); });
    expect(__mockReplace).toHaveBeenCalledWith('/(parent)/(tabs)/home');
    jest.useRealTimers();
  });

  it('child signup synthesizes an internal email and routes to join-household', async () => {
    jest.useFakeTimers();
    const insertCalls = [];
    __setTableResponse('users', (calls) => {
      const insertCall = calls.find((c) => c.method === 'insert');
      if (insertCall) insertCalls.push(insertCall.args[0]);
      return { data: null, error: null };
    });
    const screen = await render(<SignupPage />);
    await fireEvent.press(await screen.findByText("I'm a child"));
    await fillCommonFields(screen);

    await fireEvent.press(await screen.findByText('Sign up'));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'testykid@chorepal.internal',
        password: 'password123',
      });
      expect(insertCalls[0]).toMatchObject([
        expect.objectContaining({ username: 'testykid', role: 'child', family_id: null }),
      ]);
    });

    await act(async () => { jest.runAllTimers(); });
    expect(__mockReplace).toHaveBeenCalledWith('/join-household');
    jest.useRealTimers();
  });

  it('normalizes the username to lowercase with no spaces', async () => {
    jest.useFakeTimers();
    __setTableResponse('families', { data: null, error: null });
    const insertCalls = [];
    __setTableResponse('users', (calls) => {
      const insertCall = calls.find((c) => c.method === 'insert');
      if (insertCall) insertCalls.push(insertCall.args[0]);
      return { data: null, error: null };
    });
    const screen = await render(<SignupPage />);
    await fillCommonFields(screen, { username: ' Testy Kid ' });
    await fireEvent.changeText(screen.getByPlaceholderText('you@email.com'), 'parent@example.com');

    await fireEvent.press(await screen.findByText('Create family account'));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('is_username_taken', { p_username: 'testykid' });
    });

    await act(async () => { jest.runAllTimers(); });
    jest.useRealTimers();
  });

  it('shows an error and does not sign up when the username is already taken', async () => {
    __setRpcResponse('is_username_taken', { data: true, error: null });
    const screen = await render(<SignupPage />);
    await fillCommonFields(screen);
    await fireEvent.changeText(screen.getByPlaceholderText('you@email.com'), 'parent@example.com');

    await fireEvent.press(await screen.findByText('Create family account'));

    expect(await screen.findByText('that username is already taken')).toBeTruthy();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('shows a friendly error on a unique_violation race during insert', async () => {
    __setTableResponse('families', { data: null, error: null });
    __setTableResponse('users', { data: null, error: { code: '23505', message: 'duplicate key value' } });
    const screen = await render(<SignupPage />);
    await fillCommonFields(screen);
    await fireEvent.changeText(screen.getByPlaceholderText('you@email.com'), 'parent@example.com');

    await fireEvent.press(await screen.findByText('Create family account'));

    expect(await screen.findByText('that username is already taken')).toBeTruthy();
  });

  it('tapping "Already have an account? Login" replaces to login-page', async () => {
    const { findByText } = await render(<SignupPage />);

    await fireEvent.press(await findByText('Already have an account? Login'));

    expect(__mockReplace).toHaveBeenCalledWith('/login-page');
  });
});
