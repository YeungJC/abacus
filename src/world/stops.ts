/**
 * The street, laid out along -z. You enter at the gate (z ≈ 16) and walk towards the gala
 * stage at the far end. Shopfronts stand at x = ±HALF.
 *
 * Each stop is a place with content: where you stand (`at`), what you look at (`look`),
 * and what its sign says.
 */
export const HALF = 4.5;
export const EYE = 1.65;
export const Z_START = 18;
export const Z_END = -52;

export type StopId = "gate" | "hk" | "mabc" | "uabc" | "echo" | "yours" | "board" | "pass" | "exit" | "teahouse" | "gala";

export type Stop = {
  id: StopId;
  /** street side of the building: -1 left, 1 right, 0 across the street */
  side: -1 | 0 | 1;
  /** z of the building's centre */
  z: number;
  /** frontage width along the street */
  w: number;
  zh: string;
  en: string;
  /** where you stand */
  at: [number, number];
  /** what you look at */
  look: [number, number, number];
};

const front = (side: -1 | 1, z: number): Pick<Stop, "at" | "look"> => ({
  // stand across the street, a little back, so the whole shopfront fits
  at: [-side * 1.7, z + 2.6],
  look: [side * HALF, 2.6, z],
});

export const STOPS: Stop[] = [
  { id: "gate", side: 0, z: 10, w: 9, zh: "牌坊", en: "Welcome", at: [0, 17], look: [0, 3.4, 8] },
  { id: "hk", side: -1, z: -0.5, w: 5, zh: "香港學會", en: "Hong Kong Society", ...front(-1, -0.5) },
  { id: "mabc", side: 1, z: -4.5, w: 5, zh: "都大算盤社", en: "MMU ABACUS", ...front(1, -4.5) },
  { id: "uabc", side: -1, z: -9, w: 5, zh: "曼大算盤社", en: "UoM ABACUS", ...front(-1, -9) },
  { id: "echo", side: 1, z: -13, w: 5, zh: "華韻社", en: "Echoes of China", ...front(1, -13) },
  { id: "yours", side: -1, z: -17.5, w: 4.5, zh: "空舖", en: "Your society next", ...front(-1, -17.5) },
  { id: "board", side: 1, z: -22, w: 6, zh: "告示板", en: "What's on", ...front(1, -22) },
  { id: "pass", side: -1, z: -27, w: 5.5, zh: "紅包檔", en: "Joint Pass", ...front(-1, -27) },
  { id: "exit", side: 1, z: -32.5, w: 5.5, zh: "出口", en: "Freshers guide", ...front(1, -32.5) },
  { id: "teahouse", side: -1, z: -37.5, w: 6, zh: "茶樓", en: "Committee almanac", ...front(-1, -37.5) },
  { id: "gala", side: 0, z: -48, w: 9, zh: "新春晚會", en: "Lunar New Year Gala", at: [0, -41], look: [0, 3.4, -48] },
];

export const stopById = (id: StopId) => STOPS.find((s) => s.id === id)!;
