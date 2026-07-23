const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const axios = require('axios');
const path = require('path');

const { integer, regex } = MatchersV3;

const provider = new PactV3({
  consumer: 'EshopConsumer',
  provider: 'EShopBackend',
  dir: path.resolve(process.cwd(), 'pacts'),
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  logLevel: process.env.PACT_LOG_LEVEL || 'info',
});

describe('POST /api/cart', () => {
  it('adds an item to the cart and returns 201 with cart details', async () => {
    // Arrange: Define the expected interaction
    provider.addInteraction({
      states: [{ description: 'a valid auth token exists, user cart is empty, and product with ID 1 exists' }],
      uponReceiving: 'a request to add item to cart',
      withRequest: {
        method: 'POST',
        path: '/api/cart',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        body: {
          id: 1,
          name: "iPhone 15 Pro Max",
          price: 30000000,
          quantity: 2,
        },
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': regex({ generate: 'application/json', matcher: '^application/json.*' }),
        },
        body: {
          message: MatchersV3.like('Added to cart'),
        },
      },
    });

    // Act & Assert: Execute the test within the context of the mock provider
    await provider.executeTest(async (mockServer) => {
      const response = await axios.post(
        `${mockServer.url}/api/cart`,
        { id: 1, name: "iPhone 15 Pro Max", price: 30000000, quantity: 2 },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
        }
      );

      expect(response.status).toEqual(200);
      expect(response.data.message).toEqual("Added to cart");
    });
  });

  it('returns 401 Unauthorized when no token is provided', async () => {
    // Arrange
    provider.addInteraction({
      states: [{ description: 'system is running' }],
      uponReceiving: 'a request to add item to cart without auth token',
      withRequest: {
        method: 'POST',
        path: '/api/cart',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          id: 1,
          name: "iPhone 15 Pro Max",
          price: 30000000,
          quantity: 2,
        },
      },
      willRespondWith: {
        status: 401,
        headers: {
          'Content-Type': regex({ generate: 'application/json', matcher: '^application/json.*' }),
        },
        body: {
          error: MatchersV3.like('Unauthorized'),
        },
      },
    });

    // Act & Assert
    await provider.executeTest(async (mockServer) => {
      try {
        await axios.post(
          `${mockServer.url}/api/cart`,
          { id: 1, name: "iPhone 15 Pro Max", price: 30000000, quantity: 2 },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error) {
        expect(error.response.status).toEqual(401);
        expect(error.response.data.error).toEqual("Unauthorized");
      }
    });
  });
});
