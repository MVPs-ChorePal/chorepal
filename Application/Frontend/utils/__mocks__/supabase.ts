// @ts-nocheck
// Manual Jest mock for utils/supabase.ts - test files opt in with
// `jest.mock('../../utils/supabase')` (path relative to the test file; any
// specifier that resolves to the real utils/supabase.ts works, since Jest
// matches by resolved file path). Every query chain resolves to
// { data: null, error: null } by default; use __setTableResponse to
// configure what a specific table returns, and __resetMockSupabase between
// tests to clear configured responses and call history.
//
// __setTableResponse(table, response) accepts:
//   - a plain { data, error } object, reused for every call to that table
//   - an array of responses, consumed in order across successive calls to
//     that table, repeating the last entry once exhausted (order-based -
//     fragile if a component re-renders/re-fetches an extra time)
//   - a function (calls) => response, where `calls` is this invocation's
//     list of { method, args } chain calls (e.g. [{method:'eq',
//     args:['family_id', 'family-1']}]) - the robust option when a table
//     is queried more than once with different filters expecting
//     different shapes back, since it doesn't depend on call order.

function createChainable(resolve) {
  const calls = [];
  const chain = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'is', 'not', 'like', 'ilike',
    'gt', 'gte', 'lt', 'lte', 'filter',
    'order', 'limit', 'range',
    'single', 'maybeSingle',
  ];
  methods.forEach((m) => {
    chain[m] = jest.fn((...args) => {
      calls.push({ method: m, args });
      return chain;
    });
  });
  chain.then = (onFulfilled, onRejected) => Promise.resolve(resolve(calls)).then(onFulfilled, onRejected);
  chain.catch = (onRejected) => Promise.resolve(resolve(calls)).catch(onRejected);
  return chain;
}

const tableResponses = {};
const tableCallCounts = {};
const rpcResponses = {};
const defaultResponse = { data: null, error: null };

export const __setTableResponse = (table, response) => {
  tableResponses[table] = response;
};

// response can be a plain { data, error } object or a function (params) =>
// response, where `params` is whatever object was passed as the RPC's
// second argument (e.g. supabase.rpc('approve_chore', { p_chore_id: 1 })).
export const __setRpcResponse = (name, response) => {
  rpcResponses[name] = response;
};

const resolveTable = (table, calls) => {
  const configured = tableResponses[table];
  if (typeof configured === 'function') return configured(calls);
  if (Array.isArray(configured)) {
    const idx = tableCallCounts[table] ?? 0;
    tableCallCounts[table] = idx + 1;
    return configured[Math.min(idx, configured.length - 1)] ?? defaultResponse;
  }
  return configured ?? defaultResponse;
};

const mockGetSession = jest.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user-id' } } } });
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
const mockSignInWithPassword = jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null });
const mockSignUp = jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null });
const mockSignOut = jest.fn().mockResolvedValue({ error: null });
const mockResetPasswordForEmail = jest.fn().mockResolvedValue({ data: {}, error: null });
const mockVerifyOtp = jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null });
const mockUpdateUser = jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null });
const mockFrom = jest.fn((table) => createChainable((calls) => resolveTable(table, calls)));
const mockRpc = jest.fn((name, params) => {
  const configured = rpcResponses[name];
  const response = typeof configured === 'function' ? configured(params) : configured ?? defaultResponse;
  return Promise.resolve(response);
});
const mockInvoke = jest.fn().mockResolvedValue({ data: null, error: null });
const mockOn = jest.fn(function () { return this; });
const mockSubscribe = jest.fn(function () { return this; });
const mockChannel = jest.fn(() => ({ on: mockOn, subscribe: mockSubscribe }));
const mockRemoveChannel = jest.fn();

export const __resetMockSupabase = () => {
  Object.keys(tableResponses).forEach((k) => delete tableResponses[k]);
  Object.keys(tableCallCounts).forEach((k) => delete tableCallCounts[k]);
  Object.keys(rpcResponses).forEach((k) => delete rpcResponses[k]);
  [
    mockGetSession, mockGetUser, mockSignInWithPassword, mockSignUp, mockSignOut,
    mockResetPasswordForEmail, mockVerifyOtp, mockUpdateUser,
    mockFrom, mockRpc, mockInvoke, mockOn, mockSubscribe, mockChannel, mockRemoveChannel,
  ].forEach((fn) => fn.mockClear());
};

export const supabase = {
  auth: {
    getSession: mockGetSession,
    getUser: mockGetUser,
    signInWithPassword: mockSignInWithPassword,
    signUp: mockSignUp,
    signOut: mockSignOut,
    resetPasswordForEmail: mockResetPasswordForEmail,
    verifyOtp: mockVerifyOtp,
    updateUser: mockUpdateUser,
  },
  from: mockFrom,
  rpc: mockRpc,
  functions: { invoke: mockInvoke },
  channel: mockChannel,
  removeChannel: mockRemoveChannel,
};
