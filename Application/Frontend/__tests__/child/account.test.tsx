// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChildAccount from '../../app/(child)/(tabs)/account';
import { __resetMockSupabase, __setTableResponse } from '../../utils/supabase';
import { __mockReplace, __mockDismissAll, __mockPush } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

describe('ChildAccount (child account tab)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  it('renders without crashing', async () => {
    const { findByText } = await render(<ChildAccount />);
    expect(await findByText('Account')).toBeTruthy();
  });

  it('change password opens the reset flow in child mode with their username filled in', async () => {
    __setTableResponse('users', { data: { username: 'testykid' }, error: null });
    const { findByText } = await render(<ChildAccount />);

    await fireEvent.press(await findByText('Change password'));

    await waitFor(() => {
      expect(__mockPush).toHaveBeenCalledWith({
        pathname: '/forgot-password',
        params: { role: 'child', username: 'testykid' },
      });
    });
  });

  it('tapping logout dismisses any stacked screens and returns to the login page', async () => {
    const { findByText } = await render(<ChildAccount />);

    await fireEvent.press(await findByText('Log out'));

    await waitFor(() => {
      expect(__mockDismissAll).toHaveBeenCalled();
      expect(__mockReplace).toHaveBeenCalledWith('/login-page');
    });
  });
});
