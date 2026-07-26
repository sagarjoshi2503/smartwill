import { ROLE_ADMIN, ROLE_TESTATOR } from "../constants";

export type AuthRole = typeof ROLE_ADMIN | typeof ROLE_TESTATOR;

const storageKey = (role: AuthRole): string => `smartwill_${role}_token`;

export const setAuthToken = (role: AuthRole, token: string): void => {
  localStorage.setItem(storageKey(role), token);
};

export const getAuthToken = (role: AuthRole): string | null => {
  return localStorage.getItem(storageKey(role));
};

export const clearAuthToken = (role: AuthRole): void => {
  localStorage.removeItem(storageKey(role));
};
