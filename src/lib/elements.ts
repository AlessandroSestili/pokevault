export interface ElementStyle {
  color: string
  glow: string
  glyph: string
  label: string
}

const ELEMENT_MAP: Record<string, ElementStyle> = {
  fire:      { color: '#FF5B47', glow: '#FFB7AB', glyph: '▲', label: 'Fire' },
  fighting:  { color: '#FF5B47', glow: '#FFB7AB', glyph: '▲', label: 'Fighting' },
  water:     { color: '#3B9DFF', glow: '#A8D2FF', glyph: '◐', label: 'Water' },
  lightning: { color: '#FFCB2E', glow: '#FFE89A', glyph: '✦', label: 'Lightning' },
  electric:  { color: '#FFCB2E', glow: '#FFE89A', glyph: '✦', label: 'Electric' },
  grass:     { color: '#37C26B', glow: '#A7EBC1', glyph: '✿', label: 'Grass' },
  psychic:   { color: '#B07BFF', glow: '#DCC5FF', glyph: '✺', label: 'Psychic' },
  dragon:    { color: '#B07BFF', glow: '#DCC5FF', glyph: '✺', label: 'Dragon' },
  metal:     { color: '#B07BFF', glow: '#DCC5FF', glyph: '✺', label: 'Metal' },
  fairy:     { color: '#FF7AC4', glow: '#FFC7E5', glyph: '❋', label: 'Fairy' },
  darkness:  { color: '#7A8AA0', glow: '#C4CCD8', glyph: '◆', label: 'Darkness' },
  colorless: { color: '#7A8AA0', glow: '#C4CCD8', glyph: '◆', label: 'Colorless' },
}

const DEFAULT: ElementStyle = { color: '#7A8AA0', glow: '#C4CCD8', glyph: '◆', label: 'Unknown' }

export function getElement(elementStr: string | null): ElementStyle {
  if (!elementStr) return DEFAULT
  const key = elementStr.toLowerCase().trim()
  return ELEMENT_MAP[key] ?? { ...DEFAULT, label: elementStr }
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('')
}
