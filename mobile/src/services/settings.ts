import * as SecureStore from "expo-secure-store";
import { USE_TEST_LOCATION } from "../constants/config";

const KEY = "shakti_demo_location";

// The starting value comes from config.ts (true = demo location on).
let demoLocation: boolean = USE_TEST_LOCATION;

// Read by the location functions, which are not React components
export function isDemoLocation() {
  return demoLocation;
}

// Reads the saved choice when the app opens
export async function loadDemoLocation(): Promise<boolean> {
  try {
    const saved = await SecureStore.getItemAsync(KEY);
    if (saved !== null) demoLocation = saved === "1";
  } catch {
    // keep the starting value
  }
  return demoLocation;
}

// Remembers a new choice
export async function saveDemoLocation(on: boolean) {
  demoLocation = on;
  await SecureStore.setItemAsync(KEY, on ? "1" : "0");
}