'use client';

import { useState } from 'react';

const BOOKMARKLET = `
javascript:(function(){
  function q(sel,root){return Array.from((root||document).querySelectorAll(sel));}
  // Try common wardrobe containers; Fragrantica changes markup sometimes.
  const cards = q('.wardrobe .card, .wardrobe-item, .shelf .item, a[href*="/perfume/"]');
  const rows=[];
  const seen=new Set();
  cards.forEach(c=>{
    // link
    let a=c.closest('a[href*="/perfume/"]')||c.querySelector('a[href*="/perfume/"]');
    let url=a?a.href:undefined;
    // image
    let img=c.querySelector('img')|| (a?a.querySelector('img'):null);
    let image=img?img.src:undefined;
    // label text
    let label= (c.querySelector('.title')||c.querySelector('.name')||a)?.textContent || '';
    label=label.replace(/\\s+/g,' ').trim();
    if(!url && label==='') return;
    // de-dupe by url or label
    const key=url||label;
    if(seen.has(key)) return;
    seen.add(key);
    rows.push({ url, image, label });
  });
  if(!rows.length){ alert('No fragrances found on this page. Open your Wardrobe tab first.'); return; }
  const memberId=(document.querySelector('a[href*="/member/"]')||{}).href;
  // POST to your site
  fetch('/api/import-fragrantica', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ memberId, rows, targetUsername:'stephanie' })
  }).then(r=>r.json()).then(j=>{
    alert(j.ok ? ('Imported '+j.count+' items into Fragrantique') : ('Import failed: '+(j.error||'?')));
  }).catch(e=>alert('Error: '+e.message));
})();`.trim();

export default function ImportFragrantica() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Import from Fragrantica (Wardrobe)</h1>
      <ol className="list-decimal pl-5 space-y-2 text-sm">
        <li>Drag the button below to your bookmarks bar.</li>
        <li>Open your Fragrantica profile, go to <strong>Wardrobe</strong> (you must be logged in).</li>
        <li>Click the bookmarklet. It will send the list to Fragrantique and place bottles on your shelves.</li>
      </ol>
      <div className="flex items-center gap-3">
        <a
          href={BOOKMARKLET}
          className="inline-block px-4 py-2 rounded bg-black text-white"
          title="Drag me to your bookmarks bar"
        >
          Import → Fragrantique
        </a>
        <button
          className="px-3 py-2 rounded border"
          onClick={async ()=>{
            await navigator.clipboard.writeText(BOOKMARKLET);
            setCopied(true);
            setTimeout(()=>setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied!' : 'Copy bookmarklet'}
        </button>
      </div>
      <p className="text-xs opacity-70">
        The importer only reads what <em>you</em> can see in your browser on your Wardrobe page and posts the names/links/images to your Fragrantique account.
      </p>
    </div>
  );
}
