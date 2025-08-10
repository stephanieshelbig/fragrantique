'use client';import { useEffect,useState } from 'react';import Image from 'next/image';import Link from 'next/link';import { supabase } from '@/lib/supabase';
type UF={id:string;position:number;fragrance:{id:string;name:string;brand:string;image_url:string|null}};
export default function Boutique({username}:{username:string}){const [items,setItems]=useState<UF[]>([]);
useEffect(()=>{load();},[username]);
async function load(){const {data:profile}=await supabase.from('profiles').select('*').eq('username',username).maybeSingle(); if(!profile)return;
const {data}=await supabase.from('user_fragrances').select('id, position, fragrance:fragrances(id,name,brand,image_url)').eq('user_id',profile.id).order('position'); setItems((data||[]) as any);}
async function move(id:string,dir:number){const idx=items.findIndex(i=>i.id===id); const newIndex=idx+dir; if(newIndex<0||newIndex>=items.length)return;
const arr=[...items]; const [m]=arr.splice(idx,1); arr.splice(newIndex,0,m); await Promise.all(arr.map((it,i)=>supabase.from('user_fragrances').update({position:i}).eq('id',it.id))); setItems(arr.map((it,i)=>({...it,position:i})));}
return(<div><div className="rounded-2xl overflow-hidden boutique-bg border border-[rgba(199,162,75,0.25)]"><div className="bg-[rgba(255,255,255,0.6)] p-4"><h1 className="text-3xl font-semibold text-center">Fragrantique Boutique — @{username}</h1></div>
<div className="p-6 space-y-6">{[0,1,2,3,4].map(row=>(<div key={row} className="shelf grid grid-cols-5 gap-4">{items.slice(row*5,row*5+5).map(uf=>(
<div key={uf.id} className="text-center glass-card p-2"><div className="aspect-[3/4] relative rounded-md overflow-hidden">{uf.fragrance.image_url?<Image alt={uf.fragrance.name} src={uf.fragrance.image_url} fill className="object-cover"/>:<div className="absolute inset-0 flex items-center justify-center text-xs opacity-60">No image</div>}</div>
<div className="mt-2 text-xs"><div className="font-semibold">{uf.fragrance.brand}</div><Link href={`/f/${uf.fragrance.id}`} className="underline">{uf.fragrance.name}</Link></div>
<div className="mt-1 flex justify-center gap-1 text-[10px]"><button onClick={()=>move(uf.id,-1)} className="px-2 py-1 border rounded">←</button><button onClick={()=>move(uf.id,1)} className="px-2 py-1 border rounded">→</button></div></div>))}</div>))}</div></div>
<div className="mt-6 text-sm opacity-70">Want your Fragrantica collection imported? Paste your profile URL in Settings (coming soon).</div></div>);}