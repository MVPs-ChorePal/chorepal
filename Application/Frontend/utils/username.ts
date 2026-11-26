//usernames are stored lowercase with no spaces - the same rule is applied at
//signup, login and "forgot password", so whatever a kid types still matches
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/\s/g, '');
}

//the database enforces the same rule (migration 20261126120000)
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9._-]{3,30}$/.test(username);
}

//login and "forgot password" also accept the 2-letter usernames some
//older accounts have - only new signups need 3+
export function couldBeUsername(username: string): boolean {
  return /^[a-z0-9._-]{2,30}$/.test(username);
}

export const USERNAME_RULE = 'usernames must be 3-30 characters: letters, numbers, . _ or -';

//children sign in with this address. it's never shown or emailed - the app
//works it out from the username, so no account email ever has to be looked up
export function childLoginEmail(username: string): string {
  return `${normalizeUsername(username)}@chorepal.internal`;
}
