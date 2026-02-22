// Minimal JSX namespace to satisfy TypeScript when React/native JSX types aren't resolved
// This file provides a fallback so files using `JSX.Element` don't error during type checks.

declare namespace JSX {
  // Rendered element (fallback to any)
  type Element = any;

  // Allow any intrinsic element (e.g., <View />, <Text />)
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
