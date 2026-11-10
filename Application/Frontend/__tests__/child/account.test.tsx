// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChildAccount from '../../app/(child)/(tabs)/account';
import { __resetMockSupabase } from '../../utils/supabase';
import { __mockReplace } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

describe('ChildAccount (child account tab)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  it('renders without crashing', async () => {
    const { findByText } = await render(<ChildAccount />);
    expect(await findByText('Account')).toBeTruthy();
  });

  it('tapping logout signs out and returns to the login page', async () => {
    const { findByText } = await render(<ChildAccount />);

    await fireEvent.press(await findByText('logout'));

    await waitFor(() => {
      expect(__mockReplace).toHaveBeenCalledWith('/login-page');
    });
  });
});
