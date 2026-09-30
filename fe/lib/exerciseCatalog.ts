import catalogJson from "@/lib/data/exerciseCatalog.json";

export const EXERCISE_MEDIA_BASE =
  "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/";
export const EXERCISE_ATTRIBUTION = "© Gym visual — https://gymvisual.com/";

export interface CatalogExercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  target: string;
  muscleGroup: string;
  steps: string[];
  gif: string;
  thumb: string;
}

export const EXERCISE_CATALOG = catalogJson as CatalogExercise[];

export const CATALOG_CATEGORIES = [
  "chest",
  "back",
  "shoulders",
  "upper arms",
  "lower arms",
  "upper legs",
  "lower legs",
  "waist",
  "cardio",
  "neck",
] as const;

const byId = new Map(EXERCISE_CATALOG.map((ex) => [ex.id, ex]));
const byName = new Map(EXERCISE_CATALOG.map((ex) => [ex.name.toLowerCase(), ex]));

export function catalogGifUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${EXERCISE_MEDIA_BASE}${path}`;
}

export function getCatalogById(id: string | null | undefined) {
  if (!id) return null;
  return byId.get(id) ?? null;
}

export function findCatalogByName(name: string | null | undefined) {
  if (!name) return null;
  return byName.get(name.trim().toLowerCase()) ?? null;
}

export function resolveCatalogMedia(
  name: string,
  catalogId?: string | null,
  gifUrl?: string | null,
  thumbnailUrl?: string | null
) {
  const cat = (catalogId && byId.get(catalogId)) || findCatalogByName(name);
  return {
    catalogId: catalogId || cat?.id || null,
    gifUrl: gifUrl || (cat ? catalogGifUrl(cat.gif) : null),
    thumbnailUrl: thumbnailUrl || (cat ? catalogGifUrl(cat.thumb) : null),
    steps: cat?.steps ?? [],
    category: cat?.category ?? "",
    equipment: cat?.equipment ?? "",
    target: cat?.target ?? "",
  };
}

export function searchCatalog(
  query: string,
  category = "ALL",
  equipment = "ALL",
  limit = 36
) {
  const q = query.trim().toLowerCase();
  const results: CatalogExercise[] = [];
  for (const ex of EXERCISE_CATALOG) {
    if (category !== "ALL" && ex.category !== category) continue;
    if (equipment !== "ALL" && ex.equipment !== equipment) continue;
    if (q && !ex.name.toLowerCase().includes(q) && !ex.target.toLowerCase().includes(q) && !ex.equipment.toLowerCase().includes(q)) {
      continue;
    }
    results.push(ex);
    if (results.length >= limit) break;
  }
  return results;
}
