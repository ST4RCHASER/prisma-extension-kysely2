import type { PrismaClient } from "@prisma/client/extension";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { DatabaseConnection, Driver, TransactionSettings } from "kysely";
import { PrismaTransactionLocker } from "./locker";
import { PrismaConnection } from "./connection";

export class PrismaDriver<T extends PrismaClient> implements Driver {
  private readonly prisma;

  constructor(client: T) {
    this.prisma = client;
  }

  async init(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Javascript don't know how to convert bigint to json,
    // so we need to do it manually by convert it to string and convert it back to number
    BigInt.prototype.toJSON = function () {
      return isNaN(+this.toString()) ? this.toString() : +this.toString();
    };
  }

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
