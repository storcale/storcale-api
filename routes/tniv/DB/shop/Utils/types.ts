import { UUID } from "crypto";

export type RGB = { r: number; g: number; b: number };

export interface Rarity {
    id: number;
    name: string;
    color: RGB; 
    probability: number; // ? Probability percentage (0-100)
    isActive: boolean; // ! If false, items with this rarity wont be in shop unless active (for special events)
    isLimited: boolean;
}

export interface Sword {
    id: number;
    name: string;
    isGuardian: boolean;
    isOfficer: boolean;
    isHicom: boolean;
    isDev: boolean;
    price: number; // ? If we sell individually idk
    rarity: Rarity["id"];
    active: boolean; // ! If false, remove from use
    isLimited: boolean;
}

export interface Aura {
    id: number; 
    name: string;
    isGuardian: boolean;
    isOfficer: boolean;
    isHicom: boolean;
    isDev: boolean;
    price: number; // ? If we sell individually idk
    rarity: Rarity["id"];
    active: boolean; // ! If false, remove from use
    isLimited: boolean;
}

export interface Payment {
    id: UUID;
    playerID: Player["id"];
    item: Sword["id"] | Aura["id"] | Case["id"];
    amount: number; // * Robux
    date: Date;
    game: string; // * Game where the purchase was made
}

export interface Case {
    id: number;
    name: string;
    price: number; // * Robux
    swords: Array<Sword["id"]>; 
    auras: Array<Aura["id"]>;
    rarityProbabilities: { rarity: Rarity["id"]; probability: number }[]; // * Probability distribution for rarities in this case
    isActive: boolean; // ! If false, remove from use
    isLimited: boolean;
}

export interface Player {
    id: number;
    robloxID: string;
    swords: Array<Sword["id"]>; // Array of sword IDs
    auras: Array<Aura["id"]>; // Array of Auras IDs
    isGuardian: boolean;
    isOfficer: boolean;
    isHicom: boolean;
    isDev: boolean;
    payments: Array<Payment["id"]>;
    cases: Array<Case["id"]>; // ? Cases bought to give better chance for these cases?
}
