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
        headers: { 'Content-Type': regex('^application/json.*', 'application/json') },
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
      expect(typeof response.data[0].price).toBe('number');
    });
  });

  it('returns products when searching for iPhone', async () => {
    provider.addInteraction({
      states: [{ description: 'products exist in database' }],
      uponReceiving: 'a request to search products by name iPhone',
      withRequest: {
        method: 'GET',
        path: '/api/products',
        query: { search: 'iPhone' }
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': regex('^application/json.*', 'application/json') },
        body: eachLike({
          id: integer(1),
          name: MatchersV3.string('iPhone 15'),
          price: number(25000000),
        }),
      },
    });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/products?search=iPhone`);
      expect(response.status).toEqual(200);
      expect(Array.isArray(response.data)).toBeTruthy();
      expect(response.data[0].name).toContain('iPhone');
    });
  });

  it('returns empty array when search has no results', async () => {
    provider.addInteraction({
      states: [{ description: 'products exist in database' }],
      uponReceiving: 'a request to search products with no results',
      withRequest: {
        method: 'GET',
        path: '/api/products',
        query: { search: 'XYZNONEXIST' }
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': regex('^application/json.*', 'application/json') },
        body: [],
      },
    });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/products?search=XYZNONEXIST`);
      expect(response.status).toEqual(200);
      expect(response.data).toEqual([]);
    });
  });

  it('returns products when search query is empty', async () => {
    provider.addInteraction({
      states: [{ description: 'products exist in database' }],
      uponReceiving: 'a request to search products with empty query',
      withRequest: {
        method: 'GET',
        path: '/api/products',
        query: { search: '' }
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': regex('^application/json.*', 'application/json') },
        body: eachLike({
          id: integer(1),
          name: string('iPhone 15'),
          price: number(25000000),
        }),
      },
    });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/products?search=`);
      expect(response.status).toEqual(200);
      expect(Array.isArray(response.data)).toBeTruthy();
      expect(response.data.length).toBeGreaterThan(0);
    });
  });

  it('returns product details with number price for odd ID', async () => {
    provider.addInteraction({
      states: [{ description: 'product with ID 1 exists' }],
      uponReceiving: 'a request to get product details for odd ID',
      withRequest: {
        method: 'GET',
        path: '/api/products/1',
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': regex('^application/json.*', 'application/json') },
        body: {
          id: integer(1),
          name: string('iPhone 15'),
          price: number(25000000),
        },
      },
    });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/products/1`);
      expect(response.status).toEqual(200);
      expect(response.data.id).toEqual(1);
      expect(typeof response.data.price).toBe('number');
    });
  });

  it('returns product details with string price for even ID (Bug)', async () => {
    provider.addInteraction({
      states: [{ description: 'product with ID 2 exists' }],
      uponReceiving: 'a request to get product details for even ID',
      withRequest: {
        method: 'GET',
        path: '/api/products/2',
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': regex('^application/json.*', 'application/json') },
        body: {
          id: integer(2),
          name: string('Samsung S24'),
          price: string('20000000'), // Bug in server: returns string
        },
      },
    });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/products/2`);
      expect(response.status).toEqual(200);
      expect(response.data.id).toEqual(2);
      expect(typeof response.data.price).toBe('string');
    });
  });

  it('returns 200 and empty object when ID does not exist (Bug)', async () => {
    provider.addInteraction({
      states: [{ description: 'product with ID 99999 does not exist' }],
      uponReceiving: 'a request to get a non-existent product',
      withRequest: {
        method: 'GET',
        path: '/api/products/99999',
      },
      willRespondWith: {
        status: 200, // Bug: should be 404
        headers: { 'Content-Type': regex('^application/json.*', 'application/json') },
        body: {},
      },
    });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/products/99999`);
      expect(response.status).toEqual(200);
      expect(response.data).toEqual({});
    });
  });

  it('handles invalid string ID', async () => {
    provider.addInteraction({
      states: [{ description: 'system is running' }],
      uponReceiving: 'a request to get a product with string ID abc',
      withRequest: {
        method: 'GET',
        path: '/api/products/abc',
      },
      willRespondWith: {
        status: 200, // Assuming server behaves the same as non-existent ID or has a bug
        headers: { 'Content-Type': regex('^application/json.*', 'application/json') },
        body: {},
      },
    });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/products/abc`);
      expect(response.status).toEqual(200);
    });
  });
});
