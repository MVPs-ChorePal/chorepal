// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import JoinHousehold from '../../app/join-household';
import { supabase, __setRpcResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockReplace } from '../../__mocks__/expo-router';
import { showAlert } from '../../utils/alert';

jest.mock('../../utils/supabase');
jest.mock('../../utils/alert', () => ({ showAlert: jest.fn() }));

describe('JoinHousehold', () => {
  beforeEach(() => {
    __resetMockSupabase();
    showAlert.mockClear();
  });

  it('renders the join prompt', async () => {
    const { findByText } = await render(<JoinHousehold />);
    expect(await findByText('Join your household')).toBeTruthy();
  });

  it('does not look up a code shorter than 7 characters', async () => {
    const { findByText, getByTestId } = await render(<JoinHousehold />);

    await fireEvent.changeText(getByTestId('code-boxes-input'), 'ABC12');
    await fireEvent.press(await findByText('Join my household'));

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('an invalid code does not link the account', async () => {
    __setRpcResponse('join_household', { data: null, error: { message: 'invalid household code' } });
    const { findByText, getByTestId } = await render(<JoinHousehold />);

    await fireEvent.changeText(getByTestId('code-boxes-input'), 'ABC1234');
    await fireEvent.press(await findByText('Join my household'));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('join_household', { p_code: 'ABC1234' });
      expect(showAlert).toHaveBeenCalledWith('error', 'invalid code. check with your parent.');
    });
    expect(__mockReplace).not.toHaveBeenCalled();
  });

  it('a valid code links a child and routes to the child home', async () => {
    __setRpcResponse('join_household', { data: 'family-1', error: null });
    const { findByText, getByTestId } = await render(<JoinHousehold />);

    await fireEvent.changeText(getByTestId('code-boxes-input'), 'ABC1234');
    await fireEvent.press(await findByText('Join my household'));

    await waitFor(() => {
      //the server does the linking - the app never writes family_id itself
      expect(supabase.rpc).toHaveBeenCalledWith('join_household', { p_code: 'ABC1234' });
      expect(__mockReplace).toHaveBeenCalledWith('/(child)/(tabs)/home');
    });
    //no email relinking any more - a child's login address never changes
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('a grown-up is told households have one parent, and is not moved', async () => {
    __setRpcResponse('join_household', { data: null, error: { message: 'only children can join a household' } });
    const { findByText, getByTestId } = await render(<JoinHousehold />);

    await fireEvent.changeText(getByTestId('code-boxes-input'), 'ABC1234');
    await fireEvent.press(await findByText('Join my household'));

    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('error', 'only kids join a household with a code. grown-ups start their own when they sign up.');
    });
    expect(__mockReplace).not.toHaveBeenCalled();
  });

  it('a user already in a household is not moved', async () => {
    __setRpcResponse('join_household', { data: null, error: { message: 'already in a household' } });
    const { findByText, getByTestId } = await render(<JoinHousehold />);

    await fireEvent.changeText(getByTestId('code-boxes-input'), 'ABC1234');
    await fireEvent.press(await findByText('Join my household'));

    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('error', "you're already in a household");
    });
    expect(__mockReplace).not.toHaveBeenCalled();
  });
});
