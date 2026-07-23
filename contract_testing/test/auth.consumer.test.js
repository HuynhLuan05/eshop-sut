const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const axios = require('axios');
const path = require('path');

const { regex } = MatchersV3;

const provider = new PactV3({
  consumer: 'EshopConsumer',
  provider: 'EShopBackend',
  dir: path.resolve(process.cwd(), 'pacts'),
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  logLevel: process.env.PACT_LOG_LEVEL || 'info',
});

describe('POST /api/login', () => {
  it('returns 200 and a token when credentials are valid', async () => {
    provider.addInteraction({
      states: [{ description: 'User exists with valid credentials' }],
      uponReceiving: 'a request to login with valid credentials',
      withRequest: {
        method: 'POST',
        path: '/api/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'test@eshop.com', password: 'Test1234!' },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': regex({ generate: 'application/json', matcher: '^application/json.*' }) },
        body: {
          message: MatchersV3.like('Login successful'),
          token: MatchersV3.string('mocked-jwt-token'),
        },
      },
    });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.post(`${mockServer.url}/api/login`, {
        email: 'test@eshop.com',
        password: 'Test1234!',
      });
      expect(response.status).toEqual(200);
      expect(response.data.token).toBeDefined();
    });
  });

  it('returns 401 when password is wrong', async () => {
    provider.addInteraction({
      states: [{ description: 'User exists but password is wrong' }],
      uponReceiving: 'a request to login with wrong password',
      withRequest: {
        method: 'POST',
        path: '/api/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'test@eshop.com', password: 'WrongPass!' },
      },
      willRespondWith: {
        status: 401,
        headers: { 'Content-Type': regex({ generate: 'application/json', matcher: '^application/json.*' }) },
        body: {
          error: MatchersV3.like('Invalid email or password'),
        },
      },
    });

    await provider.executeTest(async (mockServer) => {
      try {
        await axios.post(`${mockServer.url}/api/login`, {
          email: 'test@eshop.com',
          password: 'WrongPass!',
        });
      } catch (error) {
        expect(error.response.status).toEqual(401);
        expect(error.response.data.error).toBeDefined();
      }
    });
  });
});
