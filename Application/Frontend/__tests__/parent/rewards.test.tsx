// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ParentRewards from '../../app/(parent)/(tabs)/rewards';
import { __setTableResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockPush } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

const KID_ID = 'child-1';

function setUpHousehold({ kids = [{ id: KID_ID, display_name: 'Testy Kid' }], rewards = [], transactions = [] } = {}) {
  __setTableResponse('users', (calls) => {
    const isProfileLookup = calls.some((c) => c.method === 'eq' && c.args[0] === 'id');
    if (isProfileLookup) return { data: { family_id: 'family-1' }, error: null };
    const isKidsLookup = calls.some((c) => c.method === 'eq' && c.args[0] === 'role' && c.args[1] === 'child');
    if (isKidsLookup) return { data: kids, error: null };
    return { data: [{ id: 'parent-1' }], error: null }; // parents in household
  });
  __setTableResponse('rewards', { data: rewards, error: null });
  __setTableResponse('transactions', { data: transactions, error: null });
  __setTableResponse('chores', { data: [], error: null });
}

describe('ParentRewards (parent rewards tab)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  // redeem_reward debits points immediately (no parent approval step), so
  // this is a real read-only log of what already happened, not a request
  // a parent needs to act on.
  it('shows recent activity fetched from the household', async () => {
    setUpHousehold({
      transactions: [
        { id: 't1', user_id: KID_ID, amount: 50, type: 'debit', reward_id: 'r1', created_at: '2026-01-01T00:00:00Z' },
      ],
    });
    __setTableResponse('rewards', (calls) => {
      // fetchData queries rewards twice for different reasons: the reward
      // shop (filtered by created_by) and this activity row's reward name
      // lookup (filtered by id) - distinguish by which filter was used.
      const isNameLookup = calls.some((c) => c.method === 'in' && c.args[0] === 'id');
      if (isNameLookup) return { data: [{ id: 'r1', title: 'Extra screen time' }], error: null };
      return { data: [{ id: 'r1', title: 'Extra screen time', point_cost: 50, category: 'fun' }], error: null };
    });
    const { findByText } = await render(<ParentRewards />);

    expect(await findByText('Testy · extra screen time')).toBeTruthy();
    expect(await findByText('-50')).toBeTruthy();
  });

  it('shows the empty-activity message when there are no transactions', async () => {
    setUpHousehold();
    const { findByText } = await render(<ParentRewards />);

    expect(await findByText("Nothing yet - chore payouts and reward redemptions show up here")).toBeTruthy();
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
