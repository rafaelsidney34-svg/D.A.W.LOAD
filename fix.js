const fs = require('fs');
let text = fs.readFileSync('C:/Users/rafao/.gemini/antigravity-ide/scratch/kontakt-store/index.html', 'utf8');

const replacements = {
  'ðŸ‘‹': '👋',
  'ðŸ‘‘': '👑',
  'ðŸ” ': '🔍',
  'ðŸŽ¹': '🎹',
  'ðŸŽ ': '🎁',
  'Bibliotecas GrÃ¡tis': 'Bibliotecas Grátis',
  'â­ ': '⭐',
  'ðŸš€': '🚀',
  'PrÃ©-Vendas': 'Pré-Vendas',
  'ðŸŽ›ï¸ ': '🎛️',
  'PromoÃ§Ã£o de Combos': 'Promoção de Combos',
  'automÃ¡tico': 'automático',
  'prÃ³prio': 'próprio',
  'Ã© aplicado': 'é aplicado',
  'FaÃ§a parte': 'Faça parte',
  'lanÃ§amentos': 'lançamentos',
  'HistÃ³rico': 'Histórico',
  'disponÃ­veis': 'disponíveis',
  'Programa de Parceiros Ã© exclusivo': 'Programa de Parceiros é exclusivo',
  'CRÃ‰DITO': 'CRÉDITO',
  'DÃ‰BITO': 'DÉBITO',
  'CartÃ£o': 'Cartão',
  'NÃºmero': 'Número',
  'Â©': '©',
  'MÃºsicos': 'Músicos',
  'abrirÃ¡': 'abrirá',
  'serÃ¡': 'será',
  'OlÃ¡!': 'Olá!',
  'tÃ³pico': 'tópico',
  'InstalaÃ§Ã£o': 'Instalação',
  'DÃºvidas': 'Dúvidas',
  'dÃºvida': 'dúvida',
  'NÃ£o tem': 'Não tem',
  'mÃ­nimo': 'mínimo',
  'JÃ¡ tem': 'Já tem',
  'SatisfaÃ§Ã£o': 'Satisfação',
  'incrÃ­veis': 'incríveis',
  'stage Ã© absurdo': 'stage é absurdo',
  'produÃ§Ã£o': 'produção',
  'MÃºsica': 'Música',
  'Ã cone do Carrinho': 'Ícone do Carrinho',
  'serÃ£o gerados': 'serão gerados',
  'PrÃ³ximo slide': 'Próximo slide',
  'rotaÃ§Ã£o': 'rotação',
  'SincronizaÃ§Ã£o AutomÃ¡tica': 'Sincronização Automática',
  ' CARTÃƒO': ' CARTÃO',
  'ComissÃ£o': 'Comissão',
  'vocÃª': 'você',
  'VocÃª': 'Você'
};

for (const [bad, good] of Object.entries(replacements)) {
  text = text.split(bad).join(good);
}

fs.writeFileSync('C:/Users/rafao/.gemini/antigravity-ide/scratch/kontakt-store/index.html', text, 'utf8');
console.log('Fixed index.html mojibake');
