// ==========================================================
// users.js - Sistema de Contas, Sess�es e Afiliados
// D.A.W.LOAD | Firebase Real-time Database
// ==========================================================

const USERS_KEY = 'dawload_users';
const SESSION_KEY = 'dawload_session';
const COMMISSION_RATE = 0.30;

const firebaseConfig = {
  apiKey: "AIzaSyB6bTEZv33O6oBlemYs1oLwkQ9Ixc2Z410",
  authDomain: "dowload-store.firebaseapp.com",
  projectId: "dowload-store",
  storageBucket: "dowload-store.firebasestorage.app",
  messagingSenderId: "993342659527",
  appId: "1:993342659527:web:2c0b033b562a9c445b17e2",
  measurementId: "G-H4QS5WPSLY"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let memoryUsers = [];
let isFirebaseLoaded = false;

db.collection("store_data").doc("users_doc").onSnapshot((doc) => {
  if (doc.exists) {
    memoryUsers = doc.data().usersArray || [];
  } else {
    memoryUsers = [];
    db.collection("store_data").doc("users_doc").set({ usersArray: [] });
  }
  
  localStorage.setItem(USERS_KEY, JSON.stringify(memoryUsers));

  if (!isFirebaseLoaded) {
    isFirebaseLoaded = true;
    document.dispatchEvent(new Event('firebaseLoaded'));
  }
});

// --- Utilit�rios ---

function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function generateAffiliateCode(name) {
  const base = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return base + rnd;
}

// --- Funções de Banco de Dados Modificadas para Firebase ---

function getUsers() {
  // Retorna os usu�rios da mem�ria RAM sincronizada com o Firebase
  return memoryUsers.length > 0 ? memoryUsers : (JSON.parse(localStorage.getItem(USERS_KEY)) || []);
}

function saveUsers(usersArray) {
  // Atualiza localmente
  memoryUsers = usersArray;
  localStorage.setItem(USERS_KEY, JSON.stringify(usersArray));
  
  // Atualiza no Firebase Assincronamente (Fire-and-forget)
  db.collection("store_data").doc("users_doc").set({ usersArray: usersArray })
    .catch(err => console.error("Erro ao salvar no Firebase:", err));
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

  const isOldPasswordMatch = user.password && user.password === btoa(password); const isNewPasswordMatch = user.passwordHash && user.passwordHash === hashPassword(password); if (!isOldPasswordMatch && !isNewPasswordMatch) {
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

// --- Status VIP ---
function becomeVIPMember(userId) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx].isVIPMember = true;
    saveUsers(users);
    return true;
  }
  return false;
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
  if (refCode && (!users[userIndex].affiliateCode || refCode.toLowerCase() !== users[userIndex].affiliateCode.toLowerCase())) {
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
  const idx = users.findIndex(u => u.affiliateCode && u.affiliateCode.toLowerCase() === affiliateCode.toLowerCase());
  if (idx === -1) return;

  // Verificação de Produtos Autorizados
  const authorizedProducts = users[idx].authorizedProducts;
  if (authorizedProducts && authorizedProducts.length > 0) {
    if (!authorizedProducts.includes(purchase.productId)) {
      return; // Bloqueia comissão: o afiliado não está autorizado a vender este produto
    }
  }

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

function updateAffiliateRateAdmin(userId, newRate, authProducts) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1 && users[idx].isAffiliate) {
    if (newRate !== undefined && !isNaN(newRate)) {
      users[idx].affiliateCommissionRate = parseFloat(newRate);
    }
    if (authProducts !== undefined) {
      users[idx].authorizedProducts = authProducts;
    }
    saveUsers(users);
  }
}

function getAffiliateDashboard(userId) {
  const user = getUserById(userId);
  if (!user) return null;
  return {
    affiliateCode: user.affiliateCode,
    isAffiliate: user.isAffiliate,
    authorizedProducts: user.authorizedProducts || [],
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
      const code = ref.toLowerCase();
      localStorage.setItem('dawload_ref', code);

    // Incrementar contador de cliques no afiliado
    const users = getUsers();
      const idx = users.findIndex(u => u.affiliateCode && u.affiliateCode.toLowerCase() === code);
    if (idx !== -1) {
      users[idx].totalClicks = (users[idx].totalClicks || 0) + 1;
      saveUsers(users);
    }
  }
}

// Executar rastreamento ao carregar a página
trackAffiliateRef();

// --- Criação Manual pelo Admin ---
function createAffiliateAdmin(name, email, commission, pix, password, authorizedProducts = []) {
  const users = getUsers();
  
  // Verifica se email já existe
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    if (!existingUser.isAffiliate) {
      existingUser.isAffiliate = true;
      existingUser.affiliateCode = existingUser.affiliateCode || generateAffiliateCode(existingUser.name);
      existingUser.affiliateCommissionRate = parseFloat(commission);
      existingUser.authorizedProducts = authorizedProducts;
      if (pix) existingUser.affiliatePixKey = pix;
      saveUsers(users);
    } else {
      // Já é afiliado, só atualiza os dados se fornecidos
      if (commission !== undefined) existingUser.affiliateCommissionRate = parseFloat(commission);
      if (pix !== undefined) existingUser.affiliatePixKey = pix;
      if (password) existingUser.passwordHash = hashPassword(password);
      if (authorizedProducts) existingUser.authorizedProducts = authorizedProducts;
      saveUsers(users);
    }
    return existingUser;
  }
  
  // Cria novo usuário
  const newUser = {
    id: "user-" + Date.now(),
    name: name,
    email: email,
    passwordHash: password ? hashPassword(password) : hashPassword("123456"),
    purchases: [],
    affiliateCode: generateAffiliateCode(name),
    isAffiliate: true,
    affiliateChannel: 'Cadastrado via Painel Admin',
    affiliateCommissionRate: parseFloat(commission),
    affiliatePixKey: pix || '',
    authorizedProducts: authorizedProducts,
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
    user.passwordHash = hashPassword(newPassword);
    saveUsers(users);
  }
}
// --- Remover Afiliado pelo Admin ---
function removeAffiliateAdmin(userId) {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index !== -1) {
    users[index].isAffiliate = false;
    // Opcionalmente manter o affiliateCode e stats para hist�rico, ou limpar
    saveUsers(users);
    return true;
  }
  return false;
}

// --- Client Password Reset Flow ---
function handleClientPasswordReset() {
  const email = prompt("Recupera��o de Senha\n\nDigite o seu e-mail cadastrado:");
  if (!email) return;
  
  const users = getUsers();
  const user = users.find(u => u.email === email);
  
  if (user) {
    const newPass = prompt("E-mail encontrado!\n\n(Simulação de Código) Conta verificada.\n\nDigite a sua NOVA SENHA agora:");
    if (newPass && newPass.length >= 6) {
      user.passwordHash = hashPassword(newPass);
      saveUsers(users);
      alert("Sua senha foi redefinida com sucesso!\nVocê já pode fazer login com a sua nova senha.");
    } else if (newPass) {
      alert("Erro: A nova senha deve ter pelo menos 6 caracteres.");
    }
  } else {
    alert("Não encontramos nenhuma conta cadastrada com esse e-mail.");
  }
}






