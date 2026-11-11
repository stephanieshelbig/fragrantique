
export const DISCOVERY_CATEGORIES = [
  {
    slug: 'florals',
    name: 'Florals',
    description: 'Romantic, elegant & blooming',
    emoji: '🌸',
    color: '#f9e4eb',
    accords: [
      'floral',
      'white floral',
      'yellow floral',
      'soft floral',
      'blue floral'
    ],
    notes: [
      'rose', 'jasmine', 'tuberose', 'gardenia',
      'peony', 'magnolia', 'freesia', 'violet',
      'lily', 'orange blossom', 'ylang-ylang',
      'narcissus', 'iris', 'orchid', 'osmanthus',
      'honeysuckle'
    ]
  },
  {
    slug: 'fresh-citrus',
    name: 'Fresh & Citrus',
    description: 'Bright, sparkling & refreshing',
    emoji: '🍋',
    color: '#eef1dc',
    accords: ['citrus', 'fresh', 'fresh spicy', 'green'],
    notes: [
      'bergamot', 'lemon', 'lime', 'grapefruit',
      'mandarin', 'orange', 'yuzu', 'citron',
      'petitgrain', 'verbena'
    ]
  },
  {
    slug: 'gourmands-vanillas',
    name: 'Gourmands & Vanillas',
    description:
      'Deliciously sweet, creamy, comforting, and irresistible scents.',
    emoji: '🍦',
    color: '#f5e6db',
    accords: [
      'vanilla',
      'sweet',
      'gourmand',
      'caramel',
      'chocolate',
      'lactonic',
      'tonka'
    ],
    notes: [
      'vanilla',
      'caramel',
      'chocolate',
      'praline',
      'honey',
      'marshmallow',
      'tonka bean',
      'toffee'
    ]
  },
  {
    slug: 'woods',
    name: 'Woody',
    description:
      'Rich, earthy, smooth, and sophisticated woody fragrances.',
    emoji: '🌲',
    color: '#e5e9df',
    accords: ['woody'],
    notes: [
      'sandalwood',
      'cedar',
      'cedarwood',
      'vetiver',
      'guaiac wood',
      'cashmere wood',
      'patchouli'
    ]
  },
  {
    slug: 'amber',
    name: 'Amber',
    description:
      'Warm, sensual, and luxurious amber fragrances.',
    emoji: '🧡',
    color: '#f4e4d9',
    accords: ['amber', 'balsamic'],
    notes: [
      'amber',
      'ambergris',
      'benzoin',
      'labdanum',
      'myrrh',
      'resin',
      'tolu balsam'
    ]
  },
  {
    slug: 'tropical-fruity',
    name: 'Tropical & Fruity',
    description: 'Juicy, sunny & playful',
    emoji: '🥭',
    color: '#f9e5dc',
    accords: ['fruity', 'tropical', 'fruity floral'],
    notes: [
      'mango', 'pineapple', 'coconut',
      'passionfruit', 'papaya', 'guava',
      'peach', 'pear', 'apple', 'strawberry',
      'raspberry', 'cherry', 'lychee',
      'litchi', 'melon', 'watermelon',
      'plum', 'fig'
    ]
  },
  {
    slug: 'musks',
    name: 'Musky',
    description: 'Soft, sensual & skin-like',
    emoji: '☁️',
    color: '#ede8ed',
    accords: ['musky', 'musk'],
    notes: [
      'musk',
      'ambrette',
      'ambrettolide',
      'white musk'
    ]
  },
  {
    slug: 'roses',
    name: 'Roses',
    description: 'From delicate petals to dark roses',
    emoji: '🌹',
    color: '#f4dce2',
    accords: ['rose'],
    notes: [
      'rose',
      'damask rose',
      'turkish rose',
      'bulgarian rose',
      'rose absolute'
    ]
  },
  {
    slug: 'aquatics',
    name: 'Aquatics',
    description: 'Ocean breezes & fresh rain',
    emoji: '🌊',
    color: '#e1edf0',
    accords: ['aquatic', 'marine', 'ozonic', 'watery'],
    notes: [
      'sea salt',
      'sea water',
      'marine notes',
      'aquatic notes',
      'water notes',
      'ozonic notes'
    ]
  },
  {
    slug: 'spicy',
    name: 'Spicy',
    description: 'Bold, intriguing & seductive',
    emoji: '✨',
    color: '#f2e2d9',
    accords: ['warm spicy', 'fresh spicy', 'spicy'],
    notes: [
      'cinnamon', 'cardamom', 'clove',
      'pepper', 'saffron', 'ginger',
      'nutmeg', 'cumin'
    ]
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
    notes: [
      'green tea',
      'black tea',
      'white tea',
      'matcha',
      'oolong',
      'mate',
      'lapsang souchong'
    ]
  }
];

