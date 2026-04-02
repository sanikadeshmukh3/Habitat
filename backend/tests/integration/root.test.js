const request = require('supertest');
const app = require('../../server'); // or ../../app if you ended up splitting files

describe('Basic server routes', () => {
  it('GET /test returns ok', async () => {
    const res = await request(app).get('/test');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});