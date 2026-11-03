export type WorldId = "aetheria" | "evergreen" | "dragonfall" | "eldoria" | "umbracia";
export type SceneId = WorldId | "hub";
export type TimeOfDay = "day" | "sunset" | "night";
export type Weather = "clear" | "mist" | "rain" | "snow" | "storm";
export type V3 = [number, number, number];

export type DiscoveryKind = "crystal" | "book" | "temple" | "nest" | "tree" | "statue" | "chamber" | "inscription" | "artifact";
export type BurstEffect = "sparkle" | "rings" | "embers" | "runes" | "void";

export interface DiscoveryDef {
  id: string;
  world: WorldId;
  title: string;
  kind: DiscoveryKind;
  /** if ground is true, y is an offset above the terrain */
  pos: V3;
  ground?: boolean;
  color: string;
  effect: BurstEffect;
  lore: string;
}

export interface CinePath {
  pos: V3[];
  look: V3[];
  /** y values are offsets above terrain (walking worlds) */
  relative?: boolean;
  /** seconds per full loop */
  loop: number;
}

export interface WorldDef {
  id: WorldId;
  index: number;
  name: string;
  subtitle: string;
  blurb: string;
  accent: string;
  accent2: string;
  weathers: Weather[];
  spawn: { pos: V3; look: V3 };
  cine: CinePath;
}

export const WORLD_ORDER: WorldId[] = ["aetheria", "evergreen", "dragonfall", "eldoria", "umbracia"];

export const WORLDS: Record<WorldId, WorldDef> = {
  aetheria: {
    id: "aetheria",
    index: 1,
    name: "Aetheria",
    subtitle: "The Floating Kingdom",
    blurb: "A kingdom of marble spires and crystal gardens adrift above an ocean of clouds, ruled from a colossal sky-castle.",
    accent: "#8fd0ff",
    accent2: "#ffe7a8",
    weathers: ["clear", "mist", "rain", "storm"],
    spawn: { pos: [0, 40, 125], look: [0, 32, 0] },
    cine: {
      loop: 150,
      pos: [[0, 45, 140], [90, 60, 90], [150, 30, 0], [110, 15, -100], [0, 50, -150], [-120, 35, -80], [-150, 20, 40], [-80, 40, 120]],
      look: [[0, 35, 0], [10, 32, 0], [0, 40, 10], [0, 30, 0], [0, 38, 0], [0, 33, 0], [0, 36, 10], [0, 32, 0]],
    },
  },
  evergreen: {
    id: "evergreen",
    index: 2,
    name: "Evergreen",
    subtitle: "The Enchanted Forest",
    blurb: "An ancient wood that remembers every footstep, lit by living light and watched over by one impossibly vast sacred tree.",
    accent: "#7dffb0",
    accent2: "#c8ff7a",
    weathers: ["clear", "mist", "rain"],
    spawn: { pos: [42, 0, 70], look: [0, 30, 0] },
    cine: {
      loop: 140,
      relative: true,
      pos: [[50, 6, 80], [0, 4, 62], [-45, 8, 35], [-62, 14, -20], [-30, 30, -55], [30, 18, -50], [62, 10, 0]],
      look: [[0, 30, 0], [0, 45, 0], [0, 40, 0], [0, 35, 0], [0, 45, 0], [0, 35, 0], [0, 35, 0]],
    },
  },
  dragonfall: {
    id: "dragonfall",
    index: 3,
    name: "Dragonfall",
    subtitle: "The Land of Dragons",
    blurb: "Burning skies, rivers of lava and cathedral-sized peaks, where ancient dragons still rule the thermals.",
    accent: "#ff7a3a",
    accent2: "#ffc36a",
    weathers: ["clear", "mist", "snow", "storm"],
    spawn: { pos: [-20, 50, 180], look: [0, 40, 0] },
    cine: {
      loop: 160,
      pos: [[-30, 40, 200], [20, 30, 100], [-10, 25, 20], [40, 45, -80], [0, 70, -180], [-80, 90, -100], [-100, 70, 0], [-60, 60, 100]],
      look: [[-70, 30, 30], [0, 40, 0], [30, 30, -100], [0, 60, -200], [-70, 50, -50], [0, 40, 0], [-70, 40, 30], [0, 30, 60]],
    },
  },
  eldoria: {
    id: "eldoria",
    index: 4,
    name: "Eldoria",
    subtitle: "The Ancient Kingdom",
    blurb: "A drowned-in-green empire of statues, libraries and sealed vaults. Every ruin is a sentence in a story left unfinished.",
    accent: "#ffcf7a",
    accent2: "#7fe3d0",
    weathers: ["clear", "mist", "rain", "storm"],
    spawn: { pos: [0, 0, 72], look: [0, 18, -35] },
    cine: {
      loop: 140,
      relative: true,
      pos: [[0, 5, 90], [0, 5, 40], [-20, 6, 0], [0, 8, -60], [35, 6, -30], [70, 6, 10], [40, 8, 60]],
      look: [[0, 25, -35], [20, 20, -35], [0, 20, -70], [0, 30, -110], [-20, 15, -35], [70, 10, -30], [0, 15, -20]],
    },
  },
  umbracia: {
    id: "umbracia",
    index: 5,
    name: "Umbracia",
    subtitle: "The Shadow Dimension",
    blurb: "A fracture in reality where gravity forgets itself, the sea is black glass and something vast watches from the rift.",
    accent: "#b07cff",
    accent2: "#5ad0ff",
    weathers: ["clear", "mist", "storm"],
    spawn: { pos: [0, 35, 150], look: [0, 40, 0] },
    cine: {
      loop: 150,
      pos: [[0, 60, 140], [120, 50, 60], [150, 80, -60], [40, 100, -150], [-130, 70, -90], [-130, 40, 40], [-60, 55, 120]],
      look: [[0, 45, 0], [0, 40, 0], [0, 45, 0], [0, 40, 0], [0, 45, 0], [0, 40, 0], [0, 45, 0]],
    },
  },
};

