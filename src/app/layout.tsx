import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexoFit",
  applicationName: "NexoFit",
  description: "Aplicativo mobile de musculacao com planos explicaveis, registro de treino e seguranca de perfil.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/nexofit-favicon.png", sizes: "1024x1024", type: "image/png" },
      { url: "/nexofit-mark.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/nexofit-favicon.png", sizes: "1024x1024", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#103b2d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('nexofit-theme')||localStorage.getItem('duonest-theme');const d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch{}` }} />
        {children}
      </body>
    </html>
  );
}
