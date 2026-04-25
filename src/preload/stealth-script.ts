export function buildStealthScript(profileJson: string): string {
  return `(() => {
    try {
      const profile = JSON.parse(${JSON.stringify(profileJson)});
      Object.defineProperty(window, "__AA_STEALTH_PROFILE__", {
        configurable: true,
        enumerable: false,
        writable: false,
        value: profile,
      });
    } catch {
      // no-op: keep fallback lightweight for CLI/headless builds
    }
  })();`;
}
