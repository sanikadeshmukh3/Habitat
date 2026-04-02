const request = require('supertest');
const app = require('../../server');

describe('Protected routes', () => {
  it('rejects GET /protected without a token', async () => {
    const res = await request(app).get('/protected');

    expect([401, 403]).toContain(res.statusCode);
  });
});