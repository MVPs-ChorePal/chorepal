// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ParentAccount from '../../app/(parent)/(tabs)/account';
import { __setTableResponse, __setRpcResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockReplace, __mockDismissAll } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

function setUpAccount({ kids = [] } = {}) {
  __setTableResponse('users', (calls) => {
    const isProfileLookup = calls.some((c) => c.method === 'eq' && c.args[0] === 'id');
    if (isProfileLookup) return { data: { family_id: 'family-1' }, error: null };
    return { data: kids, error: null };
  });
}

describe('ParentAccount (parent account tab)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  // The household code card renders one letter per Text node (not the whole
  // code as a single string), so each letter is asserted individually.
  it('shows the household code once loaded', async () => {
    setUpAccount();
    __setRpcResponse('get_household_code', { data: 'ABC1234', error: null });
    const { findByText } = await render(<ParentAccount />);

    for (const letter of 'ABC1234') {
      expect(await findByText(letter)).toBeTruthy();
    }
  });

  it("lists each kid with their point balance", async () => {
    setUpAccount({ kids: [{ id: 'child-1', display_name: 'Testy Kid', current_balance: 250 }] });
    __setRpcResponse('get_household_code', { data: 'ABC1234', error: null });
    const { findByText } = await render(<ParentAccount />);

    expect(await findByText('Testy')).toBeTruthy();
    expect(await findByText('250')).toBeTruthy();
  });

  it('tapping logout dismisses any stacked screens and returns to the login page', async () => {
    setUpAccount();
    __setRpcResponse('get_household_code', { data: 'ABC1234', error: null });
    const { findByText } = await render(<ParentAccount />);

    await fireEvent.press(await findByText('Log out'));

    await waitFor(() => {
      // dismissAll first - otherwise anything pushed underneath this tab
      // (e.g. a chore review reached from the chores list) stays frozen in
      // this group's own nested stack and can resurface stale after a
      // fresh login, instead of a clean one.
      expect(__mockDismissAll).toHaveBeenCalled();
      expect(__mockReplace).toHaveBeenCalledWith('/login-page');
    });
  });
});