export const HUB = {
  name: "The Convergence",
  subtitle: "Hub of the Five Gates",
  spawn: { pos: [0, 3.4, 40] as V3, look: [0, 8, 0] as V3 },
  cine: {
    loop: 90,
    pos: [[0, 14, 62], [50, 18, 36], [62, 12, -10], [30, 22, -50], [-30, 16, -52], [-62, 12, -8], [-48, 18, 40]] as V3[],
    look: [[0, 8, 0], [0, 8, 0], [0, 8, 0], [0, 8, 0], [0, 8, 0], [0, 8, 0], [0, 8, 0]] as V3[],
  } satisfies CinePath,
  R: 26,
};

export function portalPose(id: WorldId) {
  const i = WORLD_ORDER.indexOf(id);
  const phi = ((i - 2) * 72 * Math.PI) / 180;
  const x = Math.sin(phi) * HUB.R;
  const z = -Math.cos(phi) * HUB.R;
  // outward = away from the centre
  const nx = x / HUB.R;
  const nz = z / HUB.R;
  return { x, z, phi, nx, nz };
}

export const INTRO_PATH = {
  pos: [[-50, -90, 280], [-20, -68, 230], [30, -30, 205], [75, 6, 190], [130, 30, 150], [110, 38, 100], [60, 34, 125], [20, 34, 125]] as V3[],
  look: [[-30, -40, 100], [0, -10, 120], [30, 10, 100], [60, 25, 80], [40, 35, 40], [10, 38, 10], [0, 38, 0], [0, 38, 0]] as V3[],
  duration: 34,
};

