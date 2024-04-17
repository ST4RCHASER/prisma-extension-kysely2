import type { PrismaClient } from "@prisma/client/extension";
import {
  DatabaseIntrospector,
  Dialect,
  Driver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  QueryCompiler,
} from "kysely";
import { PrismaDriver } from "./driver.js";

export class PrismaDialect<T extends PrismaClient> implements Dialect {
  private readonly prisma;
  driver: Driver;

  constructor(client: T, driver: PrismaDriver<T> = new PrismaDriver(client)) {
    this.prisma = client;
    this.driver = driver;
  }

  createAdapter() {
    return new PostgresAdapter();
  }

  createDriver(): Driver {
    return this.driver ? this.driver : new PrismaDriver(this.prisma);
  }

  createQueryCompiler(): QueryCompiler {
    return new PostgresQueryCompiler();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new PostgresIntrospector(db);
  }
}
