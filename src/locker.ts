import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export class PrismaTransactionLocker {
  private resolveFunc?: () => void;

  async wait(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.resolveFunc = resolve;
    });
  }

  commit(): void {
    if (this.resolveFunc) {
      this.resolveFunc();
      this.resolveFunc = undefined;
    }
  }

  rollback(): void {
    throw new PrismaClientKnownRequestError(
      "Current transaction is aborted, commands ignored until end of transaction block",
      { code: "P2028", clientVersion: "unknown" },
    );
  }
}
