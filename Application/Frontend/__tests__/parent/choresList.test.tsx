// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ParentChoresList from '../../app/(parent)/(tabs)/chores/index';
import { __setTableResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockPush } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

const CHILD_ID = 'child-1';

function setUpFamilyWithChores(chores) {
  __setTableResponse('users', (calls) => {
    const isProfileLookup = calls.some((c) => c.method === 'eq' && c.args[0] === 'id');
    if (isProfileLookup) return { data: { family_id: 'family-1' }, error: null };
    return { data: [{ id: CHILD_ID, display_name: 'Testy Kid' }], error: null };
  });
  __setTableResponse('chores', { data: chores, error: null });
}

describe('ParentChoresList (parent chores tab)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  it('renders all three status tabs', async () => {
    setUpFamilyWithChores([]);
    const { findByText, getByText } = await render(<ParentChoresList />);

    expect(await findByText('To approve')).toBeTruthy();
    expect(getByText('In progress')).toBeTruthy();
    expect(getByText('Approved')).toBeTruthy();
  });

  it('defaults to the "To approve" tab, showing only completed chores', async () => {
    setUpFamilyWithChores([
      { id: 'c1', title: 'Waiting chore', status: 'completed', reward_amount: 10, assigned_to: CHILD_ID, target_label: null },
      { id: 'c2', title: 'Todo chore', status: 'todo', reward_amount: 20, assigned_to: CHILD_ID, target_label: null },
      { id: 'c3', title: 'Approved chore', status: 'approved', reward_amount: 30, assigned_to: CHILD_ID, target_label: null },
    ]);
    const { findByText, queryByText } = await render(<ParentChoresList />);

    expect(await findByText('Waiting chore')).toBeTruthy();
    expect(queryByText('Todo chore')).toBeNull();
    expect(queryByText('Approved chore')).toBeNull();
  });

  it('switching to "In progress" shows todo/pending chores', async () => {
    setUpFamilyWithChores([
      { id: 'c2', title: 'Todo chore', status: 'todo', reward_amount: 20, assigned_to: CHILD_ID, target_label: null },
    ]);
    const { findByText } = await render(<ParentChoresList />);

    await fireEvent.press(await findByText('In progress'));

    expect(await findByText('Todo chore')).toBeTruthy();
  });

  it('switching to "Approved" shows approved chores', async () => {
    setUpFamilyWithChores([
      { id: 'c3', title: 'Approved chore', status: 'approved', reward_amount: 30, assigned_to: CHILD_ID, target_label: null },
    ]);
    const { findByText } = await render(<ParentChoresList />);

    await fireEvent.press(await findByText('Approved'));

    expect(await findByText('Approved chore')).toBeTruthy();
  });

  it('tapping any chore card navigates to its review screen, regardless of status', async () => {
    setUpFamilyWithChores([
      { id: 'c3', title: 'Approved chore', status: 'approved', reward_amount: 30, assigned_to: CHILD_ID, target_label: null },
    ]);
    const { findByText } = await render(<ParentChoresList />);

    await fireEvent.press(await findByText('Approved')); // switch tabs so it's visible
    const card = await findByText('Approved chore');
    await fireEvent.press(card);

    await waitFor(() => {
      expect(__mockPush).toHaveBeenCalledWith('/(parent)/chores/c3');
    });
  });
});
