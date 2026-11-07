
export const DISCOVERY_CATEGORIES = [
  {
    slug: 'florals',
    name: 'Florals',
    description: 'Romantic, elegant & blooming',
    emoji: '🌸',
    color: '#f9e4eb',
    accords: ['floral', 'white floral', 'yellow floral', 'soft floral'],
    notes: ['rose', 'jasmine', 'tuberose', 'gardenia', 'peony', 'magnolia', 'freesia', 'violet', 'lily', 'orange blossom', 'ylang-ylang', 'narcissus', 'iris', 'orchid', 'osmanthus', 'honeysuckle']
  },
  {
    slug: 'vanillas',
    name: 'Vanillas',
    description: 'Creamy, warm & irresistible',
    emoji: '🍦',
    color: '#f4e8d7',
    accords: ['vanilla'],
    notes: ['vanilla', 'vanillin']
  },
  {
    slug: 'fresh-citrus',
    name: 'Fresh & Citrus',
    description: 'Bright, sparkling & refreshing',
    emoji: '🍋',
    color: '#eef1dc',
    accords: ['citrus', 'fresh', 'fresh spicy', 'green'],
    notes: ['bergamot', 'lemon', 'lime', 'grapefruit', 'mandarin', 'orange', 'yuzu', 'citron', 'petitgrain', 'verbena']
  },
  {
    slug: 'gourmands',
    name: 'Gourmands',
    description: 'Sweet, delicious & addictive',
    emoji: '🍮',
    color: '#f0e0d5',
    accords: ['sweet', 'gourmand', 'caramel', 'chocolate', 'lactonic'],
    notes: ['caramel', 'praline', 'chocolate', 'cocoa', 'coffee', 'toffee', 'marshmallow', 'honey', 'cookie', 'hazelnut', 'pistachio', 'whipped cream', 'cotton candy']
  },
  {
    slug: 'woods-amber',
    name: 'Woods & Amber',
    description: 'Rich, warm & sophisticated',
    emoji: '🪵',
    color: '#e8ded5',
    accords: ['woody', 'amber', 'balsamic'],
    notes: ['sandalwood', 'cedar', 'vetiver', 'guaiac', 'cashmeran', 'amber', 'benzoin', 'labdanum', 'oakwood', 'patchouli']
  },
  {
    slug: 'tropical-fruity',
    name: 'Tropical & Fruity',
    description: 'Juicy, sunny & playful',
    emoji: '🥭',
    color: '#f9e5dc',
    accords: ['fruity', 'tropical', 'fruity floral'],
    notes: ['mango', 'pineapple', 'coconut', 'passionfruit', 'papaya', 'guava', 'peach', 'pear', 'apple', 'strawberry', 'raspberry', 'cherry', 'lychee', 'litchi', 'melon', 'watermelon', 'plum', 'fig']
  },
  {
    slug: 'musks',
    name: 'Musks',
    description: 'Soft, sensual & skin-like',
    emoji: '☁️',
    color: '#ede8ed',
    accords: ['musky', 'musk'],
    notes: ['musk', 'ambrette', 'ambrettolide', 'white musk']
  },
  {
    slug: 'roses',
    name: 'Roses',
    description: 'From delicate petals to dark roses',
    emoji: '🌹',
    color: '#f4dce2',
    accords: ['rose'],
    notes: ['rose', 'damask rose', 'turkish rose', 'bulgarian rose', 'rose absolute']
  },
  {
    slug: 'aquatics',
    name: 'Aquatics',
    description: 'Ocean breezes & fresh rain',
    emoji: '🌊',
    color: '#e1edf0',
    accords: ['aquatic', 'marine', 'ozonic', 'watery'],
    notes: ['sea salt', 'sea water', 'marine notes', 'aquatic notes', 'water notes', 'ozonic notes']
  },
  {
    slug: 'powdery',
    name: 'Powdery',
    description: 'Soft, delicate & comforting',
    emoji: '🪻',
    color: '#eae3f1',
    accords: ['powdery', 'iris', 'violet'],
    notes: ['orris', 'iris', 'violet', 'heliotrope', 'rice powder', 'talc']
  },
  {
    slug: 'spicy',
    name: 'Spicy',
    description: 'Bold, intriguing & seductive',
    emoji: '✨',
    color: '#f2e2d9',
    accords: ['warm spicy', 'fresh spicy', 'spicy'],
    notes: ['cinnamon', 'cardamom', 'clove', 'pepper', 'saffron', 'ginger', 'nutmeg', 'cumin']
  },
  {
    slug: 'oud',
    name: 'Oud',
    description: 'Deep, mysterious & luxurious',
    emoji: '🖤',
    color: '#e6dfdf',
    accords: ['oud'],
    notes: ['oud', 'agarwood']
  },
  {
    slug: 'tea',
    name: 'Tea',
    description: 'Calming, refined & aromatic',
    emoji: '🍵',
    color: '#e7ecdf',
    accords: ['tea'],
    notes: ['green tea', 'black tea', 'white tea', 'matcha', 'oolong', 'mate', 'lapsang souchong']
  }
];

export function getCategory(slug) {
  return DISCOVERY_CATEGORIES.find(
    (category) => category.slug === slug
  );
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasTerm(text, term) {
  const normalizedText = normalize(text);
  const normalizedTerm = normalize(term);

  if (!normalizedText || !normalizedTerm) return false;

  const escaped = normalizedTerm.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  return new RegExp(
    `(^|[^a-z])${escaped}(?=$|[^a-z])`,
    'i'
  ).test(normalizedText);
}

function parseAccords(value) {
  try {
    const parsed =
      typeof value === 'string'
        ? JSON.parse(value)
        : value;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((accord) =>
        typeof accord === 'string'
          ? accord
          : accord?.name
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

function extractNoteSections(value) {
  const text = String(value || '');

  // Only inspect text beginning at an actual note heading.
  // This avoids classifying personal reviews as notes.
  const match = text.match(
    /(?:^|\n)\s*(?:top|heart|middle|base)\s+notes?\s*(?:are|is|:|-)/i
  );

  if (!match) return '';

  return text.slice(match.index);
}

export function matchesCategory(fragrance, category) {
  if (!category) return false;

  const accords = parseAccords(fragrance.accords);

  const accordMatch = accords.some((accord) =>
    category.accords.some((term) =>
      hasTerm(accord, term)
    )
  );

  if (accordMatch) return true;

  const noteText = extractNoteSections(fragrance.notes);

  return category.notes.some((term) =>
    hasTerm(noteText, term)
  );
}

export function getFragranceImage(fragrance) {
  return (
    fragrance.image_url_transparent ||
    fragrance.image_url ||
    '/bottle-placeholder.png'
  );
}

export async function fetchDiscoveryFragrances(supabase) {
  const pageSize = 500;
  const all = [];

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from('fragrances')
      .select(
        'id,name,brand,notes,accords,image_url,image_url_transparent,decant_price,decant_payment_link'
      )
      .order('id', { ascending: true })
      .range(start, start + pageSize - 1);

    if (error) throw error;

    const batch = data || [];
    all.push(...batch);

    if (batch.length < pageSize) break;
  }

  return all;
}
