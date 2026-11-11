// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CreateChore from '../../app/(parent)/chores/create-chore';
import { __setTableResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockBack, __mockReplace, __mockCanGoBack, useLocalSearchParams } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');

function setUpWithChild() {
  __setTableResponse('users', (calls) => {
    const isProfileLookup = calls.some((c) => c.method === 'eq' && c.args[0] === 'id');
    if (isProfileLookup) return { data: { family_id: 'family-1' }, error: null };
    return { data: [{ id: 'child-1', display_name: 'Testy Kid' }], error: null };
  });
}

describe('CreateChore (parent create-chore screen)', () => {
  beforeEach(() => {
    __resetMockSupabase();
  });

  it('renders the form', async () => {
    setUpWithChild();
    const { findByText, getByPlaceholderText } = await render(<CreateChore />);

    expect(await findByText('Category')).toBeTruthy();
    expect(getByPlaceholderText('e.g. Unload the Dishwasher')).toBeTruthy();
  });

  it('submitting with a title and an assigned child inserts a chore row', async () => {
    jest.useFakeTimers();
    setUpWithChild();
    const insertCalls = [];
    __setTableResponse('chores', (calls) => {
      const insertCall = calls.find((c) => c.method === 'insert');
      if (insertCall) insertCalls.push(insertCall.args[0]);
      return { data: null, error: null };
    });

    const { findByPlaceholderText, findByText } = await render(<CreateChore />);

    const titleInput = await findByPlaceholderText('e.g. Unload the Dishwasher');
    await fireEvent.changeText(titleInput, 'Unload the dishwasher');
    // default "assign to" is 'all', and setUpWithChild() provides exactly
    // one child, so no extra interaction is needed to target someone
    await fireEvent.press(await findByText('Submit'));

    await waitFor(() => {
      expect(insertCalls[0]).toMatchObject([
        expect.objectContaining({ title: 'Unload the dishwasher', assigned_to: 'child-1', status: 'todo' }),
      ]);
    });

    // flush the post-success setTimeout (clears the form, navigates home)
    // instead of leaving it pending past the end of the test
    await act(async () => { jest.runAllTimers(); });
    jest.useRealTimers();
  });

  it('does nothing when submitted with an empty title', async () => {
    setUpWithChild();
    const insertCalls = [];
    __setTableResponse('chores', (calls) => {
      const insertCall = calls.find((c) => c.method === 'insert');
      if (insertCall) insertCalls.push(insertCall.args[0]);
      return { data: null, error: null };
    });

    const { findByText } = await render(<CreateChore />);
    await fireEvent.press(await findByText('Submit'));

    expect(insertCalls).toHaveLength(0);
  });

  it('after a successful submit, pops history when available', async () => {
    jest.useFakeTimers();
    setUpWithChild();
    __setTableResponse('chores', { data: null, error: null });
    __mockCanGoBack.mockReturnValue(true);

    const { findByPlaceholderText, findByText } = await render(<CreateChore />);
    await fireEvent.changeText(await findByPlaceholderText('e.g. Unload the Dishwasher'), 'Unload the dishwasher');
    await fireEvent.press(await findByText('Submit'));
    await act(async () => { jest.runAllTimers(); });

    expect(__mockBack).toHaveBeenCalled();
    expect(__mockReplace).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('after a successful submit, falls back to Home when there is no history to pop', async () => {
    jest.useFakeTimers();
    setUpWithChild();
    __setTableResponse('chores', { data: null, error: null });
    __mockCanGoBack.mockReturnValue(false);

    const { findByPlaceholderText, findByText } = await render(<CreateChore />);
    await fireEvent.changeText(await findByPlaceholderText('e.g. Unload the Dishwasher'), 'Unload the dishwasher');
    await fireEvent.press(await findByText('Submit'));
    await act(async () => { jest.runAllTimers(); });

    expect(__mockReplace).toHaveBeenCalledWith('/(parent)/(tabs)/home');
    expect(__mockBack).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('header back button pops history when available', async () => {
    setUpWithChild();
    __mockCanGoBack.mockReturnValue(true);
    const { findByTestId } = await render(<CreateChore />);

    await fireEvent.press(await findByTestId('back-button'));

    expect(__mockBack).toHaveBeenCalled();
    expect(__mockReplace).not.toHaveBeenCalled();
  });

  it('header back button falls back to Home when there is no history to pop', async () => {
    setUpWithChild();
    __mockCanGoBack.mockReturnValue(false);
    const { findByTestId } = await render(<CreateChore />);

    await fireEvent.press(await findByTestId('back-button'));

    expect(__mockReplace).toHaveBeenCalledWith('/(parent)/(tabs)/home');
    expect(__mockBack).not.toHaveBeenCalled();
  });

  describe('editing an existing chore', () => {
    function setUpEditing() {
      setUpWithChild();
      useLocalSearchParams.mockReturnValue({
        id: 'chore-1',
        title: 'Unload the dishwasher',
        reward: '500',
        targetLabel: 'Dishware',
        assignedTo: 'child-1',
        dueDate: '2026-01-01T00:00:00.000Z',
        steps: JSON.stringify(['Scrub the plates']),
      });
    }

    // Only the due date and reward can change once a chore exists - title,
    // category, assigned child, and steps are fixed at creation.
    it('shows the title read-only and hides category/steps/who\'s-doing-it', async () => {
      setUpEditing();
      const { findByText, queryByText, queryByPlaceholderText } = await render(<CreateChore />);

      expect(await findByText('Unload the dishwasher')).toBeTruthy();
      expect(queryByPlaceholderText('e.g. Unload the Dishwasher')).toBeNull();
      expect(queryByText('Category')).toBeNull();
      expect(queryByText('Steps')).toBeNull();
      expect(queryByText("Who's doing it?")).toBeNull();
    });

    it('still shows the due date and reward fields', async () => {
      setUpEditing();
      const { findByText } = await render(<CreateChore />);

      expect(await findByText('When?')).toBeTruthy();
      expect(await findByText('Reward')).toBeTruthy();
    });

    it('submitting only updates reward_amount and due_date, not title/category/steps/assignee', async () => {
      setUpEditing();
      const updateCalls = [];
      __setTableResponse('chores', (calls) => {
        const updateCall = calls.find((c) => c.method === 'update');
        const eqCall = calls.find((c) => c.method === 'eq');
        if (updateCall) updateCalls.push({ update: updateCall.args[0], eqArgs: eqCall?.args });
        return { data: null, error: null };
      });

      const { findByText } = await render(<CreateChore />);
      await fireEvent.press(await findByText('Submit'));

      await waitFor(() => {
        expect(updateCalls).toHaveLength(1);
        expect(updateCalls[0].eqArgs).toEqual(['id', 'chore-1']);
        expect(Object.keys(updateCalls[0].update).sort()).toEqual(['due_date', 'reward_amount']);
        expect(updateCalls[0].update.reward_amount).toBe(500);
      });
    });
  });
});
