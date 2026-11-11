// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChildChoresList from '../../app/(child)/(tabs)/chores/index';
import { __setTableResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockPush } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

describe('ChildChoresList (child chores tab)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  it('shows the "To do" tab by default with a to-do chore', async () => {
    __setTableResponse('chores', {
      data: [{ id: 'c1', title: 'Make bed', reward_amount: 10, status: 'todo', target_label: null }],
      error: null,
    });
    const { findByText } = await render(<ChildChoresList />);

    expect(await findByText('Make bed')).toBeTruthy();
  });

  it('splits "To do" into Today and Upcoming by due date', async () => {
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
    __setTableResponse('chores', {
      data: [
        { id: 'c1', title: 'Make bed', reward_amount: 10, status: 'todo', target_label: null, due_date: new Date().toISOString() },
        { id: 'c2', title: 'Rake leaves', reward_amount: 10, status: 'todo', target_label: null, due_date: nextWeek },
      ],
      error: null,
    });
    const { findByText, getAllByText } = await render(<ChildChoresList />);

    await findByText('Make bed');
    // matches come back in render order: Today header, today's chore,
    // Upcoming header, next week's chore
    const order = getAllByText(/^(Today|Make bed|Upcoming|Rake leaves)$/).map((n) => n.props.children);
    expect(order).toEqual(['Today', 'Make bed', 'Upcoming', 'Rake leaves']);
  });

  it('hides the Upcoming header when nothing is due later', async () => {
    __setTableResponse('chores', {
      data: [{ id: 'c1', title: 'Make bed', reward_amount: 10, status: 'todo', target_label: null, due_date: null }],
      error: null,
    });
    const { findByText, queryByText } = await render(<ChildChoresList />);

    await findByText('Make bed');
    expect(queryByText('Upcoming')).toBeNull();
  });

  it('hides chores that are not in the selected status tab', async () => {
    __setTableResponse('chores', {
      data: [{ id: 'c1', title: 'Already done chore', reward_amount: 10, status: 'approved', target_label: null }],
      error: null,
    });
    const { findByText, queryByText } = await render(<ChildChoresList />);

    // default tab is "To do" - an approved chore shouldn't show there
    await findByText('No chores yet');
    expect(queryByText('Already done chore')).toBeNull();
  });

  it('switching to the "Done" tab shows completed/approved chores', async () => {
    __setTableResponse('chores', {
      data: [{ id: 'c1', title: 'Already done chore', reward_amount: 10, status: 'approved', target_label: null }],
      error: null,
    });
    const { findByText } = await render(<ChildChoresList />);

    await fireEvent.press(await findByText('Done'));

    expect(await findByText('Already done chore')).toBeTruthy();
  });

  it('tapping a chore card navigates to its detail screen', async () => {
    __setTableResponse('chores', {
      data: [{ id: 'c1', title: 'Make bed', reward_amount: 10, status: 'todo', target_label: null }],
      error: null,
    });
    const { findByText } = await render(<ChildChoresList />);

    await fireEvent.press(await findByText('Make bed'));

    await waitFor(() => {
      expect(__mockPush).toHaveBeenCalledWith('/chores/c1');
    });
  });
});
