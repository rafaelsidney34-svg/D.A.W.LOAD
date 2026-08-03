const fs = require('fs');
const file = 'C:/Users/rafao/.gemini/antigravity-ide/scratch/kontakt-store/app.js';
let content = fs.readFileSync(file, 'utf8');

const target = `      document.getElementById("btnCopyAffiliateLink")?.addEventListener("click", () => {
        navigator.clipboard.writeText(link).catch(() => {});
        showToast("Link de afiliado copiado!");
      });
    } else {`;

const replacement = `      document.getElementById("btnCopyAffiliateLink")?.addEventListener("click", () => {
        navigator.clipboard.writeText(link).catch(() => {});
        showToast("Link de afiliado copiado!");
      });

      const btnConnectMP = document.getElementById("btnConnectMP");
      if (btnConnectMP) {
        btnConnectMP.href = \`http://localhost:3000/auth/mercadopago?affiliateId=\${user.id}\`;
      }
    } else {`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log('Success');
} else {
  console.log('Target not found');
}
