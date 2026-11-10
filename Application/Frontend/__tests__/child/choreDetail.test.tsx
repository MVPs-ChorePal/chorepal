// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChoreSubmissionMachine from '../../app/(child)/chores/[id]';
import { __setTableResponse, __resetMockSupabase } from '../../utils/supabase';
import { useLocalSearchParams, __mockBack, __mockReplace, __mockCanGoBack } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

function setUpChore(overrides = {}) {
  useLocalSearchParams.mockReturnValue({ id: 'chore-1' });
  __setTableResponse('chores', {
    data: {
      id: 'chore-1',
      title: 'Clean the kitchen',
      status: 'todo',
      reward_amount: 50,
      target_label: null,
      ...overrides,
    },
    error: null,
  });
  __setTableResponse('chore_analysis', { data: null, error: null });
  __setTableResponse('users', { data: { display_name: 'Testy Kid' }, error: null });
}

describe('ChoreSubmissionMachine (child chore detail)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  // Regression test for a real bug: this screen used to key the "your
  // grown-up is checking" frame off status === 'pending' instead of
  // 'completed', trapping every chore (status flips to 'pending' right
  // after the before photo, before any after photo has ever been taken)
  // on a dead-end screen with no camera and a broken image.
  it('shows the "grown-up is checking" screen when status is completed', async () => {
    setUpChore({ status: 'completed', after_image_key: 'after.jpg' });
    const { findByText } = await render(<ChoreSubmissionMachine />);

    expect(await findByText('Your grown-up is checking!')).toBeTruthy();
  });

  it('shows the camera/capture screen when status is pending (not the checking screen)', async () => {
    setUpChore({ status: 'pending' });
    const { findByText, queryByText } = await render(<ChoreSubmissionMachine />);

    expect(await findByText('Show your grown-up')).toBeTruthy();
    expect(queryByText('Your grown-up is checking!')).toBeNull();
  });

  it('shows the camera/capture screen when status is todo', async () => {
    setUpChore({ status: 'todo' });
    const { findByText } = await render(<ChoreSubmissionMachine />);

    expect(await findByText('Show your grown-up')).toBeTruthy();
  });

  it('shows the celebration screen when status is approved', async () => {
    setUpChore({ status: 'approved', after_image_key: 'after.jpg' });
    const { findByText } = await render(<ChoreSubmissionMachine />);

    expect(await findByText('CHORE COMPLETE!')).toBeTruthy();
    expect(await findByText('Collect my coins!')).toBeTruthy();
  });

  it('"Collect my coins" pops history when available', async () => {
    setUpChore({ status: 'approved', after_image_key: 'after.jpg' });
    __mockCanGoBack.mockReturnValue(true);
    const { findByText } = await render(<ChoreSubmissionMachine />);

    await fireEvent.press(await findByText('Collect my coins!'));

    expect(__mockBack).toHaveBeenCalled();
    expect(__mockReplace).not.toHaveBeenCalled();
  });

  it('"Collect my coins" falls back to Home when there is no history to pop', async () => {
    setUpChore({ status: 'approved', after_image_key: 'after.jpg' });
    __mockCanGoBack.mockReturnValue(false);
    const { findByText } = await render(<ChoreSubmissionMachine />);

    await fireEvent.press(await findByText('Collect my coins!'));

    expect(__mockReplace).toHaveBeenCalledWith('/(child)/(tabs)/home');
    expect(__mockBack).not.toHaveBeenCalled();
  });
});
