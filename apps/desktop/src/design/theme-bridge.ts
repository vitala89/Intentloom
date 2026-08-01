import type { DesktopThemeContribution } from "@intentloom/protocol";

export function applyDesktopTheme(
  theme: DesktopThemeContribution,
  targetElement: HTMLElement = document.documentElement,
): () => void {
  const originalValues = new Map<string, string>();

  for (const [tokenName, tokenValue] of Object.entries(theme.tokens)) {
    if (!tokenName.startsWith("--")) continue;
    originalValues.set(
      tokenName,
      targetElement.style.getPropertyValue(tokenName),
    );
    targetElement.style.setProperty(tokenName, tokenValue);
  }

  targetElement.setAttribute("data-theme-variant", theme.variant);

  return function removeDesktopTheme() {
    for (const [tokenName, originalVal] of originalValues.entries()) {
      if (originalVal) {
        targetElement.style.setProperty(tokenName, originalVal);
      } else {
        targetElement.style.removeProperty(tokenName);
      }
    }
    targetElement.removeAttribute("data-theme-variant");
  };
}
