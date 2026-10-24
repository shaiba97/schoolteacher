import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { LOCALE_STORAGE_KEY, LocaleProvider } from "@/lib/i18n/locale-provider";
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
  title: "Teacher Portal",
  description: "Teacher portal — classes, attendance, exams and announcements",
};

// Without cover fit, iOS reports safe-area insets as 0 and the bottom nav
// would sit under the home indicator.
export const viewport: Viewport = {
  viewportFit: "cover",
};

// Applied before first paint so Arabic sessions never flash an LTR layout.
const localeScript = `try{var d=document.documentElement,p;try{p=localStorage.getItem("${LOCALE_STORAGE_KEY}")}catch(e){}if(p!=="ar"&&p!=="en"){p=navigator.language&&navigator.language.indexOf("ar")===0?"ar":"en";}d.lang=p;d.dir=p==="ar"?"rtl":"ltr";}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <LocaleProvider>
          <Toaster>{children}</Toaster>
        </LocaleProvider>
      </body>
    </html>
  );
}
