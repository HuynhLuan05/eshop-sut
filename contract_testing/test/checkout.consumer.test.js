const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const axios = require('axios');
const path = require('path');

const { regex, integer } = MatchersV3;

const provider = new PactV3({
  consumer: 'EshopConsumer',
  provider: 'EShopBackend',
  dir: path.resolve(process.cwd(), 'pacts'),
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  logLevel: process.env.PACT_LOG_LEVEL || 'info',
});

describe('POST /api/checkout', () => {
  it('successfully processes checkout and returns orderId', async () => {
    provider.addInteraction({
      states: [{ description: 'cart has items ready for checkout' }],
      uponReceiving: 'a request to checkout',
      withRequest: {
        method: 'POST',
        path: '/api/checkout',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        body: {
          total_amount: 200000,
          shipping_address: '123 Le Loi, TP.HCM',
        },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': regex({ generate: 'application/json', matcher: '^application/json.*' }) },
        body: {
          message: MatchersV3.like('Checkout successful'),
          orderId: integer(101),
        },
      },
    });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.post(
        `${mockServer.url}/api/checkout`,
        { total_amount: 200000, shipping_address: '123 Le Loi, TP.HCM' },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
        }
      );

      expect(response.status).toEqual(200);
      expect(response.data.orderId).toBeDefined();
    });
  });
});
