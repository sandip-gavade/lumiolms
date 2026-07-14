// Deterministic per-course visual identity (gradient + monogram) — real courses don't carry
// a "category key" the way the original design mock's hardcoded seed data did, so we derive
// a stable choice from the id/title itself instead of a lookup table.
const GRADIENTS = [
  'linear-gradient(135deg,#6366F1,#4338CA)',
  'linear-gradient(135deg,#EC4899,#F97316)',
  'linear-gradient(135deg,#0EA5A4,#0369A1)',
  'linear-gradient(135deg,#F59E0B,#EF4444)',
  'linear-gradient(135deg,#8B5CF6,#D946EF)',
  'linear-gradient(135deg,#10B981,#84CC16)',
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function gradientFor(seed: string): string {
  return GRADIENTS[hashString(seed) % GRADIENTS.length];
}

export function monogramOf(title: string): string {
  const words = title.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = ['#4F46E5', '#EC4899', '#0EA5A4', '#F59E0B', '#8B5CF6', '#16A34A', '#EF4444'];

export function avatarColorFor(seed: string): string {
  return AVATAR_COLORS[hashString(seed) % AVATAR_COLORS.length];
}
