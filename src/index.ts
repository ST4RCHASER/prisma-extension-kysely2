import { Prisma } from "@prisma/client/extension";
import { Dialect, Kysely, KyselyConfig, KyselyPlugin, LogConfig } from "kysely";

import { PrismaDialect } from "./dialect";

interface KyselyConfigLike {
  dialect?: Dialect;
  readonly plugins?: KyselyPlugin[];
  readonly log?: LogConfig;
}

const prismaKysely = <T>(extensionArgs?: KyselyConfigLike) =>
  Prisma.defineExtension((client) => {
    if (!extensionArgs?.dialect) {
      if (!extensionArgs) {
        extensionArgs = {} as KyselyConfig;
      }
      extensionArgs.dialect = new PrismaDialect(client);
    }
    const kyselyClient = new Kysely<T>(extensionArgs as KyselyConfig);
    const extendedClient = client.$extends({
      name: "prisma-kysely-extension",
      client: {
        $kysely: kyselyClient,
      },
    });

    // [START] Taken from https://github.com/eoin-obrien/prisma-extension-kysely/blob/90fcdc989af307571a09652f6fedeb548ebd8d57/src/index.ts#L17
    const kyselyTransaction =
      (target: typeof extendedClient) =>
      (...args: Parameters<typeof target.$transaction>) => {
        if (typeof args[0] === "function") {
          const [fn, options] = args;

          return target.$transaction((tx) => {
            const kysely = new Kysely<T>({
              ...(extensionArgs as KyselyConfig),
              dialect: new PrismaDialect(tx),
            });
            tx.$kysely = kysely as unknown as typeof tx.$kysely;

            return (fn as (typeof target.$transaction.arguments)[0])(tx);
          }, options);
        } else {
          return target.$transaction(...args);
        }
      };

    const extendedClientProxy = new Proxy(extendedClient, {
      get: (target, prop, receiver) => {
        if (prop === "$transaction") {
          return kyselyTransaction(target);
        }

        return Reflect.get(target, prop, receiver);
      },
    });

    return extendedClientProxy;
  });
// [END] Taken from https://github.com/eoin-obrien/prisma-extension-kysely/blob/90fcdc989af307571a09652f6fedeb548ebd8d57/src/index.ts#L17

export default prismaKysely;
