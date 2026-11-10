// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChildRewards from '../../app/(child)/(tabs)/rewards';
import { __setTableResponse, __setRpcResponse, __resetMockSupabase } from '../../utils/supabase';

jest.mock('../../utils/supabase');

function setUpChild({ balance, rewards = [], transactions = [] }) {
  __setTableResponse('users', (calls) => {
    const isProfileLookup = calls.some((c) => c.method === 'eq' && c.args[0] === 'id');
    if (isProfileLookup) return { data: { family_id: 'family-1', current_balance: balance }, error: null };
    return { data: [{ id: 'parent-1' }], error: null }; // parents in household
  });
  __setTableResponse('rewards', { data: rewards, error: null });
  __setTableResponse('transactions', { data: transactions, error: null });
  __setTableResponse('chores', { data: [], error: null });
}

describe('ChildRewards (child rewards tab)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  it('renders rewards fetched from the household reward shop', async () => {
    setUpChild({ balance: 0, rewards: [{ id: 'r1', title: 'Extra screen time', point_cost: 50, category: 'fun' }] });
    const { findByText } = await render(<ChildRewards />);

    expect(await findByText('Extra screen time')).toBeTruthy();
  });

  it('shows the empty-history message when there are no transactions', async () => {
    setUpChild({ balance: 0 });
    const { findByText } = await render(<ChildRewards />);

    expect(await findByText('Points you earn and spend will show up here')).toBeTruthy();
  });

  it('an affordable reward shows a "Get it!" button that redeems it', async () => {
    setUpChild({ balance: 1000, rewards: [{ id: 'r1', title: 'Extra screen time', point_cost: 50, category: 'fun' }] });
    const rpcCalls = [];
    __setRpcResponse('redeem_reward', (params) => {
      rpcCalls.push(params);
      return { data: 950, error: null };
    });

    const { findByText } = await render(<ChildRewards />);
    await fireEvent.press(await findByText('Get it!'));

    await waitFor(() => {
      expect(rpcCalls).toContainEqual({ p_reward_id: 'r1' });
    });
  });

  it('an unaffordable reward shows how many more points are needed instead of a buy button', async () => {
    setUpChild({ balance: 10, rewards: [{ id: 'r1', title: 'Extra screen time', point_cost: 50, category: 'fun' }] });
    const { findByText, queryByText } = await render(<ChildRewards />);

    expect(await findByText('Need 40 more')).toBeTruthy();
    expect(queryByText('Get it!')).toBeNull();
  });

  it('filtering by category hides rewards outside it', async () => {
    setUpChild({
      balance: 0,
      rewards: [
        { id: 'r1', title: 'Extra screen time', point_cost: 50, category: 'fun' },
        { id: 'r2', title: 'Ice cream treat', point_cost: 30, category: 'treats' },
      ],
    });
    const { findByText, queryByText } = await render(<ChildRewards />);

    await findByText('Ice cream treat'); // wait for the initial fetch to land
    await fireEvent.press(await findByText('Treats'));

    expect(await findByText('Ice cream treat')).toBeTruthy();
    expect(queryByText('Extra screen time')).toBeNull();
  });
});
