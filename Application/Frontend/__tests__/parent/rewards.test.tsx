// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ParentRewards from '../../app/(parent)/(tabs)/rewards';
import { __setTableResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockPush } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

function setUpHousehold({ members = [{ id: 'parent-1' }], rewards = [] } = {}) {
  __setTableResponse('users', (calls) => {
    const isProfileLookup = calls.some((c) => c.method === 'eq' && c.args[0] === 'id');
    if (isProfileLookup) return { data: { family_id: 'family-1' }, error: null };
    return { data: members, error: null };
  });
  __setTableResponse('rewards', { data: rewards, error: null });
}

describe('ParentRewards (parent rewards tab)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  // There's no "reward request" table yet - the component seeds this list
  // locally (see rewards.tsx) rather than fetching it, so it's always
  // present on first render regardless of what Supabase returns.
  it('shows the seeded reward request', async () => {
    setUpHousehold();
    const { findByText } = await render(<ParentRewards />);

    expect(await findByText('Mia wants')).toBeTruthy();
    expect(await findByText('Extra screen time')).toBeTruthy();
  });

  it('accepting a request removes it from the list', async () => {
    jest.useFakeTimers();
    setUpHousehold();
    const { findByText, queryByText } = await render(<ParentRewards />);

    await fireEvent.press(await findByText('Say yes'));
    await act(async () => { jest.runAllTimers(); });

    expect(queryByText('Mia wants')).toBeNull();
    jest.useRealTimers();
  });

  it('lists rewards fetched from the household reward shop', async () => {
    setUpHousehold({ rewards: [{ id: 'r1', title: 'Movie Night', point_cost: 30, category: 'fun' }] });
    const { findByText } = await render(<ParentRewards />);

    expect(await findByText('Movie Night')).toBeTruthy();
    expect(await findByText('30')).toBeTruthy();
  });

  it('shows the empty-shop message when there are no rewards', async () => {
    setUpHousehold({ rewards: [] });
    const { findByText } = await render(<ParentRewards />);

    expect(await findByText('No rewards yet. Add one below!')).toBeTruthy();
  });

  it("tapping a reward's Edit pill navigates to create-reward with its details", async () => {
    setUpHousehold({ rewards: [{ id: 'r1', title: 'Movie Night', point_cost: 30, category: 'fun' }] });
    const { findByText } = await render(<ParentRewards />);

    await fireEvent.press(await findByText('Edit'));

    expect(__mockPush).toHaveBeenCalledWith({
      pathname: '/(parent)/rewards/create-reward',
      params: { id: 'r1', title: 'Movie Night', cost: '30', category: 'fun' },
    });
  });

  it('tapping "+ Add a reward" navigates to create-reward', async () => {
    setUpHousehold();
    const { findByText } = await render(<ParentRewards />);

    await fireEvent.press(await findByText('+ Add a reward'));

    expect(__mockPush).toHaveBeenCalledWith('/(parent)/rewards/create-reward');
  });
});
