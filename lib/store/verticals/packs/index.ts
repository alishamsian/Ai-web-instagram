import { registerVerticals } from "@/lib/store/verticals/registry";
import { beautyPack } from "@/lib/store/verticals/packs/beauty";
import { fashionPack } from "@/lib/store/verticals/packs/fashion";
import { jewelryPack } from "@/lib/store/verticals/packs/jewelry";
import { coffeePack } from "@/lib/store/verticals/packs/coffee";
import { furniturePack } from "@/lib/store/verticals/packs/furniture";
import { genericPack } from "@/lib/store/verticals/packs/generic";

export const CORE_VERTICAL_PACKS = [
  genericPack,
  beautyPack,
  fashionPack,
  jewelryPack,
  coffeePack,
  furniturePack,
] as const;

/** Seed once at module load — lightweight metadata only. */
registerVerticals([...CORE_VERTICAL_PACKS]);

export {
  beautyPack,
  fashionPack,
  jewelryPack,
  coffeePack,
  furniturePack,
  genericPack,
};
