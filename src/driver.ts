import type { PrismaClient } from "@prisma/client/extension";
import { DatabaseConnection, Driver, TransactionSettings } from "kysely";
import { PrismaConnection } from "./connection";

export class PrismaDriver<T extends PrismaClient> implements Driver {
  private readonly prisma;

  constructor(client: T) {
    this.prisma = client;
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<DatabaseConnection> {
    return new PrismaConnection(this.prisma);
  }

  async beginTransaction(
    conn: PrismaConnection,
    settings: TransactionSettings,
  ): Promise<void> {
    return conn.beginTransaction(settings);
  }

  async commitTransaction(conn: PrismaConnection): Promise<void> {
    return conn.commitTransaction();
  }

  async rollbackTransaction(conn: PrismaConnection): Promise<void> {
    return conn.rollbackTransaction();
  }

  async releaseConnection(_conn: PrismaConnection): Promise<void> {}

  async destroy(): Promise<void> {}
}
