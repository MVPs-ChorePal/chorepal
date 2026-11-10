// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Dashboard from '../../app/(child)/(tabs)/home';
import { __setTableResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockPush, __mockReplace } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

function setUpChild(chores) {
  __setTableResponse('users', { data: { display_name: 'Testy Kid' }, error: null });
  __setTableResponse('chores', { data: chores, error: null });
}

describe('Dashboard (child home)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  it('greets the child by first name', async () => {
    setUpChild([]);
    const { findByText } = await render(<Dashboard />);

    expect(await findByText('Hi, Testy!')).toBeTruthy();
  });

  it('shows "All done!" when there are no chores', async () => {
    setUpChild([]);
    const { findByText } = await render(<Dashboard />);

    expect(await findByText('All done!')).toBeTruthy();
    expect(await findByText('No chores yet')).toBeTruthy();
  });

  it('lists assigned chores and tapping one navigates to its detail screen', async () => {
    setUpChild([{ id: 'chore-1', title: 'Make bed', reward_amount: 25, status: 'todo' }]);
    const { findByText } = await render(<Dashboard />);

    const card = await findByText('Make bed');
    await fireEvent.press(card);

    await waitFor(() => {
      expect(__mockPush).toHaveBeenCalledWith('/chores/chore-1');
    });
  });

  it('redirects to login when there is no session', async () => {
    __setTableResponse('users', { data: null, error: null });
    const { supabase } = require('../../utils/supabase');
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    await render(<Dashboard />);

    await waitFor(() => {
      expect(__mockReplace).toHaveBeenCalledWith('/login-page');
    });
  });
});
