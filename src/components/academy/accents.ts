/** Accent colour per module position — purely visual, no DB column needed. */
const ACCENTS = ['#D4AF37', '#A78BFA', '#34D399', '#F59E0B', '#60A5FA', '#F472B6'];

export const accentOf = (index: number) => ACCENTS[index % ACCENTS.length];
