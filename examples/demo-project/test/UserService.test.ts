import { describe, expect, it } from "vitest";
import { UserService } from "../src/UserService";

describe("UserService", () => {
  it("returns the first user name", async () => {
    const service = new UserService({ get: async () => ({ data: [{ id: "1", name: "Ada" }] }) });
    await expect(service.firstUserName()).resolves.toBe("Ada");
  });

  it.skip("handles an empty API response", async () => {
    const service = new UserService({ get: async () => ({}) });
    await expect(service.firstUserName()).resolves.toBe("Unknown user");
  });
});
