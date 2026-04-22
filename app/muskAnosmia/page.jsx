'use client';

export default function MuskAnosmiaPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-8 items-start">
        {/* Left side: TikTok embeds */}
        <aside className="space-y-6 lg:sticky lg:top-6">
          <div className="rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white">
            <iframe
              src="https://www.tiktok.com/embed/v2/7628805433850940685"
              className="w-full"
              style={{ height: '740px' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Fragrantique TikTok video 1"
            />
          </div>

          <div className="rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white">
            <iframe
              src="https://www.tiktok.com/embed/v2/7564217056497913101"
              className="w-full"
              style={{ height: '740px' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Fragrantique TikTok video 2"
            />
          </div>
        </aside>

        {/* Right side: page content */}
        <main className="max-w-3xl space-y-6">
          <h1 className="text-3xl font-bold">Musk Anosmia</h1>

          <p>
            Have you ever tried a fragrance that other people say is amazing, but
            you think it smells awful like a wet ashtray, or it smells like nothing
            at all? You may have musk anosmia like me. I have done a lot of personal
            research on this, and here is what I have found...
          </p>

          <p>
            Musk anosmia is a genetic condition where the person is unable to
            perceive certain musks. It's a genetic variation that affects at
            least 7% of the US population. Because of the size of the molecules, 
            if a fragrance contains macrocyclic musks, I am unable to perceive it
            AND any of the other notes in the fragrance. The exception is 
            sandalwood. If the fragrance contains sandalwood then that is all I 
            smell, and it is VERY strong. It comes off smelling like a wet ashtray.
            Without musk, the sandalwood is more subdued so it smells nice.
          </p>

          <p>
            There are many types of musk, and most fragrances contain one or more of
            them. The human olfactory receptor OR5AN1 is sensitive to macrocyclic
            and nitro musks (muscone, civetone, habanolide, ambrettolide), but not
            polycyclic (galaxolide, fixolide, tonalide) or alicyclic musks. Someone
            with a genetic variant in OR5AN1 will likely experience musk anosmia
            when exposed to polycyclic or alicyclic musks. I've found that once my
            musk anosmia is triggered, all fragrances will smell like nothing, unless
            they contain sandalwood, in which case they will smell like wet ashtray.
            To clear this temporary anosmia, I can move into clear air and sniff
            peppermint, cloves, or tea tree oil for 10 minutes. Then my olfactory
            senses are 'reset'.
          </p>

          <p>
            Some fragrances that I can't smell are Swiss Arabian Musk Malakai, Initio
            Musk Therapy, LaPerla Invisible Touch, LaPerla Once Upon a Garden,
            Xerjoff Damarose (this one broke my heart), and Baccarat Rouge 540.
            Fragrances that smell like wet ashtray to me always contain musk and
            sandalwood, like Molinard Habanita and Nishane Ani.
          </p>

          <h2 className="text-xl font-semibold">More info about synthetic musks and their use:</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Nitro musks (banned by LVMH):</strong> Musk ambrette, Musk
              xyxlene, musccetone, Musk moskene, and musk tibetene.
            </li>
            <li>
              <strong>Polycyclic musks (prior to 1970s, banned by LVMH):</strong>{' '}
              Tonalide, Galaxolide, Fixolide, Celestolide.
            </li>
            <li>
              <strong>Macrocyclic musks (the only ones authorised by LVMH):</strong>{' '}
              La muscone, Muscenone, Exaltolide (ambrette seed), Habanolide,
              Ambrettolide, Globalide, Musk T (Takasago), ethylene brassylate,
              Dihydro ambrettolide, ambrettolide, Cosmone, Nirvanolide, Astrotone.
            </li>
            <li>
              <strong>Linear or alicyclic musks (new generation):</strong>{' '}
              Helvetolide, Serenolide, Moxalone, Applelide, Nébulone Sylkolide.
            </li>
          </ul>

          <p>
            According to{' '}
            <a
              href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9874024/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-600"
            >
              this article
            </a>
            , the presence of musk can change the intensity of the perception of some
            notes, which is why fragrances containing musk and sandalwood will smell
            like only sandalwood, and the sandalwood is intense so it smells like wet
            ashtray.
          </p>

          <p>
            In summary, OR5AN1 is a crucial macrocyclic and nitro musk receptor in
            humans, and genetic variation appears to cause variable responsiveness
            to macrocyclic musks in in-vitro assay. Significant differences were
            observed among OR5AN1 genotypes in musk odor perception; genetic
            variation of OR5AN1 affects the perceived intensity of exaltolide and
            ethylene brassylate, and the detection threshold for muscone.
          </p>
        </main>
      </div>
    </div>
  );
}
