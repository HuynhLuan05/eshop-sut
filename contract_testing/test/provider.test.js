const { Verifier } = require('@pact-foundation/pact');
const path = require('path');
const axios = require('axios');

describe('Pact Verification', () => {
  let token = '';

  beforeAll(async () => {
    // Authenticate with the backend to get a valid JWT token
    try {
      const user = { name: 'Pact User', email: 'pact@example.com', password: 'password123' };
      // Attempt to register, ignore error if user already exists
      await axios.post('http://localhost:3000/api/register', user).catch(() => {});
      
      const loginRes = await axios.post('http://localhost:3000/api/login', {
        email: 'pact@example.com',
        password: 'password123'
      });
      token = loginRes.data.token;
    } catch (err) {
      console.error('Failed to authenticate for provider tests:', err.message);
    }
  });

  it('validates the expectations of EshopConsumer', async () => {
    const opts = {
      providerBaseUrl: 'http://localhost:3000',
      provider: 'EShopBackend',
      pactUrls: [path.resolve(__dirname, '..', 'pacts', 'EshopConsumer-EShopBackend.json')],
      stateHandlers: {
        'cart is empty or ready': async () => {
          // Setup state: the user is logged in (handled by beforeAll),
          // and we could clear their cart if there was an endpoint for it.
          // Since it's in-memory, we just return a success message.
          return Promise.resolve('State setup completed');
        }
      },
      requestFilter: (req, res, next) => {
        // Inject the real token into requests that have the mock token
        if (req.headers['authorization']) {
          req.headers['authorization'] = `Bearer ${token}`;
        }
        next();
      }
    };

    return new Verifier(opts).verifyProvider().then(output => {
      console.log('Pact Verification Complete!');
      console.log(output);
    });
  });
});