/* ------------------------------ DISCOVERIES ------------------------------ */
export const DISCOVERIES: DiscoveryDef[] = [
  {
    id: "aeth-heart",
    world: "aetheria",
    title: "The Sunstone Heart",
    kind: "crystal",
    pos: [38, 4, 12],
    color: "#ffd98a",
    effect: "sparkle",
    lore: "Every island of Aetheria floats because a shard of this stone sings beneath it. The castle-builders say the Heart beats once a century, and when it does the whole kingdom rises one hand's-breadth higher toward the sun.",
  },
  {
    id: "aeth-archive",
    world: "aetheria",
    title: "The Skyward Archive",
    kind: "book",
    pos: [95, 12, 70],
    color: "#9fd8ff",
    effect: "runes",
    lore: "The last Archivist bound the wind itself into this book. Its pages turn only when the weather changes, and every storm adds a line no living hand has written.",
  },
  {
    id: "aeth-sigil",
    world: "aetheria",
    title: "Gatewarden's Sigil",
    kind: "artifact",
    pos: [0, 5, 42],
    color: "#ffe7a8",
    effect: "rings",
    lore: "The Sky-Kings never locked their gates. They hung this sigil above the threshold instead: those who enter with a quarrel in their heart find the stair to the throne room has quietly become a cliff.",
  },
  {
    id: "aeth-fall",
    world: "aetheria",
    title: "Shrine of the Falling Water",
    kind: "inscription",
    pos: [-110, -8, 40],
    color: "#8fe0ff",
    effect: "rings",
    lore: "Water leaves Aetheria in silver ribbons and never returns. The shrine's inscription reads: 'What we give to the clouds, the clouds remember as rain on other worlds.'",
  },
  {
    id: "ever-tree",
    world: "evergreen",
    title: "Heart of the Sacred Tree",
    kind: "tree",
    pos: [12, 2.2, 12],
    ground: true,
    color: "#9dffb8",
    effect: "sparkle",
    lore: "Older than the first language, the Sacred Tree does not grow so much as listen. Fireflies are said to be its thoughts, drifting out at dusk to see what the forest has been up to.",
  },
  {
    id: "ever-stones",
    world: "evergreen",
    title: "The Whispering Stones",
    kind: "inscription",
    pos: [-40, 2.4, 40],
    ground: true,
    color: "#7affd5",
    effect: "runes",
    lore: "Nine stones, nine verses, one lullaby. Travellers who read the runes aloud report hearing the forest hum the next line from somewhere behind them.",
  },
  {
    id: "ever-lake",
    world: "evergreen",
    title: "Mirror Lake Offering",
    kind: "artifact",
    pos: [61, 2.6, -32],
    ground: true,
    color: "#a0e8ff",
    effect: "rings",
    lore: "The lake reflects not the sky but the day you will remember most fondly. Deer-spirits leave silver antler-shed on this altar as payment for the privilege of looking.",
  },
  {
    id: "ever-guardian",
    world: "evergreen",
    title: "The Vigil of the Guardians",
    kind: "statue",
    pos: [30, 2.6, -30],
    ground: true,
    color: "#c8ff7a",
    effect: "sparkle",
    lore: "The Guardians were oaks once. They agreed to walk so that the Sacred Tree never would have to. They stand in the clearing now, and are in no hurry to be anywhere else.",
  },
  {
    id: "drag-nest",
    world: "dragonfall",
    title: "The Elder Nest",
    kind: "nest",
    pos: [-120, 49, -90],
    color: "#ffb36a",
    effect: "embers",
    lore: "Five eggs, warm for nine hundred years. The Elder returns each dusk to turn them with one claw. Her scales are the colour of the ember-sky because she is the reason it burns.",
  },
  {
    id: "drag-temple",
    world: "dragonfall",
    title: "Altar of the First Flame",
    kind: "temple",
    pos: [-70, 31, 30],
    color: "#ff7a3a",
    effect: "embers",
    lore: "The dragon-priests tended this fire until the day it began tending them. The flame on the altar has never needed fuel, only an audience.",
  },
  {
    id: "drag-fortress",
    world: "dragonfall",
    title: "Ashbanner Fortress",
    kind: "artifact",
    pos: [110, 40, -40],
    color: "#ffd08a",
    effect: "rings",
    lore: "Humans built these walls to hold back dragons. The dragons let them finish, politely, and then used the battlements as perches. The banner still hangs, scorched and stubborn.",
  },
  {
    id: "drag-cave",
    world: "dragonfall",
    title: "Cavern of Embers",
    kind: "crystal",
    pos: [150, 3, 100],
    ground: true,
    color: "#ff9a4a",
    effect: "embers",
    lore: "Where lava cools slowly it grows these crystals, each holding a single roar. Break one and a dragon somewhere, years away, turns its head.",
  },
  {
    id: "eld-library",
    world: "eldoria",
    title: "The Forgotten Library",
    kind: "book",
    pos: [-72, 3.4, 10],
    color: "#ffd48a",
    effect: "runes",
    lore: "The shelves still hold the minutes of a kingdom's final council. The last page is blank except for a single instruction: 'Do not wake the king.'",
  },
  {
    id: "eld-king",
    world: "eldoria",
    title: "Throne of the Headless King",
    kind: "statue",
    pos: [18, 3, -32],
    color: "#ffcf7a",
    effect: "rings",
    lore: "The sculptors were ordered to carve a king whose gaze no one could escape. They finished the body, understood what they had been asked to do, and took the head with them when they left.",
  },
  {
    id: "eld-temple",
    world: "eldoria",
    title: "Temple of the Dawn",
    kind: "temple",
    pos: [70, 7, -30],
    color: "#ffe2a0",
    effect: "sparkle",
    lore: "Every column is aligned to the sunrise of a different year. On one morning in eight hundred the shafts of light align and the whole floor remembers it was once a map.",
  },
  {
    id: "eld-bridge",
    world: "eldoria",
    title: "The Severed Span",
    kind: "inscription",
    pos: [-12, 3.6, 100],
    color: "#7fe3d0",
    effect: "runes",
    lore: "Carved into the parapet: 'Built in a year, broken in a night, mourned for an age.' Beneath, in a newer hand: 'We crossed anyway.'",
  },
  {
    id: "eld-vault",
    world: "eldoria",
    title: "Vault of the Last Sovereign",
    kind: "chamber",
    pos: [122, -8.2, 40],
    color: "#ffd24a",
    effect: "sparkle",
    lore: "Gold, glass and a letter. The letter says the treasure was never the point; the point was to hide it so well that the kingdom would have to learn to be rich without it.",
  },
  {
    id: "umb-engine",
    world: "umbracia",
    title: "The Rift Engine",
    kind: "artifact",
    pos: [0, 4, 26],
    color: "#c89aff",
    effect: "void",
    lore: "Nobody built the Engine. It is the place where three realities rub against each other, and the rings are what remains of the attempts to measure it.",
  },
  {
    id: "umb-obelisk",
    world: "umbracia",
    title: "Obelisk of Unsaid Names",
    kind: "inscription",
    pos: [90, 14, -50],
    color: "#7fd8ff",
    effect: "runes",
    lore: "Each glyph is a name that was removed from the world to make room for the Rift. If you can read this one, the inscription stops being legible. That is not a coincidence.",
  },
  {
    id: "umb-shard",
    world: "umbracia",
    title: "Voidglass Shard",
    kind: "crystal",
    pos: [-100, -1, 60],
    color: "#b07cff",
    effect: "void",
    lore: "Frozen darkness with a pulse. Hold it up to your eye and you see the world as it will look when you have left it.",
  },
  {
    id: "umb-beacon",
    world: "umbracia",
    title: "The Drowned Beacon",
    kind: "artifact",
    pos: [60, -26, 140],
    color: "#5ad0ff",
    effect: "rings",
    lore: "A lighthouse for ships that have never existed. It flashes once a night, and somewhere across the black sea, something answers.",
  },
];

