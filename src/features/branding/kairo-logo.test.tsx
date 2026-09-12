import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { KairoLogo } from "./kairo-logo";

describe("KairoID branding", () => {
  it("uses the canonical horizontal logo at its native aspect ratio", () => {
    const markup = renderToStaticMarkup(createElement(KairoLogo, { width: 728 }));

    expect(markup).toContain("kairoid-logo-primary");
    expect(markup).toContain('alt="KairoID"');
    expect(markup).toContain('width="728"');
    expect(markup).toContain('height="192"');
  });

  it("keeps the existing square mark for compact navigation", () => {
    const markup = renderToStaticMarkup(
      createElement(KairoLogo, { width: 32, showWordmark: false }),
    );

    expect(markup).toContain('src="/kairo-mark.png"');
    expect(markup).toContain('alt="KairoID"');
  });
});
