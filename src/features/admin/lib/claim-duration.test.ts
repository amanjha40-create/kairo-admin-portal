import { describe, expect, it } from "vitest";
import { formatClaimDate, formatClaimDuration } from "./claim-duration";

describe("Admin verification claim duration", () => {
  it("preserves year-only Education dates", () => {
    expect(
      formatClaimDuration({
        startDate: "2019-01-01",
        startDatePrecision: "year",
        endDate: "2022-12-31",
        endDatePrecision: "year",
      }),
    ).toBe("2019 - 2022");
  });

  it("formats month-and-year Education dates without adding day precision", () => {
    expect(
      formatClaimDuration({
        startDate: "2019-06-01",
        startDatePrecision: "month",
        endDate: "2022-12-31",
        endDatePrecision: "month",
      }),
    ).toBe("Jun 2019 - Dec 2022");
  });

  it("shows Present for current Education", () => {
    expect(
      formatClaimDuration({
        startDate: "2022-01-01",
        startDatePrecision: "year",
        isCurrent: true,
      }),
    ).toBe("2022 - Present");
  });

  it("preserves year-only Employment dates when precision is supplied", () => {
    expect(
      formatClaimDuration({
        startDate: "2020-01-01",
        startDatePrecision: "year",
        endDate: "2023-12-31",
        endDatePrecision: "year",
      }),
    ).toBe("2020 - 2023");
  });

  it("preserves month-and-year Employment dates when precision is supplied", () => {
    expect(
      formatClaimDuration({
        startDate: "2020-03-01",
        startDatePrecision: "month",
        endDate: "2023-08-31",
        endDatePrecision: "month",
      }),
    ).toBe("Mar 2020 - Aug 2023");
  });

  it("shows Present for a current Employment role", () => {
    expect(formatClaimDuration({ startDate: "2021-04-15", isCurrent: true })).toBe(
      "2021-04-15 - Present",
    );
  });

  it("handles missing optional dates without fabricating values", () => {
    expect(formatClaimDuration({ startDate: "2022", endDate: null })).toBe(
      "2022 - End date unavailable",
    );
    expect(formatClaimDuration({})).toBe("Unavailable");
  });

  it("never infers month precision from a year-only value", () => {
    expect(formatClaimDate("2022", null)).toBe("2022");
    expect(formatClaimDate("2022-01-01", "year")).toBe("2022");
  });
});
