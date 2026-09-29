"use client";
import Image from "next/image";
import Link from "next/link";
export default function SidebarFooter(){
 const links=[["/pages/about","About Us"],["/pages/article","Articles"],["/pages/accessibility","Accessibility"],["/pages/privacy-terms","Privacy & Terms"],["/pages/support","Support"]];
 return <footer className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
  <Link href="/pages/about" className="flex items-center gap-3"><Image src="/logo.png" alt="CNERSH logo" width={42} height={42} className="h-10 w-10 rounded-md object-contain"/><span><b className="block text-sm">CNERSH</b><span className="text-[10px] leading-4 text-slate-500">National Ethics Committee for Health Research on Humans</span></span></Link>
  <nav aria-label="Footer navigation" className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs">{links.map(([h,t])=><Link key={h} href={h} className="text-slate-500 hover:text-blue-700 hover:underline">{t}</Link>)}</nav>
  <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">© {new Date().getFullYear()} CNERSH · Cameroon</p>
 </footer>
}