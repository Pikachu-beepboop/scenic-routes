import type { SubTabId } from "./types";

/**
 * BETA / TEST-VERSION NAV CONFIG
 * --------------------------------
 * Tabs listed here are hidden from every navigation menu
 * (desktop sidebar, mobile tab strip, mobile drawer) but stay
 * fully implemented, routable and functional under the hood —
 * nothing was removed, only the menu entries are filtered out.
 *
 * To bring a tab back for everyone: just delete its line below
 * (or comment it out). No other file needs to change.
 */
export const HIDDEN_TABS: SubTabId[] = [
  "sessions",
  "notifications",
];

export function isTabHidden(id: SubTabId): boolean {
  return HIDDEN_TABS.includes(id);
}

/**
 * Diese beiden Preferences-Felder sind (noch) nicht mit echtem
 * State/Speicherung verbunden (rein optisch). Bis sie fertig
 * verdrahtet sind, bleiben sie in der Testversion ausgeblendet.
 *
 * Wieder einblenden: einfach auf `false` setzen.
 */
export const HIDE_UNFINISHED_PREFERENCES = true;

