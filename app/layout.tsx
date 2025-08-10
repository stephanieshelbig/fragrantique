import './globals.css';import Link from 'next/link';
export const metadata={title:'Fragrantique — The Fragrance Boutique',description:'Elegant boutique shelves for your fragrance collection'};
export default function RootLayout({children}:{children:React.ReactNode}){return(<html lang="en"><body className="min-h-screen">
<header className="w-full border-b border-[rgba(199,162,75,0.25)] bg-[rgba(255,255,255,0.7)] backdrop-blur"><div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
<Link href="/" className="text-xl font-semibold text-[var(--gold)]">Fragrantique</Link><nav className="flex gap-6 text-sm"><Link href="/explore">Explore</Link><Link href="/add">Add Fragrance</Link><Link href="/chat">Chat</Link><Link href="/auth">Log in</Link></nav></div></header>
<main className="mx-auto max-w-6xl px-4 py-8">{children}</main><footer className="mt-16 border-t border-[rgba(199,162,75,0.25)] py-8 text-center text-xs">© {new Date().getFullYear()} Fragrantique</footer>
</body></html>)}