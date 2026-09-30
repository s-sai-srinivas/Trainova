import { EXERCISE_CATALOG, getCatalogById, searchCatalog } from "./exerciseCatalog";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(EXERCISE_CATALOG.length === 1324, `expected 1324, got ${EXERCISE_CATALOG.length}`);
assert(getCatalogById("0025")?.name.toLowerCase().includes("bench"), "bench press missing");
assert(searchCatalog("squat", "upper legs").length > 0, "squat search empty");
assert(searchCatalog("zzzz-nope").length === 0, "junk search should be empty");
console.log("exerciseCatalog self-check ok");
