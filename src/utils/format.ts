import { MONTHS } from "../data/options";

export const fmt = (n: number): string => "₹" + n.toLocaleString("en-IN");

const now = new Date();
export const today = { day: now.getDate(), month: MONTHS[now.getMonth()], year: now.getFullYear() };
