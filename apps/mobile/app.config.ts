import type { ConfigContext, ExpoConfig } from "expo/config";

// Static config lives in app.json; this file only layers per-developer overrides on top.
//
// IOS_BUNDLE_ID: Apple bundle IDs belong to one signing team, so each developer building
// to their own iPhone with their own Apple ID needs a unique one (e.g. com.yourname.orbit).
// Set it in apps/mobile/.env. Unset, the shared ID from app.json is used (EAS builds).
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Orbit",
  slug: config.slug ?? "orbit",
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.IOS_BUNDLE_ID || config.ios?.bundleIdentifier,
  },
});
