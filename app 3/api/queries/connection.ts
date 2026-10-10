import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "../../db/schema";

let instance: ReturnType<typeof createDb> | undefined;

function createDb() {
  return drizzle({ schema });
}

export function getDb() {
  instance ??= createDb();
  return instance;
}