export const discoveriesFor = (w: WorldId) => DISCOVERIES.filter((d) => d.world === w);

/* ------------------------------ ENVIRONMENT PRESETS ------------------------------ */
export interface EnvPreset {
  top: string;
  horizon: string;
  sun: string;
  sunI: number;
  amb: string;
  ambI: number;
  fog: string;
  fogD: number;
  elev: number;
  az: number;
  stars: number;
  cloud: number;
  cloudColor: string;
}
const P = (top: string, horizon: string, sun: string, sunI: number, amb: string, ambI: number, fog: string, fogD: number, elev: number, az: number, stars: number, cloud: number, cloudColor: string): EnvPreset => ({
  top, horizon, sun, sunI, amb, ambI, fog, fogD, elev, az, stars, cloud, cloudColor,
});

export const ENV_PRESETS: Record<SceneId, Record<TimeOfDay, EnvPreset>> = {
  hub: {
    day: P("#241b66", "#8a78c8", "#fff0d0", 1.2, "#8a88c8", 0.8, "#4a4084", 0.004, 40, 30, 0.6, 0.15, "#8a78c8"),
    sunset: P("#1a1048", "#d27aa0", "#ffb0a0", 1.1, "#8a70b0", 0.7, "#5a3a7a", 0.0045, 12, 200, 0.8, 0.15, "#d27aa0"),
    night: P("#03030f", "#1c1a56", "#9fb0ff", 0.55, "#4a4a9a", 0.6, "#0c0a30", 0.004, 40, 90, 1, 0.1, "#2a2a6a"),
  },
  aetheria: {
    day: P("#3d82d6", "#c4e2f5", "#fff2d6", 2.0, "#a8c8f0", 0.95, "#bcd8ee", 0.0016, 48, 40, 0, 0.55, "#ffffff"),
    sunset: P("#3a3f8f", "#ff9a63", "#ffb070", 1.6, "#9a82b8", 0.75, "#d9886e", 0.0022, 9, 200, 0.1, 0.6, "#ffc4a0"),
    night: P("#060a24", "#243066", "#9fb4ff", 0.45, "#4a5aa0", 0.65, "#151c44", 0.0018, 35, 120, 1, 0.3, "#4a5a9a"),
  },
  evergreen: {
    day: P("#4fa3c8", "#d8f0d0", "#fff0c0", 1.8, "#9fd0a0", 0.9, "#a8d0a8", 0.006, 55, 20, 0, 0.35, "#ffffff"),
    sunset: P("#4a3f7a", "#ffa860", "#ff9a50", 1.4, "#8a7090", 0.65, "#b08a70", 0.007, 8, 250, 0.15, 0.45, "#ffb890"),
    night: P("#02081a", "#0c2a3a", "#8fb8ff", 0.4, "#3a6a7a", 0.7, "#07202a", 0.008, 40, 60, 1, 0.2, "#2a4a6a"),
  },
  dragonfall: {
    day: P("#5a2f2a", "#ff8a3a", "#ffc890", 1.6, "#c07a5a", 0.7, "#6a3a2a", 0.005, 30, 60, 0, 0.8, "#3a2420"),
    sunset: P("#2a1020", "#ff4a1a", "#ff7a3a", 1.5, "#a04a3a", 0.65, "#5a1f14", 0.006, 6, 240, 0.1, 0.85, "#2a1010"),
    night: P("#05030a", "#3a0f0a", "#ff8050", 0.55, "#6a3036", 0.55, "#1a0806", 0.006, 20, 100, 0.6, 0.7, "#1a0a0a"),
  },
  eldoria: {
    day: P("#5a8ec0", "#efe3c8", "#fff0d0", 1.7, "#b0b8c0", 0.9, "#cfc8b0", 0.004, 50, 330, 0, 0.5, "#ffffff"),
    sunset: P("#3a3a6a", "#f0a860", "#ffb060", 1.5, "#907a80", 0.7, "#c08a60", 0.005, 8, 200, 0.1, 0.55, "#ffd0a0"),
    night: P("#050816", "#1a2040", "#a0b0ff", 0.4, "#3a4678", 0.6, "#0c1024", 0.005, 38, 150, 1, 0.25, "#3a4670"),
  },
  umbracia: {
    day: P("#1a0f3a", "#6a3ab0", "#a090ff", 1.0, "#5a4a9a", 0.8, "#2a1a5a", 0.004, 25, 30, 0.6, 0.6, "#3a2a7a"),
    sunset: P("#0e0a2a", "#b0308a", "#ff70c0", 1.0, "#6a3a8a", 0.7, "#3a1a5a", 0.005, 8, 200, 0.8, 0.6, "#6a2a8a"),
    night: P("#02010a", "#1a1050", "#6a80ff", 0.55, "#2a2a7a", 0.65, "#0a0830", 0.005, 40, 90, 1, 0.4, "#1a1a5a"),
  },
};

export const TIMES: TimeOfDay[] = ["day", "sunset", "night"];
export const WEATHER_LABEL: Record<Weather, string> = {
  clear: "Clear Skies",
  mist: "Magical Mist",
  rain: "Rain",
  snow: "Snowfall",
  storm: "Atmospheric Storm",
};
