// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ParentChoreReview from '../../app/(parent)/chores/[id]';
import { __setTableResponse, __setRpcResponse, __resetMockSupabase } from '../../utils/supabase';
import { useLocalSearchParams, __mockBack, __mockReplace, __mockCanGoBack } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

function setUpChore(overrides = {}) {
  useLocalSearchParams.mockReturnValue({ id: 'chore-1' });
  __setTableResponse('chores', {
    data: {
      id: 'chore-1',
      title: 'Clean the kitchen',
      status: 'completed',
      reward_amount: 50,
      ai_feedback: 'looks clean!',
      ai_confidence_score: 92,
      users: { display_name: 'Testy Kid' },
      ...overrides,
    },
    error: null,
  });
  __setTableResponse('chore_analysis', { data: null, error: null });
}

describe('ParentChoreReview (parent chore detail)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  it('renders the chore title and child name', async () => {
    setUpChore();
    const { findByText, getByText } = await render(<ParentChoreReview />);

    expect(await findByText('Clean the kitchen')).toBeTruthy();
    expect(getByText('Assigned to: Testy Kid')).toBeTruthy();
  });

  it('shows approve/reject buttons only while awaiting review (status completed)', async () => {
    setUpChore({ status: 'completed' });
    const { findByText } = await render(<ParentChoreReview />);

    expect(await findByText('approve')).toBeTruthy();
    expect(await findByText('reject')).toBeTruthy();
  });

  it('hides approve/reject buttons once already approved', async () => {
    setUpChore({ status: 'approved' });
    const { findByText, queryByText } = await render(<ParentChoreReview />);

    await findByText('Clean the kitchen');
    expect(queryByText('approve')).toBeNull();
    expect(queryByText('reject')).toBeNull();
  });

  it('approving calls approve_chore with the chore id and navigates home', async () => {
    setUpChore();
    const rpcCalls = [];
    __setRpcResponse('approve_chore', (params) => {
      rpcCalls.push(params);
      return { data: null, error: null };
    });
    const { findByText } = await render(<ParentChoreReview />);

    await fireEvent.press(await findByText('approve'));

    await waitFor(() => {
      expect(rpcCalls).toContainEqual({ p_chore_id: 'chore-1' });
      expect(__mockReplace).toHaveBeenCalledWith('/(parent)/(tabs)/home');
    });
  });

  it('rejecting sends the typed note along with the chore id', async () => {
    setUpChore();
    const rpcCalls = [];
    __setRpcResponse('reject_chore', (params) => {
      rpcCalls.push(params);
      return { data: null, error: null };
    });
    const { findByText, findByPlaceholderText } = await render(<ParentChoreReview />);

    const noteInput = await findByPlaceholderText('e.g. the dishes are still in the sink');
    await fireEvent.changeText(noteInput, 'still messy, try again');
    await fireEvent.press(await findByText('reject'));

    await waitFor(() => {
      expect(rpcCalls).toContainEqual({ p_chore_id: 'chore-1', p_note: 'still messy, try again' });
      expect(__mockReplace).toHaveBeenCalledWith('/(parent)/(tabs)/home');
    });
  });

  // Regression test: the back button used to call router.back()
  // unconditionally, which silently did nothing when this screen was
  // reached with no navigation history (e.g. a page refresh).
  it('back button pops history when available', async () => {
    setUpChore();
    __mockCanGoBack.mockReturnValue(true);
    const { findByText } = await render(<ParentChoreReview />);

    await fireEvent.press(await findByText('‹ back'));

    expect(__mockBack).toHaveBeenCalled();
    expect(__mockReplace).not.toHaveBeenCalled();
  });

  it('back button falls back to Home when there is no history to pop', async () => {
    setUpChore();
    __mockCanGoBack.mockReturnValue(false);
    const { findByText } = await render(<ParentChoreReview />);

    await fireEvent.press(await findByText('‹ back'));

    expect(__mockReplace).toHaveBeenCalledWith('/(parent)/(tabs)/home');
    expect(__mockBack).not.toHaveBeenCalled();
  });
});
