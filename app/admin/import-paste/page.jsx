'use client';

import { useState } from 'react';

export default function ImportPaste() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('');
    let rows;
    try {
      rows = JSON.parse(text);
      if (!Array.isArray(rows) || rows.length === 0) throw new Error('No rows');
    } catch (e) {
      setStatus('❌ Invalid JSON — paste the data from Step B');
      return;
    }

    try {
      const res = await fetch('/api/import-fragrantica', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          memberId: 'manual-paste',
          rows,
          targetUsername: 'stephanie', // your default
        })
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || 'Server error');
      setStatus(`✅ Imported ${j.count} items. Refresh your boutique to see them.`);
    } catch (e) {
      setStatus(`❌ Import failed: ${e.message}`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Import from Fragrantica (Paste JSON)</h1>
      <ol className="list-decimal pl-5 space-y-2 text-sm">
        <li>Go to your Fragrantica profile’s <strong>“Have”</strong> section.</li>
        <li>Run the copy script from Step B (below) — it will copy your fragrances to your clipboard.</li>
        <li>Paste the result into the box here and click <strong>Import</strong>.</li>
      </ol>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e)=>setText(e.target.value)}
          className="w-full h-64 border rounded p-3 font-mono text-xs"
          placeholder='[{"url":"...","image":"...","label":"..."}, ...]'
        />
        <button className="px-4 py-2 bg-black text-white rounded">Import</button>
      </form>

      {status && <p className="text-sm">{status}</p>}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm underline">Why paste?</summary>
        <p className="text-sm opacity-80 mt-2">
          Fragrantica uses dynamic tabs and ad scripts, and browsers block cross-site requests by default.
          Pasting avoids those restrictions and keeps your account secure.
        </p>
      </details>
    </div>
  );
}
