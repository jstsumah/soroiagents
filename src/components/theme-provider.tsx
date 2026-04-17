
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"
import { getMarkdownTheme } from "@/services/settings-service"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    React.useEffect(() => {
        const fetchAndApplyTheme = async () => {
            const markdownTheme = await getMarkdownTheme();
            if (!markdownTheme || !markdownTheme.light || !markdownTheme.dark) return;
            
            const style = document.createElement('style');
            style.innerHTML = `
                :root {
                --prose-body: ${markdownTheme.light.body};
                --prose-headings: ${markdownTheme.light.headings};
                --prose-links: ${markdownTheme.light.links};
                --prose-bullets: ${markdownTheme.light.bullets};
                }
                .dark {
                --prose-body: ${markdownTheme.dark.body};
                --prose-headings: ${markdownTheme.dark.headings};
                --prose-links: ${markdownTheme.dark.links};
                --prose-bullets: ${markdownTheme.dark.bullets};
                }
            `;
            document.head.appendChild(style);
        }
        fetchAndApplyTheme();
    }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
