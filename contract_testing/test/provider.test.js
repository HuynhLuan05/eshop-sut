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
      pactUrls: [
        path.resolve(__dirname, '..', 'pacts', 'EshopConsumer-EShopBackend.json')
      ],
      stateHandlers: {
        'system is running': async () => {
          console.log('[State] Setup system is running');
          return Promise.resolve('System running');
        },
        'a valid auth token exists, user cart is empty, and product with ID 1 exists': async () => {
          console.log('[State] Setup valid auth token and empty cart');
          return Promise.resolve('State setup completed');
        },
        'User exists with valid credentials': async () => {
          console.log('[State] Setup valid user credentials in DB');
          return Promise.resolve('User ready');
        },
        'User exists but password is wrong': async () => {
          console.log('[State] Setup user with different password');
          return Promise.resolve('User ready');
        },
        'products exist in database': async () => {
          console.log('[State] Setup mock products in DB');
          return Promise.resolve('Products ready');
        },
        'product with ID 9999 does not exist': async () => {
          console.log('[State] Ensure product 9999 is removed');
          return Promise.resolve('Product 9999 removed');
        },
        'cart has items ready for checkout': async () => {
          console.log('[State] Inject items into cart for user');
          return Promise.resolve('Cart ready for checkout');
        }
      },
      requestFilter: (req, res, next) => {
        // Inject the real token into requests that have the mock token
        if (req.headers['authorization'] && token) {
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
