process.env.NODE_ENV = 'test';
const mockCollection = jest.fn();
jest.mock('firebase-admin', () => ({ initializeApp: jest.fn() }));
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection }),
  FieldValue: {},
}));
jest.mock('../functions/node_modules/cors', () => () => (req, res, callback) => callback());
jest.mock('firebase-functions/v1', () => ({
  https: { onRequest: callback => callback },
  runWith: () => ({ https: { onRequest: callback => callback } }),
  pubsub: { schedule: () => ({ timeZone: () => ({ onRun: callback => callback }) }) },
}));
const { privacyStatus } = require('../functions/index.js');

test('privacy status never looks up or discloses arbitrary email membership', async () => {
  const res = { set: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
  await privacyStatus({ method: 'GET', query: { email: 'someone@example.com' } }, res);
  expect(mockCollection).not.toHaveBeenCalled();
  expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ email: null }));
  expect(res.json.mock.calls[0][0].privacy).not.toHaveProperty('thirdPartySharing', 'never');
});
