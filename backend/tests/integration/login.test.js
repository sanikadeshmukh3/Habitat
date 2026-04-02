const request = require('supertest');
const app = require('../../server');

describe('Login route', () => {
  it('returns 400 when email or password is missing', async () => {
    const res = await request(app)
      .post('/login')
      .send({
        email: '',
        password: '',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });
});