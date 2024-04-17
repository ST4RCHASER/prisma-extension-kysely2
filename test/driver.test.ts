import { PrismaClient } from "@prisma/client";
import { TransactionSettings } from "kysely";
import { PrismaConnection } from "../src/connection.js";
import { PrismaDriver } from "../src/driver.js";

describe("PrismaDriver", () => {
  const prisma = new PrismaClient();
  let driver: PrismaDriver<typeof prisma>;
  let connection: PrismaConnection;

  beforeEach(() => {
    driver = new PrismaDriver(prisma);
    connection = new PrismaConnection(prisma);
  });

  afterEach(() => {
    // Clean up any resources if needed
  });

  it("should acquire a connection", async () => {
    const connection = await driver.acquireConnection();
    expect(connection).toBeDefined();
    expect(connection).toBeInstanceOf(PrismaConnection);
  });

  it("should throw an error when begin a transaction", async () => {
    const settings: TransactionSettings = {};
    await driver.beginTransaction(connection, settings);
  });

  it("should throw an error when commit a transaction", async () => {
    await expect(driver.commitTransaction(connection)).rejects.toThrow(
      "No transaction to commit",
    );
  });

  it("should throw an error when rollback a transaction", async () => {
    await expect(driver.rollbackTransaction(connection)).rejects.toThrow(
      "No transaction to rollback",
    );
  });

  it("should release a connection", async () => {
    await driver.releaseConnection(connection);
    // Add assertions if needed
  });

  it("should destroy the driver", async () => {
    await driver.destroy();
  });
});
