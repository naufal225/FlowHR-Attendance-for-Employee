export const spacing = {
  s4: 4,
  s6: 6,
  s8: 8,
  s12: 12,
  s16: 16,
  s20: 20,
} as const;

export const typography = {
  titlePage: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    fontWeight: "800" as const,
  },
  titleCard: {
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
    fontWeight: "800" as const,
  },
  metricXL: {
    fontSize: 50,
    lineHeight: 56,
    letterSpacing: -0.4,
    fontWeight: "900" as const,
  },
  metricL: {
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -0.4,
    fontWeight: "900" as const,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    fontWeight: "500" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontWeight: "600" as const,
  },
  labelCaps: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    fontWeight: "800" as const,
    textTransform: "uppercase" as const,
  },
  navLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    fontWeight: "700" as const,
  },
} as const;
