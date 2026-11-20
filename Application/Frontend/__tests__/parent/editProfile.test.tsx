// @ts-nocheck
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EditProfile from '../../app/(parent)/account/edit-profile';
import { supabase, __setTableResponse, __resetMockSupabase } from '../../utils/supabase';
import { showAlert } from '../../utils/alert';

jest.mock('../../utils/supabase');
jest.mock('../../utils/alert', () => ({ showAlert: jest.fn() }));

const ORIGINAL = { id: 'test-user-id', email: 'pat@example.com', phone: '15551234567' };

// getUser is what the screen treats as "what is actually stored"
function storedUser(user) {
  supabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
}

async function renderScreen() {
  const utils = await render(<EditProfile />);
  await utils.findByDisplayValue('Pat');
  return utils;
}

describe('EditProfile', () => {
  beforeEach(() => {
    __resetMockSupabase();
    showAlert.mockClear();
    supabase.auth.refreshSession = jest.fn().mockResolvedValue({ data: {}, error: null });
    storedUser(ORIGINAL);
    __setTableResponse('users', { data: { display_name: 'Pat' }, error: null });
  });

  it('loads the name, email and phone (phone from the auth user)', async () => {
    const { findByDisplayValue } = await renderScreen();
    expect(await findByDisplayValue('pat@example.com')).toBeTruthy();
    expect(await findByDisplayValue('+15551234567')).toBeTruthy();
  });

  it('a name change saves through update-profile without asking for a password', async () => {
    const { getByDisplayValue, findByText, queryByTestId } = await renderScreen();
    await fireEvent.changeText(getByDisplayValue('Pat'), 'Pat Two');
    expect(queryByTestId('current-password-input')).toBeNull();

    supabase.functions.invoke.mockResolvedValue({ data: { displayName: 'Pat Two', email: ORIGINAL.email, phone: ORIGINAL.phone, notified: true }, error: null });
    __setTableResponse('users', { data: { display_name: 'Pat Two' }, error: null });
    await fireEvent.press(await findByText('Save changes'));

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith('Saved', expect.stringContaining('Your name was updated successfully')));
    expect(supabase.functions.invoke).toHaveBeenCalledWith('update-profile', { body: { displayName: 'Pat Two' } });
  });

  it('an email change asks for the current password and does not save without it', async () => {
    const { getByDisplayValue, findByText, findByTestId } = await renderScreen();
    await fireEvent.changeText(getByDisplayValue('pat@example.com'), 'new@example.com');
    expect(await findByTestId('current-password-input')).toBeTruthy();

    await fireEvent.press(await findByText('Save changes'));

    expect(showAlert).toHaveBeenCalledWith('error', expect.stringContaining('current password'));
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('an email + phone change with the password is saved, then confirmed by re-reading before the popup', async () => {
    const { getByDisplayValue, findByText, findByTestId } = await renderScreen();
    await fireEvent.changeText(getByDisplayValue('pat@example.com'), 'new@example.com');
    await fireEvent.changeText(getByDisplayValue('+15551234567'), '(555) 765-4321');
    await fireEvent.changeText(await findByTestId('current-password-input'), 'secret123');

    supabase.functions.invoke.mockResolvedValue({ data: { displayName: 'Pat', email: 'new@example.com', phone: '15557654321', notified: true }, error: null });
    storedUser({ ...ORIGINAL, email: 'new@example.com', phone: '15557654321' });
    await fireEvent.press(await findByText('Save changes'));

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith('Saved', 'Your email and phone number were updated successfully. We emailed you a notice about this change.'));
    expect(supabase.functions.invoke).toHaveBeenCalledWith('update-profile', {
      body: { email: 'new@example.com', phone: '(555) 765-4321', currentPassword: 'secret123' },
    });
    expect(supabase.auth.refreshSession).toHaveBeenCalled();
  });

  it('shows the server reason and no success popup when the save is refused', async () => {
    const { getByDisplayValue, findByText, findByTestId } = await renderScreen();
    await fireEvent.changeText(getByDisplayValue('pat@example.com'), 'new@example.com');
    await fireEvent.changeText(await findByTestId('current-password-input'), 'wrong');

    supabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context: { json: async () => ({ error: 'current password is incorrect' }) } },
    });
    await fireEvent.press(await findByText('Save changes'));

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith('error', 'current password is incorrect'));
    expect(showAlert).not.toHaveBeenCalledWith('Saved', expect.anything());
  });

  it('does not show success if a fresh read does not match what the server reported', async () => {
    const { getByDisplayValue, findByText } = await renderScreen();
    await fireEvent.changeText(getByDisplayValue('Pat'), 'Pat Two');

    supabase.functions.invoke.mockResolvedValue({ data: { displayName: 'Pat Two', email: ORIGINAL.email, phone: ORIGINAL.phone, notified: true }, error: null });
    //the database still says "Pat"
    await fireEvent.press(await findByText('Save changes'));

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith('error', expect.stringContaining('could not be confirmed')));
    expect(showAlert).not.toHaveBeenCalledWith('Saved', expect.anything());
  });
});
