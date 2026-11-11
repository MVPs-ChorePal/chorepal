// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import JoinHousehold from '../../app/join-household';
import { supabase, __setTableResponse, __setRpcResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockReplace } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

function setUpRole(role) {
  __setTableResponse('users', { data: { role }, error: null });
}

describe('JoinHousehold', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  it('renders the join prompt', async () => {
    setUpRole('parent');
    const { findByText } = await render(<JoinHousehold />);
    expect(await findByText('Join your household')).toBeTruthy();
  });

  it('does not look up a code shorter than 7 characters', async () => {
    setUpRole('parent');
    const { findByText, getByTestId } = await render(<JoinHousehold />);

    await fireEvent.changeText(getByTestId('code-boxes-input'), 'ABC12');
    await fireEvent.press(await findByText('Join my household'));

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('an invalid code does not link the account', async () => {
    setUpRole('parent');
    __setRpcResponse('find_family_by_code', { data: null, error: null });
    const { findByText, getByTestId } = await render(<JoinHousehold />);

    await fireEvent.changeText(getByTestId('code-boxes-input'), 'ABC1234');
    await fireEvent.press(await findByText('Join my household'));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('find_family_by_code', { p_code: 'ABC1234' });
    });
    expect(__mockReplace).not.toHaveBeenCalled();
  });

  it('a valid code links a parent account and routes to the parent home', async () => {
    setUpRole('parent');
    __setRpcResponse('find_family_by_code', { data: 'family-1', error: null });
    const updateCalls = [];
    __setTableResponse('users', (calls) => {
      const updateCall = calls.find((c) => c.method === 'update');
      if (updateCall) updateCalls.push(updateCall.args[0]);
      return { data: { role: 'parent' }, error: null };
    });
    const { findByText, getByTestId } = await render(<JoinHousehold />);

    await fireEvent.changeText(getByTestId('code-boxes-input'), 'ABC1234');
    await fireEvent.press(await findByText('Join my household'));

    await waitFor(() => {
      expect(updateCalls).toContainEqual({ family_id: 'family-1' });
      expect(__mockReplace).toHaveBeenCalledWith('/(parent)/(tabs)/home');
    });
    // only a child's account email needs relinking
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('a valid code for a child also relinks their recovery email and routes to the child home', async () => {
    setUpRole('child');
    __setRpcResponse('find_family_by_code', { data: 'family-1', error: null });
    const { findByText, getByTestId } = await render(<JoinHousehold />);

    await fireEvent.changeText(getByTestId('code-boxes-input'), 'ABC1234');
    await fireEvent.press(await findByText('Join my household'));

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('link-child-email');
      expect(__mockReplace).toHaveBeenCalledWith('/(child)/(tabs)/home');
    });
  });
});
