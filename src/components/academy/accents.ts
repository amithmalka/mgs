/** Accent colour per module position — purely visual, no DB column needed. */
const ACCENTS = ['#5EE6D0', '#8193FA', '#4ADE80', '#8193FA', '#8193FA', '#F472B6'];

export const accentOf = (index: number) => ACCENTS[index % ACCENTS.length];
