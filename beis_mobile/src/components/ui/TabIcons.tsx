/**
 * Tab bar SVG icons — assets/Icons/ converted to SvgXml strings.
 *
 * Uses SvgXml (not component API) because it's the most reliable
 * renderer on Android — handles viewBox scaling, fill overrides,
 * and complex path data without the quirks of the component API.
 *
 * Each icon accepts { color, size } and injects the color
 * directly into the SVG string before parsing.
 */
import React from "react";
import { SvgXml } from "react-native-svg";

interface IconProps {
  color: string;
  size?: number;
}

// ── home.svg (viewBox 0 0 16 16, filled) ─────────────────────────────────────
export function HomeIcon({ color, size = 24 }: IconProps) {
  const xml = `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M1 6V15H6V11C6 9.89543 6.89543 9 8 9C9.10457 9 10 9.89543 10 11V15H15V6L8 0L1 6Z" fill="${color}"/></svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

// ── scroll.svg (viewBox 0 0 32 32, filled receipt/scroll) ─────────────────────
export function ScrollIcon({ color, size = 24 }: IconProps) {
  const xml = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M24,19V7c0-1.657-1.343-3-3-3H7C5.343,4,4,5.343,4,7v5h4v12c0,1.657,1.343,3,3,3h14c1.657,0,3-1.343,3-3v-5H24z M8,10H6V7c0-0.551,0.449-1,1-1c0.552,0,1,0.448,1,1V10z M10,24V7c0-0.35-0.06-0.687-0.171-1H21c0.551,0,1,0.449,1,1v12H12v5c0,0.552-0.448,1-1,1C10.449,25,10,24.551,10,24z M26,24c0,0.551-0.449,1-1,1H13.829C13.94,24.687,14,24.35,14,24v-3h12V24z M20,12h-8v-2h8V12z M20,16h-8v-2h8V16z" fill="${color}"/></svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

// ── analytics.svg (viewBox 0 0 24 24, stroked line chart) ─────────────────────
export function AnalyticsIcon({ color, size = 24 }: IconProps) {
  const xml = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 3V21" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 21H3" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 16L12.25 10.75L15.75 14.25L21 9" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

// ── setting.svg (viewBox 0 0 24 24, filled gear) ──────────────────────────────
export function SettingIcon({ color, size = 24 }: IconProps) {
  const xml = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.1 9.2214C18.29 9.2214 17.55 7.9414 18.45 6.3714C18.97 5.4614 18.66 4.3014 17.75 3.7814L16.02 2.7914C15.23 2.3214 14.21 2.6014 13.74 3.3914L13.63 3.5814C12.73 5.1514 11.25 5.1514 10.34 3.5814L10.23 3.3914C9.78 2.6014 8.76 2.3214 7.97 2.7914L6.24 3.7814C5.33 4.3014 5.02 5.4714 5.54 6.3814C6.45 7.9414 5.71 9.2214 3.9 9.2214C2.86 9.2214 2 10.0714 2 11.1214V12.8814C2 13.9214 2.85 14.7814 3.9 14.7814C5.71 14.7814 6.45 16.0614 5.54 17.6314C5.02 18.5414 5.33 19.7014 6.24 20.2214L7.97 21.2114C8.76 21.6814 9.78 21.4014 10.25 20.6114L10.36 20.4214C11.26 18.8514 12.74 18.8514 13.65 20.4214L13.76 20.6114C14.23 21.4014 15.25 21.6814 16.04 21.2114L17.77 20.2214C18.68 19.7014 18.99 18.5314 18.47 17.6314C17.56 16.0614 18.3 14.7814 20.11 14.7814C21.15 14.7814 22.01 13.9314 22.01 12.8814V11.1214C22 10.0814 21.15 9.2214 20.1 9.2214ZM12 15.2514C10.21 15.2514 8.75 13.7914 8.75 12.0014C8.75 10.2114 10.21 8.7514 12 8.7514C13.79 8.7514 15.25 10.2114 15.25 12.0014C15.25 13.7914 13.79 15.2514 12 15.2514Z" fill="${color}"/></svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}
