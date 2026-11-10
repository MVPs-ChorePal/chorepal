// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ParentDashboard from '../../app/(parent)/(tabs)/home';
import { __setTableResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockPush } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

const CHILD_ID = 'child-1';

const waitingChore = {
  id: 'chore-waiting',
  title: 'Clean the kitchen',
  status: 'completed',
  reward_amount: 50,
  assigned_to: CHILD_ID,
};

const dueTodayChore = {
  id: 'chore-due-today',
  title: 'Take out trash',
  status: 'todo',
  reward_amount: 20,
  assigned_to: CHILD_ID,
};

function setUpFamilyWithChores(chores) {
  // Content-based (not call-order-based): home.tsx queries 'users' twice
  // with different filters expecting different shapes back - once for the
  // signed-in parent's own profile (.eq('id', ...)), once for the
  // household's children (.eq('family_id', ...).eq('role', 'child')).
  __setTableResponse('users', (calls) => {
    const isProfileLookup = calls.some((c) => c.method === 'eq' && c.args[0] === 'id');
    if (isProfileLookup) return { data: { family_id: 'family-1', display_name: 'Testy Parent' }, error: null };
    return { data: [{ id: CHILD_ID, display_name: 'Testy Kid', current_balance: 0 }], error: null };
  });
  __setTableResponse('chores', { data: chores, error: null });
}

describe('ParentDashboard (parent home)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  it('renders without crashing and shows both section headers', async () => {
    setUpFamilyWithChores([]);
    const { findByText, getByText } = await render(<ParentDashboard />);

    expect(await findByText('Needs your OK')).toBeTruthy();
    expect(getByText('Due today')).toBeTruthy();
  });

  it('shows empty-state text when there are no chores', async () => {
    setUpFamilyWithChores([]);
    const { findByText, getByText } = await render(<ParentDashboard />);

    expect(await findByText('Nothing to approve right now')).toBeTruthy();
    expect(getByText('Nothing on the schedule')).toBeTruthy();
  });

  it('tapping a "needs your OK" chore card navigates to its review screen', async () => {
    setUpFamilyWithChores([waitingChore]);
    const { findByText } = await render(<ParentDashboard />);

    const card = await findByText('Clean the kitchen');
    await fireEvent.press(card);

    await waitFor(() => {
      expect(__mockPush).toHaveBeenCalledWith('/(parent)/chores/chore-waiting');
    });
  });

  // Regression test for a real bug: "due today" cards used to be plain,
  // non-interactive Views with no onPress at all, unlike the "needs your OK"
  // cards - tapping one silently did nothing.
  it('tapping a "due today" chore card also navigates to its review screen', async () => {
    setUpFamilyWithChores([dueTodayChore]);
    const { findByText } = await render(<ParentDashboard />);

    const card = await findByText('Take out trash');
    await fireEvent.press(card);

    await waitFor(() => {
      expect(__mockPush).toHaveBeenCalledWith('/(parent)/chores/chore-due-today');
    });
  });

  it('tapping "+ New chore" navigates to the creation screen', async () => {
    setUpFamilyWithChores([]);
    const { findByText } = await render(<ParentDashboard />);

    const button = await findByText('+ New chore');
    await fireEvent.press(button);

    expect(__mockPush).toHaveBeenCalledWith('/(parent)/chores/create-chore');
  });
});
