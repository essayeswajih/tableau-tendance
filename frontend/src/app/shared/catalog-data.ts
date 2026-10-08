export type Service = {
  id?: number;
  title: string;
  description: string;
  duration: string;
  price: string;
  image: string;
  category: string;
  is_active?: boolean;
  created_at?: string;
};

export type Product = {
  id?: number;
  title: string;
  slug?: string | null;
  category: string;
  price: string;
  badge?: string | null;
  image: string;
  is_active?: boolean;
  created_at?: string;
};

export type GalleryImage = {
  id?: number;
  src: string;
  alt: string;
  category: 'Interieurs' | 'Abstrait' | 'Nature' | 'Collections';
  caption: string;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
};

export const services: Service[] = [
  {
    title: 'Tableaux modernes',
    description: 'Des compositions elegantes pour pieces de vie, chambres et bureaux.',
    duration: 'Disponible',
    price: 'A partir de 32 DT',
    category: 'Modernes',
    image: '/uploads/tableau-abstrait.png',
  },
  {
    title: 'Calligraphie arabe',
    description: 'Une selection raffinee de tableaux calligraphiques decoratifs.',
    duration: 'Disponible',
    price: 'A partir de 32 DT',
    category: 'Calligraphie',
    image: '/uploads/tableau-calligraphie.png',
  },
  {
    title: 'Nature & paysages',
    description: 'Des visuels doux pour apporter lumiere et profondeur a vos murs.',
    duration: 'Disponible',
    price: 'A partir de 32 DT',
    category: 'Nature',
    image: '/uploads/tableau-fleurs-nature.png',
  },
  {
    title: 'Design abstrait',
    description: 'Couleurs, textures et formes pour une decoration contemporaine.',
    duration: 'Disponible',
    price: 'A partir de 32 DT',
    category: 'Abstrait',
    image: '/uploads/tableau-abstrait.png',
  },
  {
    title: 'Animaux',
    description: 'Des tableaux expressifs pour une touche chaleureuse et originale.',
    duration: 'Disponible',
    price: 'A partir de 32 DT',
    category: 'Animaux',
    image: '/uploads/tableau-animaux.png',
  },
  {
    title: 'Packs tableaux',
    description: 'Des ensembles harmonises pour habiller rapidement un espace complet.',
    duration: 'Disponible',
    price: 'Pack 4 a 99 DT',
    category: 'Offres',
    image: '/uploads/tableau-pack-4.png',
  },
  {
    title: 'Cuisine & divers',
    description: 'Des tableaux decoratifs pratiques pour coins repas et espaces de vie.',
    duration: 'Disponible',
    price: 'A partir de 32 DT',
    category: 'Divers',
    image: '/uploads/tableau-fleurs-nature.png',
  },
  {
    title: 'Grand format',
    description: 'Des pieces murales fortes pour creer un vrai point focal.',
    duration: 'Sur commande',
    price: 'A partir de 79 DT',
    category: 'Grand format',
    image: '/uploads/tableau-hero.png',
  },
];

export const products: Product[] = [
  {
    title: 'AB01',
    slug: 'tableau-ab01',
    category: 'Abstrait',
    price: '38 DT',
    badge: 'Populaire',
    image:
      '/uploads/tableau-abstrait.png',
  },
  {
    title: 'AB02',
    slug: 'tableau-ab02',
    category: 'Calligraphie',
    price: '32 DT',
    image:
      '/uploads/tableau-calligraphie.png',
  },
  {
    title: 'AB03',
    slug: 'tableau-ab03',
    category: 'Nature',
    price: '32 DT',
    badge: 'Promo',
    image:
      '/uploads/tableau-fleurs-nature.png',
  },
  {
    title: 'AB04',
    slug: 'tableau-ab04',
    category: 'Paysages',
    price: '32 DT',
    image:
      '/uploads/tableau-paysage.png',
  },
  {
    title: 'AB05',
    slug: 'tableau-ab05',
    category: 'Modernes',
    price: '39 DT',
    image:
      '/uploads/tableau-abstrait.png',
  },
  {
    title: 'AB06',
    slug: 'tableau-ab06',
    category: 'Animaux',
    price: '35 DT',
    badge: 'Nouveau',
    image:
      '/uploads/tableau-animaux.png',
  },
  {
    title: 'AB07',
    slug: 'tableau-ab07',
    category: 'Divers',
    price: '32 DT',
    image:
      '/uploads/tableau-fleurs-nature.png',
  },
  {
    title: 'AB08',
    slug: 'tableau-ab08',
    category: 'Modernes',
    price: '49 DT',
    image:
      '/uploads/tableau-hero.png',
  },
  {
    title: 'AB09',
    slug: 'tableau-ab09',
    category: 'Abstrait',
    price: '32 DT',
    badge: 'Nouveau',
    image:
      '/uploads/tableau-abstrait.png',
  },
  {
    title: 'AB10',
    slug: 'tableau-ab10',
    category: 'Nature',
    price: '36 DT',
    image:
      '/uploads/tableau-fleurs-nature.png',
  },
  {
    title: 'AB11',
    slug: 'tableau-ab11',
    category: 'Calligraphie',
    price: '45 DT',
    image:
      '/uploads/tableau-calligraphie.png',
  },
  {
    title: 'Pack 4 Tableaux tendance',
    slug: 'tableau-pack-4-tableaux-tendance',
    category: 'Offres',
    price: '99 DT',
    badge: 'Promo',
    image:
      '/uploads/tableau-pack-4.png',
  },
];

export const gallery: GalleryImage[] = [
  {
    src: '/uploads/tableau-hero.png',
    alt: 'Tableau decoratif elegant dans une piece moderne',
    category: 'Interieurs',
    caption: 'Ambiance lumineuse et mur soigne',
  },
  {
    src: '/uploads/tableau-abstrait.png',
    alt: 'Interieur lumineux avec decoration murale',
    category: 'Interieurs',
    caption: 'Un espace calme mis en valeur par les tableaux',
  },
  {
    src: '/uploads/tableau-calligraphie.png',
    alt: 'Detail de tableau moderne',
    category: 'Abstrait',
    caption: 'Texture et couleurs decoratives',
  },
  {
    src: '/uploads/tableau-fleurs-nature.png',
    alt: 'Decoration premium avec tableau mural',
    category: 'Interieurs',
    caption: 'Ambiance premium pour interieur chaleureux',
  },
  {
    src: '/uploads/tableau-paysage.png',
    alt: 'Selection de tableaux presentes dans un interieur',
    category: 'Collections',
    caption: 'Selection de references pour tous les styles',
  },
  {
    src: '/uploads/tableau-animaux.png',
    alt: 'Tableau nature dans une decoration douce',
    category: 'Nature',
    caption: 'Nature et tons doux pour une piece apaisee',
  },
  {
    src: '/uploads/tableau-hero.png',
    alt: 'Interieur moderne avec tableaux decoratifs',
    category: 'Interieurs',
    caption: 'Un lieu clair, doux et organise',
  },
  {
    src: '/uploads/tableau-abstrait.png',
    alt: 'Composition murale moderne',
    category: 'Abstrait',
    caption: 'Composition travaillee avec precision',
  },
  {
    src: '/uploads/tableau-pack-4.png',
    alt: 'Grand tableau decoratif dans un espace chaleureux',
    category: 'Collections',
    caption: 'Formats choisis pour sublimer le mur',
  },
];
