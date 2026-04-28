const request = require("supertest");
const app = require("../../server");
const prisma = require("../../lib/prisma");

jest.setTimeout(20000);

async function createUser(email) {
  return prisma.user.create({
    data: {
      email,
      password: "hashedpassword",
      firstName: "Test",
      lastName: "User",
      username: email.split("@")[0] + Math.floor(Math.random() * 100000),
      isVerified: true,
    },
  });
}

async function cleanup() {
  try {
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { sender: {
            OR: [
              { email: { contains: "user1_" } },
              { email: { contains: "user2_" } },
            ],
          }, },
          { receiver: {
            OR: [
              { email: { contains: "user1_" } },
              { email: { contains: "user2_" } },
            ],
          }, },
        ]
      },
    });
    await prisma.habitCheckIn.deleteMany({
      where: {
        habit: {
          user: {
            OR: [
              { email: { contains: "user1_" } },
              { email: { contains: "user2_" } },
            ],
          },
        }

      },
    });
    await prisma.habit.deleteMany({
      where: {
        user: {
          OR: [
            { email: { contains: "user1_" } },
            { email: { contains: "user2_" } },
          ],
        },
      },
    });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { contains: "user1_" } },
        { email: { contains: "user2_" } },
      ],
    },
  });
  } catch (err) {
    console.error("Cleanup failed:", err);
  }
}

describe("Friend System Integration Tests", () => {
  let user1, user2;

  beforeEach(async () => {
    await cleanup();

    const id = Date.now();

    user1 = await createUser(`user1_${id}@test.com`);
    user2 = await createUser(`user2_${id}@test.com`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should complete full friend lifecycle (request → accept → friends)", async () => {
    const reqRes = await request(app)
      .post("/friend/request")
      .send({
        senderId: user1.id,
        friendId: user2.id,
      });

    expect(reqRes.statusCode).toBe(200);

    const pending = await request(app)
      .get("/friend/requests")
      .query({ userId: user2.id });

    expect(pending.statusCode).toBe(200);
    expect(pending.body.length).toBe(1);

    const requestId = pending.body[0].id;

    const acceptRes = await request(app)
      .post("/friend/accept")
      .send({ requestId });

    expect(acceptRes.statusCode).toBe(200);

    const statusRes = await request(app)
      .get("/friend/status")
      .query({
        userId: user1.id,
        friendId: user2.id,
      });

    expect(statusRes.body.status).toBe("friends");
  });

  it("should not allow duplicate friend requests", async () => {
    await request(app).post("/friend/request").send({
      senderId: user1.id,
      friendId: user2.id,
    });

    const res = await request(app).post("/friend/request").send({
      senderId: user1.id,
      friendId: user2.id,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("should not allow request if already friends", async () => {
    await prisma.user.update({
      where: { id: user1.id },
      data: {
        friends: {
          connect: { id: user2.id },
        },
      },
    });

    const res = await request(app).post("/friend/request").send({
      senderId: user1.id,
      friendId: user2.id,
    });

    expect(res.statusCode).toBe(400);
  });

  it("should reject a friend request", async () => {
    await request(app).post("/friend/request").send({
      senderId: user1.id,
      friendId: user2.id,
    });

    const pending = await request(app)
      .get("/friend/requests")
      .query({ userId: user2.id });

    const requestId = pending.body[0].id;

    const rejectRes = await request(app)
      .post("/friend/reject")
      .send({ requestId });

    expect(rejectRes.statusCode).toBe(200);

    const status = await request(app)
      .get("/friend/status")
      .query({
        userId: user1.id,
        friendId: user2.id,
      });

    expect(status.body.status).toBe("none");
  });

  it("should not allow sending friend request to self", async () => {
    const res = await request(app)
      .post("/friend/request")
      .send({
        senderId: user1.id,
        friendId: user1.id,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("should remove a friend after being accepted", async () => {
    await request(app).post("/friend/request").send({
      senderId: user1.id,
      friendId: user2.id,
    });

    const pending = await request(app)
      .get("/friend/requests")
      .query({ userId: user2.id });

    const requestId = pending.body[0].id;

    await request(app).post("/friend/accept").send({ requestId });

    const removeRes = await request(app)
      .post("/friend/remove")
      .send({
        userId: user1.id,
        friendId: user2.id,
      });

    expect(removeRes.statusCode).toBe(200);

    const status = await request(app)
      .get("/friend/status")
      .query({
        userId: user1.id,
        friendId: user2.id,
      });

    expect(status.body.status).toBe("none");
  });

  it("should return correct friend status transitions", async () => {
    let res = await request(app)
      .get("/friend/status")
      .query({
        userId: user1.id,
        friendId: user2.id,
      });

    expect(res.body.status).toBe("none");

    await request(app).post("/friend/request").send({
      senderId: user1.id,
      friendId: user2.id,
    });

    res = await request(app)
      .get("/friend/status")
      .query({
        userId: user1.id,
        friendId: user2.id,
      });

    expect(res.body.status).toBe("requested");

    const pending = await request(app)
      .get("/friend/requests")
      .query({ userId: user2.id });

    const requestId = pending.body[0].id;

    await request(app).post("/friend/accept").send({ requestId });

    res = await request(app)
      .get("/friend/status")
      .query({
        userId: user1.id,
        friendId: user2.id,
      });

    expect(res.body.status).toBe("friends");
  });

  it("should handle invalid user IDs gracefully", async () => {
    const res = await request(app)
      .get("/friend/status")
      .query({
        userId: "invalid",
        friendId: "invalid",
      });

    expect([400, 500]).toContain(res.statusCode);
  });
});