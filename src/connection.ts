import { PrismaClient } from "@prisma/client/extension";
import {
  CompiledQuery,
  DatabaseConnection,
  DeleteQueryNode,
  InsertQueryNode,
  QueryResult,
  RootOperationNode,
  TransactionSettings,
  UpdateQueryNode,
} from "kysely";
import { PrismaTransactionLocker } from "./locker";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const IsolationLevels = {
  "read uncommitted": "ReadUncommitted",
  "read committed": "ReadCommitted",
  "repeatable read": "RepeatableRead",
  serializable: "Serializable",
  snapshot: "Snapshot",
};

export class PrismaConnection implements DatabaseConnection {
  #client: PrismaClient;
  #transactionClient: PrismaConnection | null = null;
  #transactionLocker = new PrismaTransactionLocker();

  constructor(client: PrismaClient) {
    this.#client = client;
  }

  isExecute(query: RootOperationNode) {
    return (
      (DeleteQueryNode.is(query) ||
        UpdateQueryNode.is(query) ||
        InsertQueryNode.is(query)) &&
      !query.returning
    );
  }

  async executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
    if (this.#transactionClient) {
      return this.#transactionClient.executeQuery(compiledQuery);
    }

    const results: number | string = await (this.#client as PrismaClient)[
      this.isExecute(compiledQuery.query)
        ? "$executeRawUnsafe"
        : "$queryRawUnsafe"
    ](compiledQuery.sql, ...compiledQuery.parameters);
    const numAffectedRows = !isNaN(+results) ? +results : 0;

    return {
      rows: results as unknown as O[],
      // @ts-expect-error replaces `QueryResult.numUpdatedOrDeletedRows` in kysely > 0.22
      // following https://github.com/koskimas/kysely/pull/188
      numAffectedRows,
      // deprecated in kysely > 0.22, keep for backward compatibility.
      numUpdatedOrDeletedRows: BigInt(numAffectedRows),
    };
  }

  async beginTransaction(settings: TransactionSettings) {
    this.#transactionClient =
      this.#transactionClient ??
      (await new Promise<PrismaConnection>((resolve) => {
        this.#client.$transaction(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          async (tx: any) => {
            resolve(new PrismaConnection(tx as PrismaClient)); // assume as PrismaClient
            await this.#transactionLocker.wait();
          },
          settings.isolationLevel && {
            isolationLevel: IsolationLevels[settings.isolationLevel],
          },
        );
      }));
  }

  async commitTransaction() {
    if (!this.#transactionClient) {
      throw new PrismaClientKnownRequestError("No transaction to commit", {
        code: "P2028",
        clientVersion: "unknown",
      });
    }
    try {
      this.#transactionLocker.commit();
    } finally {
      this.#transactionClient = null;
    }
  }

  async rollbackTransaction() {
    if (!this.#transactionClient) {
      throw new PrismaClientKnownRequestError("No transaction to rollback", {
        code: "P2028",
        clientVersion: "unknown",
      });
    }
    try {
      this.#transactionLocker.rollback();
    } finally {
      this.#transactionClient = null;
    }
  }

  // eslint-disable-next-line require-yield
  async *streamQuery<O>(
    _compiledQuery: CompiledQuery,
    _chunkSize: number,
  ): AsyncIterableIterator<QueryResult<O>> {
    //Have no idea how can i implement this
    throw new PrismaClientKnownRequestError(
      "Prisma Dialect does not support streaming for now",
      { code: "P6006", clientVersion: "unknown" },
    );
  }
}
