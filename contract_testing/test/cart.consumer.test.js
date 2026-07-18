const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const axios = require('axios');
const path = require('path');

const { integer } = MatchersV3;

const provider = new PactV3({
  consumer: 'EshopConsumer',
  provider: 'EShopBackend',
  dir: path.resolve(process.cwd(), 'pacts'),
});

describe('POST /api/cart', () => {
  it('adds an item to the cart and returns 201 with cart details', async () => {
    // Arrange: Define the expected interaction
    provider.addInteraction({
      states: [{ description: 'cart is empty or ready' }],
      uponReceiving: 'a request to add item to cart',
      withRequest: {
        method: 'POST',
        path: '/api/cart',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        body: {
          productId: 1,
          quantity: 2,
        },
      },
      willRespondWith: {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          productId: integer(1),
          quantity: integer(2),
        },
      },
    });

    // Act & Assert: Execute the test within the context of the mock provider
    await provider.executeTest(async (mockServer) => {
      const response = await axios.post(
        `${mockServer.url}/api/cart`,
        { productId: 1, quantity: 2 },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
        }
      );

      expect(response.status).toEqual(201);
      expect(response.data.productId).toEqual(1);
      expect(response.data.quantity).toEqual(2);
    });
  });
});
