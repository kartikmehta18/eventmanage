"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Derive the props type from the NextThemesProvider to avoid importing
// internal/deep paths that may not exist in the installed package.
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}