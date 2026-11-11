// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CreateReward from '../../app/(parent)/rewards/create-reward';
import { supabase, __setTableResponse, __resetMockSupabase } from '../../utils/supabase';
import { __mockBack, __mockReplace, __mockCanGoBack, useLocalSearchParams } from '../../__mocks__/expo-router';

jest.mock('../../utils/supabase');
jest.mock('../../utils/alert', () => ({
  showAlert: jest.fn(),
  showConfirm: jest.fn(),
}));

import { showConfirm } from '../../utils/alert';

describe('CreateReward (parent create/edit reward screen)', () => {
  beforeEach(() => {
    __resetMockSupabase();
    showConfirm.mockReset().mockResolvedValue(true);
  });

  it('renders the create form with no delete button', async () => {
    const { findByText, getByPlaceholderText, queryByText } = await render(<CreateReward />);

    expect(await findByText('Create a new reward')).toBeTruthy();
    expect(getByPlaceholderText('e.g. Extra screen time')).toBeTruthy();
    expect(queryByText('Delete reward')).toBeNull();
  });

  it('does nothing when submitted with an empty title', async () => {
    const insertCalls = [];
    __setTableResponse('rewards', (calls) => {
      const insertCall = calls.find((c) => c.method === 'insert');
      if (insertCall) insertCalls.push(insertCall.args[0]);
      return { data: null, error: null };
    });
    const { findByText } = await render(<CreateReward />);

    await fireEvent.press(await findByText('Submit'));

    expect(insertCalls).toHaveLength(0);
  });

  it('submitting creates a reward with the chosen title/cost/category and created_by', async () => {
    jest.useFakeTimers();
    const insertCalls = [];
    __setTableResponse('rewards', (calls) => {
      const insertCall = calls.find((c) => c.method === 'insert');
      if (insertCall) insertCalls.push(insertCall.args[0]);
      return { data: null, error: null };
    });
    const { findByText, getByPlaceholderText } = await render(<CreateReward />);

    await fireEvent.changeText(getByPlaceholderText('e.g. Extra screen time'), 'Movie night');
    await fireEvent.press(await findByText('Treats'));
    await fireEvent.press(await findByText('Submit'));

    await waitFor(() => {
      expect(insertCalls[0]).toMatchObject({
        title: 'Movie night',
        point_cost: 500,
        category: 'treats',
        created_by: 'test-user-id',
      });
    });

    // flush the post-success setTimeout (clears the form, pops back)
    await act(async () => { jest.runAllTimers(); });
    expect(__mockBack).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('tapping a reward-amount preset changes the submitted cost', async () => {
    const insertCalls = [];
    __setTableResponse('rewards', (calls) => {
      const insertCall = calls.find((c) => c.method === 'insert');
      if (insertCall) insertCalls.push(insertCall.args[0]);
      return { data: null, error: null };
    });
    const { findByText, getByPlaceholderText } = await render(<CreateReward />);

    await fireEvent.changeText(getByPlaceholderText('e.g. Extra screen time'), 'New toy');
    await fireEvent.press(await findByText('2,000'));
    await fireEvent.press(await findByText('Submit'));

    await waitFor(() => {
      expect(insertCalls[0]).toMatchObject({ point_cost: 2000 });
    });
  });

  describe('editing an existing reward', () => {
    function setUpEditing() {
      useLocalSearchParams.mockReturnValue({
        id: 'reward-1',
        title: 'Movie Night',
        cost: '1000',
        category: 'treats',
      });
    }

    it('pre-fills the form and shows the delete button', async () => {
      setUpEditing();
      const { findByText, findAllByText, getByPlaceholderText } = await render(<CreateReward />);

      expect(await findByText('Edit this reward')).toBeTruthy();
      expect(getByPlaceholderText('e.g. Extra screen time').props.value).toBe('Movie Night');
      // "1,000" appears twice: the amount display and the matching preset chip
      expect(await findAllByText('1,000')).toHaveLength(2);
      expect(await findByText('Delete reward')).toBeTruthy();
    });

    it('submitting updates the existing reward instead of inserting', async () => {
      setUpEditing();
      jest.useFakeTimers();
      const updateCalls = [];
      __setTableResponse('rewards', (calls) => {
        const updateCall = calls.find((c) => c.method === 'update');
        const eqCall = calls.find((c) => c.method === 'eq');
        if (updateCall) updateCalls.push({ update: updateCall.args[0], eqArgs: eqCall?.args });
        return { data: null, error: null };
      });
      const { findByText, getByPlaceholderText } = await render(<CreateReward />);

      await fireEvent.changeText(getByPlaceholderText('e.g. Extra screen time'), 'Movie Night (updated)');
      await fireEvent.press(await findByText('Submit'));

      await waitFor(() => {
        expect(updateCalls).toContainEqual({
          update: { title: 'Movie Night (updated)', point_cost: 1000, category: 'treats' },
          eqArgs: ['id', 'reward-1'],
        });
      });

      await act(async () => { jest.runAllTimers(); });
      jest.useRealTimers();
    });

    it('deleting asks for confirmation, then archives the reward and goes back', async () => {
      setUpEditing();
      const updateCalls = [];
      __setTableResponse('rewards', (calls) => {
        const updateCall = calls.find((c) => c.method === 'update');
        const eqCall = calls.find((c) => c.method === 'eq');
        if (updateCall) updateCalls.push({ update: updateCall.args[0], eqArgs: eqCall?.args });
        return { data: null, error: null };
      });
      const { findByText } = await render(<CreateReward />);

      await fireEvent.press(await findByText('Delete reward'));

      expect(showConfirm).toHaveBeenCalledWith('Delete this reward?', 'This cannot be undone.', 'Delete');
      await waitFor(() => {
        expect(updateCalls).toContainEqual({ update: { archived: true }, eqArgs: ['id', 'reward-1'] });
        expect(__mockBack).toHaveBeenCalled();
      });
    });

    it('declining the confirmation does not delete the reward', async () => {
      setUpEditing();
      showConfirm.mockResolvedValue(false);
      const updateCalls = [];
      __setTableResponse('rewards', (calls) => {
        const updateCall = calls.find((c) => c.method === 'update');
        if (updateCall) updateCalls.push(updateCall.args[0]);
        return { data: null, error: null };
      });
      const { findByText } = await render(<CreateReward />);

      await fireEvent.press(await findByText('Delete reward'));

      await waitFor(() => {
        expect(showConfirm).toHaveBeenCalled();
      });
      expect(updateCalls).toHaveLength(0);
      expect(__mockBack).not.toHaveBeenCalled();
    });
  });

  it('header back button pops history when available', async () => {
    __mockCanGoBack.mockReturnValue(true);
    const { findByTestId } = await render(<CreateReward />);

    await fireEvent.press(await findByTestId('back-button'));

    expect(__mockBack).toHaveBeenCalled();
    expect(__mockReplace).not.toHaveBeenCalled();
  });

  it('header back button falls back to the rewards tab when there is no history to pop', async () => {
    __mockCanGoBack.mockReturnValue(false);
    const { findByTestId } = await render(<CreateReward />);

    await fireEvent.press(await findByTestId('back-button'));

    expect(__mockReplace).toHaveBeenCalledWith('/(parent)/(tabs)/rewards');
    expect(__mockBack).not.toHaveBeenCalled();
  });
});
