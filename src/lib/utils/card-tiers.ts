export type CardTier = 'bronce' | 'plata' | 'oro' | 'oro_premium';

export function getCardTier(overall: number): CardTier {
  if (overall < 70) return 'bronce';
  if (overall < 80) return 'plata';
  if (overall < 90) return 'oro';
  return 'oro_premium';
}

export function getTierStyles(tier: CardTier) {
  switch (tier) {
    case 'bronce':
      return {
        borderColor: 'border-[#CD7F32]/60',
        textColor: 'text-[#CD7F32]',
        shadow: 'shadow-[0_0_15px_rgba(205,127,50,0.15)]',
        bgGlow: 'bg-[radial-gradient(circle_at_center,rgba(205,127,50,0.1),transparent_70%)]',
      };
    case 'plata':
      return {
        borderColor: 'border-[#C0C0C0]/60',
        textColor: 'text-[#C0C0C0]',
        shadow: 'shadow-[0_0_15px_rgba(192,192,192,0.15)]',
        bgGlow: 'bg-[radial-gradient(circle_at_center,rgba(192,192,192,0.1),transparent_70%)]',
      };
    case 'oro':
      return {
        borderColor: 'border-[#FFD700]/70',
        textColor: 'text-[#FFD700]',
        shadow: 'shadow-[0_0_20px_rgba(255,215,0,0.25)]',
        bgGlow: 'bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.15),transparent_70%)]',
      };
    case 'oro_premium':
      return {
        borderColor: 'border-[#FFDF00] border-3',
        textColor: 'text-[#FFDF00] drop-shadow-[0_0_8px_rgba(255,223,0,0.8)]',
        shadow: 'shadow-[0_0_30px_rgba(255,223,0,0.4)]',
        bgGlow: 'bg-[radial-gradient(circle_at_center,rgba(255,223,0,0.25),transparent_70%)]',
      };
  }
}
