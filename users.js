// ==========================================================
// users.js — Sistema de Contas, Sessões e Afiliados
// D.A.W.LOAD | Tudo salvo no localStorage do navegador
// ==========================================================

const USERS_KEY = 'dawload_users';
const SESSION_KEY = 'dawload_session';
const COMMISSION_RATE = 0.30; // 30% de comissão para afiliados

// --- Utilitários ---

// Hash simples para ofuscar senhas (não criptográfico, apenas para demo)
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Gera código de afiliado único: 4 letras do nome + 4 dígitos aleatórios
function generateAffiliateCode(name) {
  const prefix = name.replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'DAWD';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${suffix}`;
}

// --- CRUD de Usuários ---

function getUsers() {
  const saved = localStorage.getItem(USERS_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getUserById(id) {
  return getUsers().find(u => u.id === id) || null;
}

// --- Registro e Login ---

function registerUser(name, email, password) {
  const users = getUsers();

  if (!name || !email || !password) {
    return { success: false, error: 'Preencha todos os campos.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'A senha deve ter ao menos 6 caracteres.' };
  }

  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'Este e-mail já está cadastrado.' };
  }

  const newUser = {
    id: Date.now().toString(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: hashPassword(password),
    affiliateCode: generateAffiliateCode(name),
    isAffiliate: false,
    affiliateChannel: '',
    purchases: [],         // Array de compras realizadas
    affiliateConversions: [], // Array de conversões atribuídas
    totalCommission: 0,
    totalClicks: 0,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  startSession(newUser);

  return { success: true, user: newUser };
}

function loginUser(email, password) {
  if (!email || !password) {
    return { success: false, error: 'Informe e-mail e senha.' };
  }

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return { success: false, error: 'E-mail não encontrado.' };
  }

  if (user.passwordHash !== hashPassword(password)) {
    return { success: false, error: 'Senha incorreta.' };
  }

  startSession(user);
  return { success: true, user };
}

function logoutUser() {
  sessionStorage.removeItem(SESSION_KEY);
}

// --- Sessão ---

function startSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    affiliateCode: user.affiliateCode
  }));
}

function getCurrentUser() {
  const session = sessionStorage.getItem(SESSION_KEY);
  if (!session) return null;
  const { id } = JSON.parse(session);
  return getUserById(id);
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

// --- Compras ---

function addUserPurchase(userId, product, paymentMethod, amount, installments) {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) return null;

  const purchase = {
    id: 'purch_' + Date.now(),
    productId: product.id,
    productTitle: product.title,
    productImage: product.image || '',
    amount: parseFloat(amount),
    paymentMethod,
    installments: installments || 1,
    date: new Date().toISOString(),
    downloadLink: product.downloadLink || ''
  };

  users[userIndex].purchases.push(purchase);
  saveUsers(users);

  // Compatibilidade com o sistema antigo de IDs de compra
  addPurchaseId(product.id);

  // Checar afiliado e creditar comissão
  const refCode = localStorage.getItem('dawload_ref');
  if (refCode && refCode !== users[userIndex].affiliateCode) {
    creditAffiliateCommission(refCode, purchase);
  }

  return purchase;
}

function getUserPurchases(userId) {
  const user = getUserById(userId);
  return user ? user.purchases : [];
}

// --- Afiliados ---

function registerAsAffiliate(userId, channel) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: 'Usuário não encontrado.' };

  users[idx].isAffiliate = true;
  users[idx].affiliateChannel = channel || '';
  users[idx].affiliateCommissionRate = COMMISSION_RATE; // Taxa padrão inicial
  saveUsers(users);
  return { success: true };
}

function creditAffiliateCommission(affiliateCode, purchase) {
  const users = getUsers();
  const idx = users.findIndex(u => u.affiliateCode === affiliateCode);
  if (idx === -1) return;

  const rate = users[idx].affiliateCommissionRate !== undefined ? users[idx].affiliateCommissionRate : COMMISSION_RATE;
  const commission = parseFloat((purchase.amount * rate).toFixed(2));
  users[idx].affiliateConversions.push({
    date: new Date().toISOString(),
    productTitle: purchase.productTitle,
    saleAmount: purchase.amount,
    commission
  });
  users[idx].totalCommission = parseFloat(
    (users[idx].totalCommission + commission).toFixed(2)
  );
  saveUsers(users);
}

function updateAffiliateRateAdmin(userId, newRate) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1 && users[idx].isAffiliate) {
    users[idx].affiliateCommissionRate = parseFloat(newRate);
    saveUsers(users);
  }
}

function getAffiliateDashboard(userId) {
  const user = getUserById(userId);
  if (!user) return null;
  return {
    affiliateCode: user.affiliateCode,
    isAffiliate: user.isAffiliate,
    totalClicks: user.totalClicks || 0,
    conversions: user.affiliateConversions || [],
    totalConversions: (user.affiliateConversions || []).length,
    totalCommission: user.totalCommission || 0
  };
}

// Gerar link de afiliado completo
function getAffiliateLink(affiliateCode) {
  const base = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
  return `${base}?ref=${affiliateCode}`;
}

// Rastrear visita via link de afiliado
function trackAffiliateRef() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    const code = ref.toUpperCase();
    localStorage.setItem('dawload_ref', code);

    // Incrementar contador de cliques no afiliado
    const users = getUsers();
    const idx = users.findIndex(u => u.affiliateCode === code);
    if (idx !== -1) {
      users[idx].totalClicks = (users[idx].totalClicks || 0) + 1;
      saveUsers(users);
    }
  }
}

// Executar rastreamento ao carregar a página
trackAffiliateRef();

// --- Criação Manual pelo Admin ---
function createAffiliateAdmin(name, email, commission, pix, password) {
  const users = getUsers();
  
  // Verifica se email já existe
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    if (!existingUser.isAffiliate) {
      existingUser.isAffiliate = true;
      existingUser.affiliateCode = existingUser.affiliateCode || generateAffiliateCode(existingUser.name);
      existingUser.affiliateCommissionRate = parseFloat(commission);
      if (pix) existingUser.affiliatePixKey = pix;
      saveUsers(users);
    } else {
      // Já é afiliado, só atualiza os dados se fornecidos
      if (commission !== undefined) existingUser.affiliateCommissionRate = parseFloat(commission);
      if (pix) existingUser.affiliatePixKey = pix;
      if (password) existingUser.password = btoa(password);
      saveUsers(users);
    }
    return existingUser;
  }
  
  // Cria novo usuário
  const newUser = {
    id: "user-" + Date.now(),
    name: name,
    email: email,
    password: password ? btoa(password) : btoa("123456"),
    purchases: [],
    affiliateCode: generateAffiliateCode(name),
    isAffiliate: true,
    affiliateChannel: 'Cadastrado via Painel Admin',
    affiliateCommissionRate: parseFloat(commission),
    affiliatePixKey: pix || '',
    affiliateConversions: [],
    affiliateClicks: 0,
    totalCommission: 0
  };
  
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

function updateAffiliatePasswordAdmin(userId, newPassword) {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.password = btoa(newPassword);
    saveUsers(users);
  }
}
