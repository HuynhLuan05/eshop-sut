const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const axios = require('axios');
const path = require('path');

const { regex, eachLike, integer, string, number } = MatchersV3;

const provider = new PactV3({
  consumer: 'EshopConsumer',
  provider: 'EShopBackend',
  dir: path.resolve(process.cwd(), 'pacts'),
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  logLevel: process.env.PACT_LOG_LEVEL || 'info',
});

describe('GET /api/products', () => {
  it('returns a list of products', async () => {
    provider.addInteraction({
      states: [{ description: 'products exist in database' }],
      uponReceiving: 'a request to get all products',
      withRequest: {
        method: 'GET',
        path: '/api/products',
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': regex({ generate: 'application/json', matcher: '^application/json.*' }) },
        body: eachLike({
          id: integer(1),
          name: string('iPhone 15'),
          price: number(25000000),
        }),
      },
    });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/products`);
      expect(response.status).toEqual(200);
      expect(Array.isArray(response.data)).toBeTruthy();
      expect(response.data[0]).toHaveProperty('id');
      expect(response.data[0]).toHaveProperty('name');
      expect(response.data[0]).toHaveProperty('price');
    });
  });

  it('returns 404 when product ID does not exist', async () => {
    provider.addInteraction({
      states: [{ description: 'product with ID 9999 does not exist' }],
      uponReceiving: 'a request to get a non-existent product',
      withRequest: {
        method: 'GET',
        path: '/api/products/9999',
      },
      willRespondWith: {
        status: 404,
        headers: { 'Content-Type': regex({ generate: 'application/json', matcher: '^application/json.*' }) },
        body: {
          error: MatchersV3.like('Product not found'),
        },
      },
    });

    await provider.executeTest(async (mockServer) => {
      try {
        await axios.get(`${mockServer.url}/api/products/9999`);
      } catch (error) {
        expect(error.response.status).toEqual(404);
      }
    });
  });
});