// ---------------------------------------------
// CATEGORY LOOKUP
// ---------------------------------------------

export function getCategory(slug) {
  return DISCOVERY_CATEGORIES.find(
    (category) => category.slug === slug
  );
}

// ---------------------------------------------
// NORMALIZE ACCORD TEXT
// ---------------------------------------------

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[-–—_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------
// FLEXIBLE ACCORD PARSING
// ---------------------------------------------

function parseAccords(value) {
  if (value == null || value === '') {
    return [];
  }

  // Support arrays of strings and arrays of objects.
  if (Array.isArray(value)) {
    return value
      .map((accord) => {
        if (typeof accord === 'string') {
          return accord;
        }

        if (accord && typeof accord === 'object') {
          return (
            accord.name ??
            accord.accord ??
            accord.label ??
            ''
          );
        }

        return '';
      })
      .map(normalize)
      .filter(Boolean);
  }

  // Support objects containing an accords array.
  if (typeof value === 'object') {
    if (Array.isArray(value.accords)) {
      return parseAccords(value.accords);
    }

    return [];
  }

  if (typeof value !== 'string') {
    return [];
  }

  const text = value.trim();

  if (!text) return [];

  // Try JSON first.
  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parseAccords(parsed);
    }

    if (parsed && typeof parsed === 'object') {
      return parseAccords(parsed);
    }

    if (typeof parsed === 'string') {
      return parseAccords(parsed);
    }
  } catch {
    // Not JSON. Continue with plain text parsing.
  }

  // Support PostgreSQL-style text arrays.
  // Example: {blue floral,fruity,musky}
  if (text.startsWith('{') && text.endsWith('}')) {
    return text
      .slice(1, -1)
      .split(',')
      .map((item) =>
        normalize(item.replace(/^["']|["']$/g, ''))
      )
      .filter(Boolean);
  }

  // Support comma, semicolon, pipe, or
  // newline-separated accords.
  return text
    .split(/[,;|\n]+/)
    .map(normalize)
    .filter(Boolean);
}

// ---------------------------------------------
// CATEGORY MATCHING
// ---------------------------------------------

export function matchesCategory(fragrance, category) {
  if (!fragrance || !category) {
    return false;
  }

  const accords = parseAccords(fragrance.accords);

  if (accords.length === 0) {
    return false;
  }

  // TEA:
  // Match "tea" anywhere in the accords.
  if (category.slug === 'tea') {
    return accords.some(
      (accord) => normalize(accord) === 'tea'
    );
  }

  // MUSKS:
  // Match "musky" anywhere in the accords.
  if (category.slug === 'musks') {
    return accords.some(
      (accord) => normalize(accord) === 'musky'
    );
  }

  // AQUATICS:
  // Match "aquatic" anywhere in the accords.
  if (category.slug === 'aquatics') {
    return accords.some(
      (accord) => normalize(accord) === 'aquatic'
    );
  }

  // ALL OTHER CATEGORIES:
  // Match only the PRIMARY (first) accord.
  const primaryAccord = normalize(accords[0]);

  return category.accords.some(
    (term) => normalize(term) === primaryAccord
  );
}

// ---------------------------------------------
// FRAGRANCE IMAGE
// ---------------------------------------------

export function getFragranceImage(fragrance) {
  return (
    fragrance?.image_url_transparent ||
    fragrance?.image_url ||
    '/bottle-placeholder.png'
  );
}

// ---------------------------------------------
// FETCH ALL DISCOVERY FRAGRANCES
// ---------------------------------------------

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

    if (error) {
      throw error;
    }

    const batch = data || [];

    all.push(...batch);

    if (batch.length < pageSize) {
      break;
    }
  }

  return all;
}
