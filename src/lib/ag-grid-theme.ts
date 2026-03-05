import {
  themeQuartz,
  colorSchemeLightWarm,
  colorSchemeDarkBlue,
  iconSetQuartzLight,
} from "ag-grid-community";

/**
 * Shared AG Grid theme — Tablicka-inspired design.
 * Import `gridTheme` (light) or `gridThemeDark` in any grid instance.
 */

export const gridTheme = themeQuartz
  .withPart(colorSchemeLightWarm)
  .withPart(iconSetQuartzLight)
  .withParams({
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 14,
    backgroundColor: "#ffffff",
    foregroundColor: "#1a1a2e",
    chromeBackgroundColor: "#fafafa",
    headerFontWeight: 500,
    borderColor: "#f0f0f0",
    borderRadius: 8,
    wrapperBorderRadius: 12,
    rowBorder: { color: "#f5f5f5", width: 1, style: "solid" },
    headerRowBorder: false,
    headerColumnBorder: false,
    columnBorder: false,
    rowHeight: 56,
    headerHeight: 44,
    cellHorizontalPadding: 16,
    oddRowBackgroundColor: "transparent",
    rowHoverColor: "#f8f9fa",
    selectedRowBackgroundColor: "#eef7ee",
    checkboxCheckedBackgroundColor: "#22c55e",
    checkboxCheckedBorderColor: "#22c55e",
    accentColor: "#22c55e",
    cardShadow: { offsetX: 0, offsetY: 2, radius: 8, color: "rgba(0,0,0,0.06)" },
    wrapperBorder: { width: 1, color: "#e5e7eb", style: "solid" },
  });

export const gridThemeDark = themeQuartz
  .withPart(colorSchemeDarkBlue)
  .withPart(iconSetQuartzLight)
  .withParams({
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 14,
    borderRadius: 8,
    wrapperBorderRadius: 12,
    rowHeight: 56,
    headerHeight: 44,
    cellHorizontalPadding: 16,
    headerFontWeight: 500,
    rowBorder: { width: 1 },
    headerRowBorder: false,
    headerColumnBorder: false,
    columnBorder: false,
    oddRowBackgroundColor: "transparent",
    accentColor: "#22c55e",
    checkboxCheckedBackgroundColor: "#22c55e",
    checkboxCheckedBorderColor: "#22c55e",
  });
