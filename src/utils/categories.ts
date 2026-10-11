import type { EventCategory } from '../types/index.ts';

/**
 * Taxonomia de coisas para fazer. Os slugs espelham `EventCategory` no backend
 * (app/models/schemas.py) e ficam gravados na base de dados: mudar um exige migração.
 */
export const EVENT_CATEGORIES: ReadonlyArray<{ slug: EventCategory; label: string }> = [
  { slug: 'comida_bebida', label: 'Comida e bebida' },
  { slug: 'vida_noturna', label: 'Vida noturna e festas' },
  { slug: 'musica_show', label: 'Música e shows' },
  { slug: 'arte_cultura', label: 'Arte e cultura' },
  { slug: 'teatro_cinema', label: 'Teatro e cinema' },
  { slug: 'palestra_conhecimento', label: 'Palestras e conhecimento' },
  { slug: 'cursos_oficinas', label: 'Cursos e oficinas' },
  { slug: 'estudo_leitura', label: 'Estudo e leitura' },
  { slug: 'debate_comunidade', label: 'Debates e comunidade' },
  { slug: 'voluntariado', label: 'Voluntariado' },
  { slug: 'desporto', label: 'Esportes' },
  { slug: 'academia_exercicio', label: 'Academia e exercício' },
  { slug: 'bem_estar', label: 'Bem-estar' },
  { slug: 'praia_natureza', label: 'Praia e natureza' },
  { slug: 'turismo_passeio', label: 'Turismo e passeios' },
  { slug: 'jogos', label: 'Jogos' },
  { slug: 'compras_lojas', label: 'Compras e lojas' },
  { slug: 'feira_mercado', label: 'Feiras e mercados' },
  { slug: 'familia_criancas', label: 'Família e crianças' },
  { slug: 'religiao_espiritualidade', label: 'Religião e espiritualidade' },
  { slug: 'tecnologia_negocios', label: 'Tecnologia e negócios' },
  { slug: 'outros', label: 'Outros' },
];

const LABELS = new Map<string, string>(EVENT_CATEGORIES.map((c) => [c.slug, c.label]));

export function isEventCategory(value: string): value is EventCategory {
  return LABELS.has(value);
}

/** Rótulo para mostrar; texto fora da taxonomia (eventos antigos) conta como Outros. */
export function categoryLabel(value: string | null): string | null {
  if (value === null) return null;
  return LABELS.get(value) ?? 'Outros';
}
