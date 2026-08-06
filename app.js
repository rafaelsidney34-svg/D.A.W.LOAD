// Dados Dinâmicos em Memória - defaultProducts vem de database.js
let productsData = [];
let combosData = [];

function loadDatabase() {
  const saved = localStorage.getItem("dawload_products");
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.length > 0 && (!parsed[0].image || !parsed[0].desc)) {
      productsData = defaultProducts.map(p => ({ ...p }));
    } else {
      productsData = parsed;
    }
  } else {
    productsData = defaultProducts.map(p => ({ ...p }));
  }

  const savedCombos = localStorage.getItem("dawload_combos");
  if (savedCombos) {
    combosData = JSON.parse(savedCombos);
  } else {
    combosData = typeof defaultCombos !== "undefined" ? defaultCombos.map(c => ({ ...c })) : [];
  }

  function applyVipLinks(vipLinks) {
    for(let i=1; i<=6; i++) {
      const btn = document.getElementById("vipBtnLink" + i);
      if (btn && vipLinks["link" + i]) btn.href = vipLinks["link" + i];
    }
  }

  const savedVipLinks = localStorage.getItem("dawload_vip_links");
  if (savedVipLinks) {
    applyVipLinks(JSON.parse(savedVipLinks));
  }

  if (typeof db !== "undefined") {
    db.collection("store_data").doc("products_doc").onSnapshot((doc) => {
      if (doc.exists) {
        productsData = doc.data().productsArray || [];
        localStorage.setItem("dawload_products", JSON.stringify(productsData));
        document.dispatchEvent(new Event('productsUpdated'));
      }
    });

    db.collection("store_data").doc("combos_doc").onSnapshot((doc) => {
      if (doc.exists) {
        combosData = doc.data().combosArray || [];
        localStorage.setItem("dawload_combos", JSON.stringify(combosData));
        document.dispatchEvent(new Event('combosUpdated'));
      }
    });

    db.collection("store_data").doc("vip_links_doc").onSnapshot((doc) => {
      if (doc.exists) {
        const vipLinks = doc.data();
        localStorage.setItem("dawload_vip_links", JSON.stringify(vipLinks));
        applyVipLinks(vipLinks);
      }
    });
  }
}
loadDatabase();

// Funções de Gerenciamento de Compras Simuladas
function getPurchasedIds() {
  const saved = localStorage.getItem("dawload_purchases");
  return saved ? JSON.parse(saved) : [];
}

function addPurchaseId(idString) {
  let idsToProcess = idString;
  if (idString === 'all-paid') {
      idsToProcess = productsData.filter(p => p.category !== "Grátis").map(p => p.id).join(',');
  }
  const ids = idsToProcess.split(',');
  const purchases = getPurchasedIds();
  let changed = false;
  ids.forEach(id => {
    id = id.trim();
    if (id && !purchases.includes(id)) {
      purchases.push(id);
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem("dawload_purchases", JSON.stringify(purchases));
  }
}

function clearPurchases() {
  localStorage.removeItem("dawload_purchases");
}

// Dados dos Membros (Widgets)
const topMembers = [
  { nome: "Philippe Romain", icone: "⭐", tipo: "membro" },
  { nome: "José Vieira", icone: "⭐", tipo: "membro" },
  { nome: "VANDERLEI Cruz", icone: "👑", tipo: "top" },
  { nome: "AMIRRUL HAFIZ", icone: "⭐", tipo: "membro" },
  { nome: "Eduardo Porcho", icone: "⭐", tipo: "membro" },
  { nome: "Viktor Stos", icone: "⭐", tipo: "membro" },
  { nome: "Daniel Rios", icone: "👑", tipo: "top" },
  { nome: "Cleiton Pacheco Gino", icone: "⭐", tipo: "membro" },
  { nome: "André Sampaio", icone: "👑", tipo: "top" },
  { nome: "Darin Costa", icone: "👑", tipo: "top" },
  { nome: "Steve Landry", icone: "👑", tipo: "top" }
];

const topWeekMembers = topMembers.filter(m => m.tipo === "top");
const regularMembers = topMembers.filter(m => m.tipo !== "top");
const regularMemberIcons = ["❤️", "⭐", "🎹", "🙌", "🔥", "✨", "🎧", "🚀", "💎"];

// ==========================================================
//  LÓGICA PRINCIPAL — DOMContentLoaded
// ==========================================================
document.addEventListener("DOMContentLoaded", function () {
  // --- Refs DOM ---
  const searchInput = document.getElementById("topProductSearch");
  const searchButton = document.getElementById("topSearchIconButton");
  const suggestionsDropdown = document.getElementById("topSearchSuggestions");
  const categoryButtons = document.querySelectorAll(".category-btn");
  const productGrid = document.getElementById("productGrid");

  const searchOverlay = document.getElementById("searchOverlay");
  const searchOverlayClose = document.getElementById("searchOverlayClose");
  const searchOverlayBackdrop = document.getElementById("searchOverlayBackdrop");
  const searchOverlayResults = document.getElementById("searchOverlayResults");
  const searchOverlayQuery = document.getElementById("searchOverlayQuery");
  const searchOverlayEmpty = document.getElementById("searchOverlayEmpty");

  const demoModal = document.getElementById("demoModal");
  const demoClose = document.getElementById("demoClose");
  const demoTitle = document.getElementById("demoTitle");
  const demoOptions = document.getElementById("demoOptions");

  // Checkout
  const checkoutModal = document.getElementById("checkoutModal");
  const checkoutClose = document.getElementById("checkoutClose");
  const checkoutProdTitle = document.getElementById("checkoutProdTitle");
  const checkoutProdPrice = document.getElementById("checkoutProdPrice");
  const checkoutBody = document.getElementById("checkoutBody");
  const checkoutProcessing = document.getElementById("checkoutProcessing");
  const checkoutSuccess = document.getElementById("checkoutSuccess");
  const btnGoToDownload = document.getElementById("btnGoToDownload");

  // Minha Conta
  const navMinhaContaLink = document.getElementById("navMinhaContaLink");
  const myAccountOverlay = document.getElementById("myAccountOverlay");
  const myAccountOverlayClose = document.getElementById("myAccountOverlayClose");
  const myAccountOverlayBackdrop = document.getElementById("myAccountOverlayBackdrop");
  const myAccountDownloadsList = document.getElementById("myAccountDownloadsList");
  const btnResetPurchases = document.getElementById("btnResetPurchases");

  // Member overlay
  const memberOverlay = document.getElementById("memberOverlay");
  const memberOverlayClose = document.getElementById("memberOverlayClose");
  const memberOverlayBackdrop = document.getElementById("memberOverlayBackdrop");
  const memberRankList = document.getElementById("memberRankList");
  const memberOverlayCta = document.getElementById("memberOverlayCta");
  const topMembersRankButton = document.getElementById("topMembersRankButton");
  const topMembersJoinButton = document.getElementById("topMembersJoinButton");

  // Auth
  const btnOpenLogin = document.getElementById("btnOpenLogin");
  const btnOpenRegister = document.getElementById("btnOpenRegister");
  const loginModal = document.getElementById("loginModal");
  const registerModal = document.getElementById("registerModal");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginError = document.getElementById("loginError");
  const registerError = document.getElementById("registerError");
  const headerActions = document.getElementById("headerActions");
  const userGreeting = document.getElementById("userGreeting");
  const userGreetingName = document.getElementById("userGreetingName");
  const btnHeaderLogout = document.getElementById("btnHeaderLogout");

  const toast = document.getElementById("toast");

  // Estado
  let currentFilter = "all";
  let activeSearchQuery = "";
  let selectedSuggestionIndex = -1;
  let currentSuggestions = [];
  let selectedProductForCheckout = null;
  let pixCountdownInterval = null;
  let pixAutoSyncTimer = null;
  let toastTimer;
  let cart = JSON.parse(localStorage.getItem('dawload_cart')) || [];

  // ==========================================================
  //  UTILITÃÆ’Ã†â€™Ãâ€šRIOS
  // ==========================================================
  function showToast(msg, duration) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), duration || 2600);
  }

  function formatBRL(value) {
    return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
  }

  // ==========================================================
  //  CART SYSTEM
  // ==========================================================
  const cartIconToggle = document.getElementById("cartIconToggle");
  const cartBadgeCount = document.getElementById("cartBadgeCount");
  const cartDrawer = document.getElementById("cartDrawer");
  const cartDrawerBackdrop = document.getElementById("cartDrawerBackdrop");
  const cartDrawerClose = document.getElementById("cartDrawerClose");
  const cartItemsContainer = document.getElementById("cartItemsContainer");
  const cartTotalPrice = document.getElementById("cartTotalPrice");
  const btnCheckoutCart = document.getElementById("btnCheckoutCart");
  const btnClearCart = document.getElementById("btnClearCart");

  function saveCart() {
    localStorage.setItem('dawload_cart', JSON.stringify(cart));
    updateCartUI();
  }

  function updateCartUI() {
    if (cartBadgeCount) {
      cartBadgeCount.textContent = cart.length;
    }
    
    if (cartItemsContainer) {
      cartItemsContainer.innerHTML = '';
      if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="cart-empty-msg">Seu carrinho está vazio.</div>';
        if (cartTotalPrice) cartTotalPrice.textContent = 'R$ 0,00';
        if (btnCheckoutCart) btnCheckoutCart.disabled = true;
        return;
      }

      let total = 0;
      cart.forEach((item, index) => {
        total += item.price;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
          <img src="${item.imgUrl || 'assets/logo.jpg'}" alt="${item.title}" class="cart-item-img">
          <div class="cart-item-details">
            <div class="cart-item-title">${item.title}</div>
            <div class="cart-item-price">${formatBRL(item.price)}</div>
          </div>
          <button class="cart-item-remove" data-index="${index}" title="Remover">❌</button>
        `;
        cartItemsContainer.appendChild(div);
      });

      if (cartTotalPrice) cartTotalPrice.textContent = formatBRL(total);
      if (btnCheckoutCart) btnCheckoutCart.disabled = false;

      // Bind remove buttons
      document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-index'));
          cart.splice(idx, 1);
          saveCart();
          showToast("Item removido do carrinho");
        });
      });
    }
  }

  function toggleCartDrawer() {
    const isShowing = cartDrawer.classList.contains('show');
    if (isShowing) {
      cartDrawer.classList.remove('show');
      cartDrawerBackdrop.classList.remove('show');
    } else {
      updateCartUI();
      cartDrawer.classList.add('show');
      cartDrawerBackdrop.classList.add('show');
    }
  }

  if (cartIconToggle) cartIconToggle.addEventListener("click", toggleCartDrawer);
  if (cartDrawerClose) cartDrawerClose.addEventListener("click", toggleCartDrawer);
  if (cartDrawerBackdrop) cartDrawerBackdrop.addEventListener("click", toggleCartDrawer);
    if (btnClearCart) {
    btnClearCart.addEventListener("click", () => {
      cart = [];
      saveCart();
    });
  }

  // Add checkout listener for cart
  if (btnCheckoutCart) {
    btnCheckoutCart.addEventListener("click", () => {
      if (cart.length === 0) return;
      toggleCartDrawer();
      openCartCheckout();
    });
  }

  // Initial cart render
  updateCartUI();

  // ==========================================================
  //  AUTH - Login, Registro, Sess-o
  // ==========================================================
  function updateHeaderForUser() {
    const user = getCurrentUser();
    if (user) {
      let ids = (user.purchases || []).map(p => p.productId);
      if (user.isAffiliate && user.authorizedProducts) {
        ids = ids.concat(user.authorizedProducts);
      }
      localStorage.setItem("dawload_purchases", JSON.stringify([...new Set(ids)]));

      if (headerActions) headerActions.style.display = "none";
      if (userGreeting) userGreeting.style.display = "flex";
      if (userGreetingName) userGreetingName.textContent = `👋 ${user.name.split(" ")[0]}`;
    } else {
      clearPurchases();
      if (headerActions) headerActions.style.display = "flex";
      if (userGreeting) userGreeting.style.display = "none";
    }
  }

  function openAuthModal(modal) {
    if (!modal) return;
    document.body.classList.add("search-overlay-open");
    modal.classList.add("show");
  }

  function closeAuthModal(modal) {
    if (!modal) return;
    modal.classList.remove("show");
    document.body.classList.remove("search-overlay-open");
  }

  if (btnOpenLogin) btnOpenLogin.addEventListener("click", () => openAuthModal(loginModal));
  if (btnOpenRegister) btnOpenRegister.addEventListener("click", () => openAuthModal(registerModal));

  document.getElementById("loginModalClose")?.addEventListener("click", () => closeAuthModal(loginModal));
  document.getElementById("loginModalBackdrop")?.addEventListener("click", () => closeAuthModal(loginModal));
  document.getElementById("registerModalClose")?.addEventListener("click", () => closeAuthModal(registerModal));
  document.getElementById("registerModalBackdrop")?.addEventListener("click", () => closeAuthModal(registerModal));

  document.getElementById("switchToRegister")?.addEventListener("click", () => {
    closeAuthModal(loginModal);
    openAuthModal(registerModal);
  });
  document.getElementById("switchToLogin")?.addEventListener("click", () => {
    closeAuthModal(registerModal);
    openAuthModal(loginModal);
  });

  // Login form
  loginForm?.addEventListener("submit", function (e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const result = loginUser(email, password);
    if (result.success) {
      closeAuthModal(loginModal);
      updateHeaderForUser();
      renderProducts();
      showToast(`Bem-vindo de volta, ${result.user.name.split(" ")[0]}! 🎉`);
    } else {
      if (loginError) { loginError.textContent = result.error; loginError.classList.add("show"); }
    }
  });

  // Register form
  registerForm?.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    const passwordConfirm = document.getElementById("registerPasswordConfirm").value;

    if (password !== passwordConfirm) {
      if (registerError) { registerError.textContent = "As senhas não coincidem."; registerError.classList.add("show"); }
      return;
    }

    const result = registerUser(name, email, password);
    if (result.success) {
      closeAuthModal(registerModal);
      updateHeaderForUser();
      renderProducts();
      showToast(`Conta criada com sucesso! Bem-vindo, ${result.user.name.split(" ")[0]}! 🎉`);
    } else {
      if (registerError) { registerError.textContent = result.error; registerError.classList.add("show"); }
    }
  });

  if (btnHeaderLogout) {
    btnHeaderLogout.addEventListener("click", () => {
      logoutUser();
      updateHeaderForUser();
      renderProducts();
      showToast("Você saiu da sua conta.");
    });
  }

  // ==========================================================
  //  PRODUTOS
  // ==========================================================
  window.addEventListener("storage", () => { loadDatabase(); renderProducts(); });

  document.addEventListener('productsUpdated', () => {
    if (typeof renderProducts === "function") renderProducts();
    if (typeof renderPreVenda === "function") renderPreVenda();
  });

  document.addEventListener('combosUpdated', () => {
    if (typeof renderCombos === "function") renderCombos();
  });

  function renderProducts() {
    if (!productGrid) return;
    productGrid.innerHTML = "";
    loadDatabase();

    const filtered = productsData.filter(p => currentFilter === "all" || p.category === currentFilter);

    if (filtered.length === 0) {
      productGrid.innerHTML = `<div class="overlay-empty-state show">Nenhuma biblioteca encontrada.</div>`;
      return;
    }

    filtered.forEach(prod => productGrid.appendChild(createProductCardHTML(prod)));
    bindProductCardActions(productGrid);
    updateShowcaseSliders();
  }

  function createProductCardHTML(prod) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = prod.id;

    const isFree = prod.price === 0;
    const purchases = getPurchasedIds();
    const isPurchased = purchases.includes(prod.id);

    let badgeBg = "#275c7e";
    let badgeText = prod.tagLabel || "Premium";
    let buttonLabel = "Adicionar ao Carrinho";
    let buyClass = "btn-primary product-buy-btn";
    let priceStyle = "#fff";

    if (prod.category === "pre-venda") {
      badgeBg = "#f59e0b"; // Orange
      badgeText = "Pré-Venda";
      buttonLabel = "Adicionar ao Carrinho";
    }

    if (isFree) {
      badgeBg = "#25a244"; badgeText = "Grátis";
      buttonLabel = "Download Grátis"; buyClass += " free-btn";
    } else if (isPurchased) {
      badgeBg = "#25a244"; badgeText = "Adquirido";
      buttonLabel = prod.category === "pre-venda" && (!prod.downloadLink || prod.downloadLink.trim() === "") ? "Aguardando Lançamento" : "Baixar Biblioteca"; 
      buyClass += " download-btn";
      priceStyle = "#52b788";
    }

    const priceText = isFree ? "Grátis" : formatBRL(prod.price);
    const oldPriceText = (!isFree && prod.oldPrice) ? formatBRL(prod.oldPrice) : "";

    card.innerHTML = `
      <div class="product-media">
        <img loading="lazy" src="${prod.image}" alt="${prod.title}">
      </div>
      <div class="product-details">
        <div class="product-head">
          <h4>${prod.title}</h4>
          <span class="badge-tag" style="background:${badgeBg}">${badgeText}</span>
        </div>
        <p class="product-desc">${prod.desc}</p>
        <div class="product-sales">
          <div class="sales-row">
            ${prod.category === "pre-venda" && prod.releaseDate ? `<div class="rating-score" style="color:#f59e0b;font-size:11px;">Lançamento: ${prod.releaseDate}</div>` : `<div class="rating-score">⭐ <span>${prod.rating.toFixed(1)}</span></div>`}
            ${oldPriceText ? `<div class="price-old">${oldPriceText}</div>` : ""}
          </div>
          <div class="price-row">
            <span class="price-current" style="color:${isFree || isPurchased ? '#52b788' : '#fff'}">${priceText}</span>
            ${(!isFree && prod.discount && !isPurchased) ? `<span class="discount-badge">${prod.discount}</span>` : ""}
          </div>
        </div>
        <div class="product-meta">${prod.meta.map(m => `<span>${m}</span>`).join("")}</div>
        <div class="product-actions">
          <a href="#" class="${buyClass}">${buttonLabel}</a>
          ${prod.youtube ? `<a href="${prod.youtube}" target="_blank" class="btn-secondary">Ver Vídeo</a>` : ""}
        </div>
      </div>`;
    return card;
  }

  function bindProductCardActions(container) {
    container.querySelectorAll(".product-buy-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        const card = btn.closest(".product-card");
        const prod = productsData.find(p => p.id === card.dataset.id);
        card.classList.remove("shake-card");
        void card.offsetWidth;
        card.classList.add("shake-card");

        if (btn.classList.contains("free-btn") || btn.classList.contains("download-btn")) {
          triggerDownload(prod);
        } else {
          const itemExists = cart.find(i => i.id === prod.id);
          if (itemExists) {
            showToast("Este item já está no carrinho!");
          } else {
            cart.push(prod);
            saveCart();
            showToast(prod.title + " adicionado ao carrinho!");
            if (!cartDrawer.classList.contains('show')) toggleCartDrawer();
          }
        }
      });
    });
  }

  // YouTube Sub Gate
  const ytSubModal = document.getElementById("ytSubModal");
  let pendingDownloadProduct = null;

  document.getElementById("ytSubModalClose")?.addEventListener("click", () => closeAuthModal(ytSubModal));
  document.getElementById("ytSubModalBackdrop")?.addEventListener("click", () => closeAuthModal(ytSubModal));

  document.getElementById("btnGoToYoutube")?.addEventListener("click", () => {
    localStorage.setItem("dawload_yt_sub", "true");
    closeAuthModal(ytSubModal);
    showToast("Obrigado por se inscrever! Liberando download... 🎉");
    if (pendingDownloadProduct) {
      const prod = pendingDownloadProduct;
      pendingDownloadProduct = null;
      setTimeout(() => triggerDownload(prod), 600);
    }
  });

  function triggerDownload(prod) {
    // 1. Exigir cadastro/login no site
    if (!isLoggedIn()) {
      showToast("Cadastre-se ou faça login gratuitamente para baixar!");
      openAuthModal(registerModal);
      return;
    }

    // 2. Exigir inscrição no YouTube para libs Grátis
    if (prod.category === "Grátis" && localStorage.getItem("dawload_yt_sub") !== "true") {
      pendingDownloadProduct = prod;
      const titleEl = document.getElementById("ytSubProdTitle");
      if (titleEl) titleEl.textContent = `Liberar: ${prod.title}`;
      openAuthModal(ytSubModal);
      return;
    }

    // 3. Efetuar download ou barrar pré-venda
    if (prod.category === "pre-venda" && (!prod.downloadLink || prod.downloadLink.trim() === "")) {
      showToast(`Ainda em pré-venda! Disponível a partir de: ${prod.releaseDate || 'Breve'}`);
      return;
    }

    if (prod.downloadLink && prod.downloadLink.trim()) {
      showToast(`Iniciando download: ${prod.title}...`);
      setTimeout(() => window.open(prod.downloadLink, "_blank"), 800);
    } else {
      showToast("Link de download não configurado. Acesse o Painel Admin.");
    }
  }

  // ==========================================================
  //  FILTROS
  // ==========================================================
  categoryButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      categoryButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter || "all";
      renderProducts();
    });
  });

  // ==========================================================
  //  COMBOS & PLANOS
  // ==========================================================
  function renderCombos() {
    const grid = document.querySelector(".plans-grid");
    if (!grid) return;
    grid.innerHTML = "";

    combosData.forEach(combo => {
      const card = document.createElement("div");
      card.className = "plan-card";
      if (combo.isPopular) card.classList.add("popular");

      const tagHtml = combo.tag ? `<div class="plan-tag ${combo.isPopular ? 'popular-tag' : ''}">${combo.tag}</div>` : "";
      
      let featuresHtml = "";
      if (combo.features && combo.features.length) {
        featuresHtml = `<ul class="plan-features">` + combo.features.map(f => `<li>✅ ${f}</li>`).join('') + `</ul>`;
      }

      card.innerHTML = `
        ${tagHtml}
        <h3>${combo.title}</h3>
        <p class="plan-subtitle">${combo.subtitle}</p>
        <div class="plan-price-wrap">
          <span class="plan-price-old">${formatBRL(combo.oldPrice)}</span>
          <div class="plan-price">${formatBRL(combo.price)}</div>
          <span class="plan-discount-badge">${combo.discountBadge}</span>
        </div>
        ${featuresHtml}
        <button type="button" class="btn-primary combo-buy-btn" data-combo="${combo.products}" data-title="${combo.title}" data-price="${combo.price}">
          Adquirir Combo
        </button>
      `;
      grid.appendChild(card);
    });

    // Reattach combo logic
    document.querySelectorAll(".combo-buy-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const comboProd = {
          id: btn.dataset.combo,
          title: btn.dataset.title,
          price: parseFloat(btn.dataset.price),
          image: "assets/logo.jpg",
          desc: "Combo especial de bibliotecas",
          category: "combo"
        };
        const itemExists = cart.find(i => i.id === comboProd.id);
        if (itemExists) {
            showToast("Este combo já está no carrinho!");
        } else {
            cart.push(comboProd);
            saveCart();
            showToast(comboProd.title + " adicionado ao carrinho!");
            if (!cartDrawer.classList.contains('show')) toggleCartDrawer();
        }
      });
    });
  }

  // Chamar logo na inicialização
  renderCombos();
  // ==========================================================
  //  BUSCA & SUGESTÕES
  // ==========================================================
  function normalize(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function getSuggestionTerms() {
    const terms = [];
    productsData.forEach(p => {
      terms.push(p.title);
      p.searchTags.split(" ").filter(w => w.length > 3).forEach(w => terms.push(w));
    });
    return [...new Set(terms)];
  }

  function highlightSuggestion(text, query) {
    const nText = normalize(text), nQuery = normalize(query.trim());
    const idx = nText.indexOf(nQuery);
    if (idx < 0) return text;
    return text.slice(0, idx) + `<strong>${text.slice(idx, idx + query.length)}</strong>` + text.slice(idx + query.length);
  }

  function showSuggestions() {
    if (!suggestionsDropdown || !searchInput) return;
    const query = searchInput.value.trim();
    if (!query) { suggestionsDropdown.classList.remove("show"); suggestionsDropdown.innerHTML = ""; currentSuggestions = []; return; }
    const nq = normalize(query);
    currentSuggestions = getSuggestionTerms().filter(t => normalize(t).includes(nq)).slice(0, 6);
    selectedSuggestionIndex = -1;
    if (!currentSuggestions.length) { suggestionsDropdown.classList.remove("show"); return; }
    suggestionsDropdown.innerHTML = currentSuggestions.map((term, i) =>
      `<button class="suggestion-option" type="button" data-index="${i}"><span>🎵</span><span>${highlightSuggestion(term, query)}</span></button>`
    ).join("");
    suggestionsDropdown.classList.add("show");
    suggestionsDropdown.querySelectorAll(".suggestion-option").forEach(opt => {
      opt.addEventListener("mousedown", e => e.preventDefault());
      opt.addEventListener("click", () => { searchInput.value = currentSuggestions[opt.dataset.index]; runSearch(searchInput.value); });
    });
  }

  function hideSuggestions() { setTimeout(() => { suggestionsDropdown?.classList.remove("show"); selectedSuggestionIndex = -1; }, 150); }

  function activateSuggestion(index) {
    const items = suggestionsDropdown?.querySelectorAll(".suggestion-option") || [];
    items.forEach(item => item.classList.remove("active"));
    if (!items.length) { selectedSuggestionIndex = -1; return; }
    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;
    selectedSuggestionIndex = index;
    items[selectedSuggestionIndex].classList.add("active");
    searchInput.value = currentSuggestions[selectedSuggestionIndex];
  }

  function runSearch(term) {
    activeSearchQuery = term.trim();
    suggestionsDropdown?.classList.remove("show");
    if (!activeSearchQuery) { closeSearchOverlay(); return; }
    renderSearchOverlay();
  }

  if (searchInput) {
    searchInput.addEventListener("input", showSuggestions);
    searchInput.addEventListener("focus", showSuggestions);
    searchInput.addEventListener("blur", hideSuggestions);
    searchInput.addEventListener("keydown", e => {
      const open = suggestionsDropdown?.classList.contains("show");
      if (e.key === "ArrowDown" && open) { e.preventDefault(); activateSuggestion(selectedSuggestionIndex + 1); }
      else if (e.key === "ArrowUp" && open) { e.preventDefault(); activateSuggestion(selectedSuggestionIndex - 1); }
      else if (e.key === "Enter") { e.preventDefault(); runSearch(searchInput.value); }
      else if (e.key === "Escape") { suggestionsDropdown?.classList.remove("show"); }
    });
  }
  searchButton?.addEventListener("click", e => { e.preventDefault(); runSearch(searchInput?.value || ""); });

  function renderSearchOverlay() {
    if (!searchOverlay || !searchOverlayResults) return;
    searchOverlayResults.innerHTML = "";
    const q = normalize(activeSearchQuery);
    const matched = productsData.filter(p => normalize(p.title + " " + p.desc + " " + p.searchTags).includes(q));
    if (searchOverlayQuery) searchOverlayQuery.textContent = `para "${activeSearchQuery}"`;
    if (matched.length > 0) {
      searchOverlayEmpty?.classList.remove("show");
      searchOverlayResults.style.display = "grid";
      matched.forEach(p => searchOverlayResults.appendChild(createProductCardHTML(p)));
      bindProductCardActions(searchOverlayResults);
    } else {
      searchOverlayResults.style.display = "none";
      searchOverlayEmpty?.classList.add("show");
    }
    searchOverlay.classList.add("show");
    document.body.classList.add("search-overlay-open");
  }

  function closeSearchOverlay() {
    searchOverlay?.classList.remove("show");
    document.body.classList.remove("search-overlay-open");
  }
  searchOverlayClose?.addEventListener("click", closeSearchOverlay);
  searchOverlayBackdrop?.addEventListener("click", closeSearchOverlay);

  // ==========================================================

  // ==========================================================
  //  CHECKOUT - 3 Abas: PIX / Crédito / Débito
  // ==========================================================
  // ----------------------------------------------------------------------
  // configuração MERCADO PAGO - CARTÕES (FRONTEND)
  // ----------------------------------------------------------------------
  // IMPORTANTE: Substitua pela sua PUBLIC KEY (Chave Pública) do Mercado Pago
  const MP_PUBLIC_KEY = 'APP_USR-4a1c9479-eeb2-49e0-843c-4dadd505cba8'; 
  const mp = typeof MercadoPago !== 'undefined' ? new MercadoPago(MP_PUBLIC_KEY) : null;
  // ----------------------------------------------------------------------

  // --- Tabs do checkout ---
  document.querySelectorAll(".checkout-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".checkout-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".checkout-tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add("active");

      // Parar countdown e auto-sync do PIX se sair da aba
      if (btn.dataset.tab !== "pix") {
        if (pixCountdownInterval) clearInterval(pixCountdownInterval);
        if (pixAutoSyncTimer) clearTimeout(pixAutoSyncTimer);
        pixCountdownInterval = null;
        pixAutoSyncTimer = null;
      } else if (btn.dataset.tab === "pix") {
        startPixCountdown();
      }
    });
  });

  // --- PIX countdown e Auto Sync ---
  let currentPaymentId = null;
  // Agora o frontend e backend rodam no mesmo domínio do Render!
  const API_BASE = window.location.protocol === 'file:' 
    ? 'http://localhost:3005' 
    : '';

  async function startPixCountdown() {
    clearInterval(pixCountdownInterval);
    clearTimeout(pixAutoSyncTimer);
    
    let seconds = 15 * 60;
    updatePixDisplay(seconds);
    pixCountdownInterval = setInterval(() => {
      seconds--;
      updatePixDisplay(seconds);
      if (seconds <= 0) { clearInterval(pixCountdownInterval); }
    }, 1000);

    if (!selectedProductForCheckout) return;

    try {
      // 1. Criar PIX real (ou simulado seguro) no nosso Servidor
      const response = await fetch(`${API_BASE}/api/create-pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedProductForCheckout.price,
          productId: selectedProductForCheckout.id,
          affiliateCode: localStorage.getItem('dawload_ref') || ''
        })
      });
      const data = await response.json();
      
      if (data.success) {
        currentPaymentId = data.paymentId;
        const pixKeyEl = document.getElementById("pixKeyDisplay");
        if (pixKeyEl) pixKeyEl.textContent = data.pixKey;
        // Atualizar QR Code real do Mercado Pago
        const qrImg = document.querySelector(".pix-qr-box img");
        if (qrImg && data.qrCodeImage) qrImg.src = data.qrCodeImage;

        // 2. Iniciar Polling (perguntar ao servidor a cada 3s se já pagou)
        pollPaymentStatus();
      } else {
        const pixKeyEl = document.getElementById("pixKeyDisplay");
        if (pixKeyEl) pixKeyEl.textContent = "Erro: " + (data.error || "Servidor offline");
        showToast("Falha no PIX: " + (data.error || "Erro desconhecido"), 5000);
      }
    } catch (err) {
      console.error("Erro ao gerar PIX:", err);
      showToast("Erro ao conectar com o banco. Tentando novamente...", 4000);
    }
  }

  function pollPaymentStatus() {
    if (!currentPaymentId) return;

    pixAutoSyncTimer = setTimeout(async () => {
      if (!selectedProductForCheckout || !document.getElementById("tab-pix")?.classList.contains("active")) {
        return; // Usuário fechou ou trocou de aba
      }

      try {
        const ref = localStorage.getItem('dawload_ref') || '';
        const response = await fetch(`${API_BASE}/api/check-payment/${currentPaymentId}?affiliateCode=${ref}`);
        const data = await response.json();

        if (data.paid || data.status === 'approved') {
          processPayment("PIX", 1);
        } else {
          // Continua perguntando...
          pollPaymentStatus();
        }
      } catch (err) {
        console.error("Erro no polling:", err);
        pollPaymentStatus(); // tenta de novo mesmo com erro de rede
      }
    }, 3000); // Pergunta a cada 3 segundos
  }

  function updatePixDisplay(seconds) {
    const el = document.getElementById("pixCountdown");
    if (!el) return;
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    el.textContent = `${m}:${s}`;
    if (seconds <= 60) el.style.color = "#ef4444";
    else el.style.color = "#f59e0b";
  }

  // --- Copiar chave PIX ---
  document.getElementById("btnCopyPix")?.addEventListener("click", () => {
    const key = document.getElementById("pixKeyDisplay")?.textContent || "";
    navigator.clipboard.writeText(key).catch(() => {});
    showToast("Chave PIX copiada!");
  });

  // --- Card 3D Flip helpers ---
  function detectBrand(num) {
    const n = num.replace(/\s/g, "");
    if (/^4/.test(n)) return { label: "VISA", emoji: "💳", css: "brand-visa" };
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return { label: "MC", emoji: "💳", css: "brand-mastercard" };
    if (/^6(36368|36369|36370|504175|362|38|09)/.test(n)) return { label: "ELO", emoji: "💳", css: "brand-elo" };
    if (/^(384|385|386|368)/.test(n)) return { label: "HIPER", emoji: "💳", css: "brand-hipercard" };
    if (/^3[47]/.test(n)) return { label: "AMEX", emoji: "💳", css: "brand-amex" };
    return { label: "💳", emoji: "💳", css: "" };
  }

  function maskCardNumber(val) {
    return val.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().substring(0, 19);
  }

  function setupCardInputs(prefix, card3dId) {
    const numInput = document.getElementById(`${prefix}Number`);
    const nameInput = document.getElementById(`${prefix}Name`);
    const expInput = document.getElementById(`${prefix}Exp`);
    const cvvInput = document.getElementById(`${prefix}Cvv`);
    const card3d = document.getElementById(card3dId);

    const numDisplay = document.getElementById(prefix === "credit" ? "cardNumberDisplay" : "debitNumberDisplay");
    const nameDisplay = document.getElementById(prefix === "credit" ? "cardNameDisplay" : "debitNameDisplay");
    const expDisplay = document.getElementById(prefix === "credit" ? "cardExpDisplay" : "debitExpDisplay");
    const cvvDisplay = document.getElementById(prefix === "credit" ? "cardCvvDisplay" : "debitCvvDisplay");
    const brandDisplay = document.getElementById(prefix === "credit" ? "cardBrandCredit" : "cardBrandDebit");

    numInput?.addEventListener("input", e => {
      const masked = maskCardNumber(e.target.value);
      e.target.value = masked;
      const display = masked || "•••• •••• •••• ••••";
      if (numDisplay) numDisplay.textContent = display.padEnd(19, "•").replace(/(.{4})/g, "$1 ").trim();
      const brand = detectBrand(masked);
      if (brandDisplay) brandDisplay.textContent = brand.emoji;
    });

    nameInput?.addEventListener("input", e => {
      if (nameDisplay) nameDisplay.textContent = e.target.value.toUpperCase() || "SEU NOME";
    });

    expInput?.addEventListener("input", e => {
      let v = e.target.value.replace(/\D/g, "");
      if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2, 4);
      e.target.value = v;
      if (expDisplay) expDisplay.textContent = v || "MM/AA";
    });

    cvvInput?.addEventListener("focus", () => card3d?.classList.add("is-flipped"));
    cvvInput?.addEventListener("blur", () => card3d?.classList.remove("is-flipped"));
    cvvInput?.addEventListener("input", e => {
      const v = e.target.value.replace(/\D/g, "").substring(0, 4);
      e.target.value = v;
      if (cvvDisplay) cvvDisplay.textContent = v ? "•".repeat(v.length) : "•••";
    });
  }

  // Setup instalments dropdown
  function setupInstallments(price) {
    const sel = document.getElementById("creditInstallments");
    if (!sel) return;
    sel.innerHTML = "";
    const rates = [0, 0, 0.01, 0.015, 0.02, 0.025, 0.03, 0.035, 0.04, 0.045, 0.05, 0.055, 0.06];
    for (let i = 1; i <= 12; i++) {
      const rate = rates[i] || 0.06;
      const total = price * Math.pow(1 + rate, i);
      const installment = total / i;
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = i === 1
        ? `1x de ${formatBRL(price)} (à vista)`
        : `${i}x de ${formatBRL(installment)} (total ${formatBRL(total)})`;
      sel.appendChild(opt);
    }
  }

  function openCartCheckout() {
    if (cart.length === 0) return;
    const cartProd = {
      id: cart.map(i => i.id).join(","), // Combine IDs
      title: `Carrinho (${cart.length} itens)`,
      price: cart.reduce((sum, item) => sum + item.price, 0),
      isCart: true,
      items: cart
    };
    openCheckout(cartProd);
  }

  // Abrir checkout
  function openCheckout(prod) {
    if (!checkoutModal) return;
    
    // Require login
    if (!isLoggedIn()) {
      showToast("Faça login ou cadastre-se para finalizar a compra.");
      openAuthModal(registerModal);
      return;
    }

    selectedProductForCheckout = prod;

    // Reset ao estado inicial
    checkoutBody.style.display = "";
    checkoutProcessing.style.display = "none";
    checkoutSuccess.style.display = "none";

    checkoutProdTitle.textContent = prod.title;
    checkoutProdPrice.textContent = formatBRL(prod.price);

    // Carregar chave PIX e conta configuradas
    const pixKeyEl = document.getElementById("pixKeyDisplay");
    if (pixKeyEl) pixKeyEl.textContent = "Gerando Chave PIX...";
    const qrImg = document.querySelector(".pix-qr-box img");
    if (qrImg) qrImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    // Resetar abas para PIX
    document.querySelectorAll(".checkout-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".checkout-tab-content").forEach(c => c.classList.remove("active"));
    document.querySelector(".checkout-tab-btn[data-tab='pix']")?.classList.add("active");
    document.getElementById("tab-pix")?.classList.add("active");

    // Iniciar countdown PIX
    startPixCountdown();

    // Setup cartão
    setupCardInputs("credit", "card3dCredit");
    setupCardInputs("debit", "card3dDebit");
    setupInstallments(prod.price);

    checkoutModal.classList.add("show");
  }

  function closeCheckout() {
    checkoutModal?.classList.remove("show");
    clearInterval(pixCountdownInterval);
    clearTimeout(pixAutoSyncTimer);
    pixCountdownInterval = null;
    pixAutoSyncTimer = null;
    selectedProductForCheckout = null;
  }

  function registerSuccessfulPurchase(method, installments) {
    const user = getCurrentUser();
    if (selectedProductForCheckout.isCart) {
      selectedProductForCheckout.items.forEach(item => {
        if (user) {
          addUserPurchase(user.id, item, method, item.price, installments);
        } else {
          addPurchaseId(item.id);
          const refCode = localStorage.getItem('dawload_ref');
          if (refCode && typeof creditAffiliateCommission === 'function') {
            creditAffiliateCommission(refCode, { productTitle: item.title, amount: item.price });
          }
        }
      });
      cart = [];
      saveCart();
    } else {
      if (user) {
        addUserPurchase(user.id, selectedProductForCheckout, method, selectedProductForCheckout.price, installments);
        if (selectedProductForCheckout.id === "sub_vip") {
          becomeVIPMember(user.id);
          updateVIPDashboard();
        }
      } else {
        addPurchaseId(selectedProductForCheckout.id);
        const refCode = localStorage.getItem('dawload_ref');
        if (refCode && typeof creditAffiliateCommission === 'function') {
          creditAffiliateCommission(refCode, { productTitle: selectedProductForCheckout.title, amount: selectedProductForCheckout.price });
        }
      }
    }
    
    checkoutProcessing.style.display = "none";
    checkoutSuccess.style.display = "";
    renderProducts();
    updateMyAccountList();
  }

  async function processPayment(method, installments, cardData) {
    if (!selectedProductForCheckout) return;

    // Mostrar estado "processando"
    checkoutBody.style.display = "none";
    checkoutProcessing.style.display = "";
    checkoutSuccess.style.display = "none";

    // Handle PIX fast pass
    if (method === "PIX") {
      registerSuccessfulPurchase(method, 1);
      return;
    }

    // 1. Validar e Formatar CPF
    const rawCpf = cardData.cpf.replace(/\D/g, '');
    if (rawCpf.length !== 11) {
      showToast("CPF inválido! Por favor digite corretamente.", 4000);
      checkoutBody.style.display = "";
      checkoutProcessing.style.display = "none";
      return;
    }

    try {
      // 2. Tokenizar Cartão de Crédito/Débito direto na API do Mercado Pago
      const tokenReq = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_number: cardData.number.replace(/\s/g, ''),
          security_code: cardData.cvv,
          expiration_month: parseInt(cardData.exp.split('/')[0]),
          expiration_year: parseInt("20" + cardData.exp.split('/')[1]),
          cardholder: {
            name: cardData.name,
            identification: {
              type: "CPF",
              number: rawCpf
            }
          }
        })
      });

      const tokenResponse = await tokenReq.json();

      if (!tokenResponse || !tokenResponse.id) {
        console.error("Erro no MP:", tokenResponse);
        throw new Error(tokenResponse.message || "Não foi possível gerar o Token do Cartão. Verifique os dados.");
      }

      // 3. Enviar o Token para o Servidor cobrar
      const response = await fetch(`${API_BASE}/api/pay-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedProductForCheckout.price,
          productId: selectedProductForCheckout.id,
          token: tokenResponse.id,
          installments: installments,
          paymentMethodId: method === "Débito" ? "debmaster" : "master", // Será descoberto pelo backend/SDK, mas enviamos fallback
          payer: {
            email: cardData.email,
            identification: { type: "CPF", number: rawCpf },
            first_name: cardData.name.split(' ')[0]
          }
        })
      });

      const data = await response.json();

      if (data.success && (data.status === 'approved' || data.status === 'in_process')) {
        registerSuccessfulPurchase(method, installments);
      } else {
        throw new Error(data.error || "O banco recusou o pagamento.");
      }
    } catch (err) {
      console.error("Erro ao processar cartão:", err);
      showToast(err.message || "Erro ao processar o cartão. Tente novamente.", 4000);
      checkoutBody.style.display = "";
      checkoutProcessing.style.display = "none";
    }
  }

  checkoutClose?.addEventListener("click", closeCheckout);
  document.getElementById("checkoutBackdrop")?.addEventListener("click", closeCheckout);

  document.getElementById("btnConfirmCredit")?.addEventListener("click", () => {
    const installments = parseInt(document.getElementById("creditInstallments")?.value || "1");
    
    const cardData = {
      number: document.getElementById("creditNumber").value,
      exp: document.getElementById("creditExp").value,
      cvv: document.getElementById("creditCvv").value,
      name: document.getElementById("creditName").value,
      cpf: document.getElementById("creditCpf").value,
      email: document.getElementById("creditEmail").value || "comprador.loja@email.com"
    };

    if (!cardData.number || !cardData.exp || !cardData.cvv || !cardData.name || !cardData.cpf || !cardData.email) {
      return showToast("Preencha todos os campos do cartão (inclusive CPF e E-mail).", 3000);
    }
    
    processPayment("Cartão de Crédito", installments, cardData);
  });

  document.getElementById("btnConfirmDebit")?.addEventListener("click", () => {
    const cardData = {
      number: document.getElementById("debitNumber").value,
      exp: document.getElementById("debitExp").value,
      cvv: document.getElementById("debitCvv").value,
      name: document.getElementById("debitName").value,
      cpf: document.getElementById("debitCpf").value,
      email: document.getElementById("debitEmail").value || "comprador.loja@email.com"
    };

    if (!cardData.number || !cardData.exp || !cardData.cvv || !cardData.name || !cardData.cpf || !cardData.email) {
      return showToast("Preencha todos os campos do cartão (inclusive CPF e E-mail).", 3000);
    }

    processPayment("Débito", 1, cardData);
  });

  btnGoToDownload?.addEventListener("click", () => {
    closeCheckout();
    openMyAccount();
    // Selecionar aba Downloads
    switchAccountTab("downloads");
  });

  // ==========================================================
  //  MINHA CONTA - Painel com abas
  // ==========================================================
  function openMyAccount() {
    if (!myAccountOverlay) return;
    const user = getCurrentUser();
    const emailEl = document.getElementById("accountUserEmail");
    if (emailEl) emailEl.textContent = user ? user.email : "Downloads Disponíveis";
    updateMyAccountList();
    updatePurchaseHistory();
    updateAffiliateDashboard();
    updateVIPDashboard();
    myAccountOverlay.classList.add("is-open");
    document.body.classList.add("search-overlay-open");
  }

  function closeMyAccount() {
    myAccountOverlay?.classList.remove("is-open");
    document.body.classList.remove("search-overlay-open");
  }

  function switchAccountTab(tabName) {
    document.querySelectorAll(".account-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".account-tab-content").forEach(c => c.classList.remove("active"));
    document.querySelector(`.account-tab-btn[data-acctab="${tabName}"]`)?.classList.add("active");
    document.getElementById(`acctab-${tabName}`)?.classList.add("active");
  }

  // Abas dentro do painel Minha Conta
  document.querySelectorAll(".account-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".account-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".account-tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`acctab-${btn.dataset.acctab}`)?.classList.add("active");
    });
  });

  function updateMyAccountList() {
    if (!myAccountDownloadsList) return;
    myAccountDownloadsList.innerHTML = "";
    const purchases = getPurchasedIds();
    const myLibs = productsData.filter(p => p.category === "Grátis" || purchases.includes(p.id));

    if (!myLibs.length) {
      myAccountDownloadsList.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">Nenhum download disponível ainda.</div>`;
      return;
    }

    myLibs.forEach(prod => {
      const div = document.createElement("div");
      div.className = "purchase-history-item";
      div.innerHTML = `
        <div class="product-thumb" style="width:48px;height:48px;">
          <img src="${prod.image}" alt="${prod.title}">
        </div>
        <div class="purchase-history-info">
          <div class="purchase-history-title">${prod.title}</div>
          <div class="purchase-history-meta" style="color:${prod.category==='Grátis'?'#52b788':'var(--accent)'};">${prod.category==='Grátis'?'Grátis':'Adquirida'}</div>
        </div>
        <button type="button" class="btn-dl-small acc-dl-btn" data-id="${prod.id}">⇩ Download</button>`;
      myAccountDownloadsList.appendChild(div);
    });

    myAccountDownloadsList.querySelectorAll(".acc-dl-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const prod = productsData.find(p => p.id === btn.dataset.id);
        if (prod) triggerDownload(prod);
      });
    });
  }

  function updatePurchaseHistory() {
    const list = document.getElementById("purchaseHistoryList");
    if (!list) return;
    list.innerHTML = "";

    const user = getCurrentUser();
    const purchases = user ? user.purchases : [];

    if (!purchases.length) {
      list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">Nenhuma compra registrada.</div>`;
      return;
    }

    [...purchases].reverse().forEach(p => {
      const date = new Date(p.date).toLocaleDateString("pt-BR");
      const div = document.createElement("div");
      div.className = "purchase-history-item";
      div.innerHTML = `
        <div class="purchase-history-info">
          <div class="purchase-history-title">${p.productTitle}</div>
          <div class="purchase-history-meta">${date} • ${p.paymentMethod} • ${formatBRL(p.amount)}</div>
        </div>`;
      list.appendChild(div);
    });
  }

  function updateAffiliateDashboard() {
    const user = getCurrentUser();
    const notReg = document.getElementById("affiliateNotRegistered");
    const dash = document.getElementById("affiliateDashboard");

    if (!user) {
      if (notReg) notReg.style.display = "";
      if (dash) dash.style.display = "none";
      return;
    }

    if (user.isAffiliate) {
      if (notReg) notReg.style.display = "none";
      if (dash) dash.style.display = "";
      const link = getAffiliateLink(user.affiliateCode);
      const stats = getAffiliateDashboard(user.id);
      document.getElementById("statClicks").textContent = stats.totalClicks;
      document.getElementById("statConversions").textContent = stats.totalConversions;
      document.getElementById("statCommission").textContent = formatBRL(stats.totalCommission);
      document.getElementById("affiliateLinkDisplay").textContent = link;

      const convList = document.getElementById("conversionsList");
      if (convList) {
        if (!stats.conversions.length) {
          convList.innerHTML = `<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px;">Nenhuma venda atribuída ainda.</div>`;
        } else {
          convList.innerHTML = stats.conversions.map(c => `
            <div class="conversion-item">
              <span>${new Date(c.date).toLocaleDateString("pt-BR")} • ${c.productTitle}</span>
              <span class="conversion-commission">+${formatBRL(c.commission)}</span>
            </div>`).join("");
        }
      }

      document.getElementById("btnCopyAffiliateLink")?.addEventListener("click", () => {
        navigator.clipboard.writeText(link).catch(() => {});
        showToast("Link de afiliado copiado!");
      });

      const btnConnectMP = document.getElementById("btnConnectMP");
      if (btnConnectMP) {
        btnConnectMP.href = `https://d-a-w-load.onrender.com/auth/mercadopago?affiliateId=${user.id}`;
      }
    } else {
      if (notReg) notReg.style.display = "";
      if (dash) dash.style.display = "none";
    }
  }

  document.getElementById("btnRegisterAffiliate")?.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) { showToast("Faça login para se tornar afiliado."); openAuthModal(loginModal); return; }
    const channel = document.getElementById("affiliateChannelInput")?.value || "";
    registerAsAffiliate(user.id, channel);
    showToast("Você agora é um Afiliado D.A.W.LOAD! ðŸŽ‰");
    updateAffiliateDashboard();
  });

  // --- Lógica VIP ---
  function updateVIPDashboard() {
    const user = getCurrentUser();
    const notMemberDiv = document.getElementById("vipNotMember");
    const isMemberDiv = document.getElementById("vipIsMember");
    
    if (notMemberDiv && isMemberDiv) {
      if (user && user.isVIPMember) {
        notMemberDiv.style.display = "none";
        isMemberDiv.style.display = "block";
      } else {
        notMemberDiv.style.display = "block";
        isMemberDiv.style.display = "none";
      }
    }
  }
  
  const btnSubscribeVIP = document.getElementById("btnSubscribeVIP");
  if (btnSubscribeVIP) {
    btnSubscribeVIP.addEventListener("click", () => {
      const user = getCurrentUser();
      if (!user) return;
      
      closeMyAccount(); // Fecha o overlay da conta para exibir o checkout limpo
      openCheckout({
        id: "sub_vip",
        title: "Assinatura Área VIP Mensal",
        price: 29.99,
        category: "vip"
      });
    });
  }

  navMinhaContaLink?.addEventListener("click", e => { e.preventDefault(); openMyAccount(); });
  myAccountOverlayClose?.addEventListener("click", closeMyAccount);
  myAccountOverlayBackdrop?.addEventListener("click", closeMyAccount);

  btnResetPurchases?.addEventListener("click", () => {
    clearPurchases();
    showToast("Histórico de compras resetado.");
    updateMyAccountList();
    renderProducts();
  });

  // ==========================================================
  //  CAROUSEL BANNER HERO
  // ==========================================================
  const heroCarousel = document.querySelector(".hero-carousel");
  const heroProducts = typeof productsData !== "undefined" ? productsData : [];
  
  if (heroCarousel && heroProducts.length > 0) {
    const controls = heroCarousel.querySelector(".hero-controls");
    const dotsContainer = heroCarousel.querySelector(".hero-dots");
    
    // Create slides dynamically
    heroProducts.forEach((prod, index) => {
      const slide = document.createElement("div");
      slide.className = `hero-slide ${index === 0 ? "active" : ""}`;
      const bgImage = prod.image || `assets/${prod.id.replace(/-/g, '_')}.png`;
      
      // configuração para caixas de produtos verticais (3 camadas)
      // 1. Gradiente para dar contraste no texto
      // 2. Imagem contida na direita
      // 3. Imagem esticada bem escura preenchendo o fundo
      slide.style.backgroundImage = `
        linear-gradient(90deg, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.85) 45%, rgba(10,10,10,0.4) 100%), 
        url('${bgImage}'), 
        url('${bgImage}')
      `;
      slide.style.backgroundSize = `cover, contain, cover`;
      slide.style.backgroundPosition = `left center, right 5% center, center`;
      slide.style.backgroundRepeat = `no-repeat, no-repeat, no-repeat`;
      slide.style.backgroundColor = `#0a0a0a`;
      
      let demoBtn = '';
      if (prod.demoUrl || prod.youtubeUrl) {
        demoBtn = `<button type="button" class="hero-btn demo-button" data-title="${prod.title}" data-midi="${prod.demoUrl || ''}" data-youtube="${prod.youtubeUrl || ''}">Conhecer Biblioteca</button>`;
      } else {
        demoBtn = `<a href="#storeGrid" class="hero-btn">Ver Catálogo</a>`;
      }

      slide.innerHTML = `
        <div class="hero-content">
          <h2>${prod.title}</h2>
          <p>${prod.desc}</p>
          ${demoBtn}
        </div>
      `;
      heroCarousel.insertBefore(slide, controls);
      
      const dot = document.createElement("button");
      dot.className = `hero-dot ${index === 0 ? "active" : ""}`;
      dot.type = "button";
      dot.dataset.index = index;
      dot.setAttribute("aria-label", `Slide ${index + 1}`);
      dotsContainer.appendChild(dot);
    });

    const slides = heroCarousel.querySelectorAll(".hero-slide");
    const dots = heroCarousel.querySelectorAll(".hero-dot");
    const nextBtn = heroCarousel.querySelector(".hero-arrow.next");
    const prevBtn = heroCarousel.querySelector(".hero-arrow.prev");
    const pauseBtn = heroCarousel.querySelector(".hero-pause");
    let activeIdx = 0, autoPlay = true, timer = null;

    function showSlide(idx) {
      if (idx < 0) idx = slides.length - 1;
      if (idx >= slides.length) idx = 0;
      activeIdx = idx;
      slides.forEach((s, i) => s.classList.toggle("active", i === activeIdx));
      dots.forEach((d, i) => d.classList.toggle("active", i === activeIdx));
    }
    function startSlider() {
      clearInterval(timer);
      if (slides.length <= 1) return;
      timer = setInterval(() => { if (autoPlay) showSlide(activeIdx + 1); }, 6500);
    }
    nextBtn?.addEventListener("click", () => showSlide(activeIdx + 1));
    prevBtn?.addEventListener("click", () => showSlide(activeIdx - 1));
    pauseBtn?.addEventListener("click", () => { 
      autoPlay = !autoPlay; 
      const iconPause = pauseBtn.querySelector('.icon-pause');
      const iconPlay = pauseBtn.querySelector('.icon-play');
      if (iconPause) iconPause.style.display = autoPlay ? 'block' : 'none';
      if (iconPlay) iconPlay.style.display = autoPlay ? 'none' : 'block';
    });
    dots.forEach(d => d.addEventListener("click", () => showSlide(parseInt(d.dataset.index || 0))));
    showSlide(0);
    startSlider();
  }

  // ==========================================================
  //  SHOWCASE SLIDERS
  // ==========================================================
  function updateShowcaseSliders() {
    document.querySelectorAll(".showcase-carousel-wrap").forEach(wrap => {
      const track = wrap.querySelector(".showcase-track");
      const prev = wrap.querySelector(".showcase-arrow.prev");
      const next = wrap.querySelector(".showcase-arrow.next");
      if (!track) return;

      function getScrollAmt() {
        const card = track.querySelector(".product-card");
        const gap = parseFloat(getComputedStyle(track).gap || "16");
        return card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
      }
      function updateArrows() {
        prev?.classList.toggle("is-hidden", track.scrollLeft <= 10);
        next?.classList.toggle("is-hidden", track.scrollLeft + track.clientWidth >= track.scrollWidth - 10);
      }
      track.addEventListener("scroll", updateArrows);
      window.addEventListener("resize", updateArrows);
      setTimeout(updateArrows, 100);

      next?.addEventListener("click", () => {
        const nearEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10;
        track.scrollBy({ left: nearEnd ? -track.scrollWidth : getScrollAmt(), behavior: "smooth" });
        setTimeout(updateArrows, 300);
      });
      prev?.addEventListener("click", () => { track.scrollBy({ left: -getScrollAmt(), behavior: "smooth" }); setTimeout(updateArrows, 300); });
    });
  }

  // ==========================================================
  //  MEMBROS WIDGET
  // ==========================================================
  let currentRegIndex = 0, rotatingIconIndex = 0, topWeekIndex = 0;

  function renderRotatingMember() {
    const nameEl = document.getElementById("topMembersName");
    const iconEl = document.getElementById("topMembersIcon");
    const currentLine = document.getElementById("topMembersCurrent");
    if (!nameEl || !iconEl || !regularMembers.length) return;
    currentLine?.classList.add("changing");
    setTimeout(() => {
      const member = regularMembers[currentRegIndex];
      nameEl.textContent = member.nome;
      iconEl.textContent = regularMemberIcons[rotatingIconIndex % regularMemberIcons.length];
      currentRegIndex = (currentRegIndex + 1) % regularMembers.length;
      rotatingIconIndex = (rotatingIconIndex + 1) % regularMemberIcons.length;
      currentLine?.classList.remove("changing");
    }, 240);
  }

  function renderFixedTopWeek() {
    const listEl = document.getElementById("topFixedList");
    if (!listEl || !topWeekMembers.length) return;
    listEl.classList.add("changing");
    setTimeout(() => {
      const member = topWeekMembers[topWeekIndex];
            listEl.innerHTML = `<span class="fixed-item"><span>${member.icone}</span><span>${member.nome}</span></span>`;
      topWeekIndex = (topWeekIndex + 1) % topWeekMembers.length;
      listEl.classList.remove("changing");
    }, 240);
  }

  function openMemberOverlay() {
    if (!memberOverlay || !memberRankList) return;
    memberRankList.innerHTML = "";
    topWeekMembers.forEach((member, i) => {
      const item = document.createElement("li");
      item.className = "member-rank-item";
      item.innerHTML = `<span class="member-rank-position">#${i + 1}</span><span class="member-rank-name">${member.nome}</span><span class="member-rank-icon">${member.icone}</span>`;
      memberRankList.appendChild(item);
    });
    memberOverlay.classList.add("is-open");
  }

  topMembersRankButton?.addEventListener("click", openMemberOverlay);
  topMembersJoinButton?.addEventListener("click", () => {
    if (!isLoggedIn()) {
      showToast("Faça login para acessar a Área VIP.");
      openAuthModal(loginModal);
      return;
    }
    openMyAccount();
    switchAccountTab("vip");
  });
  memberOverlayClose?.addEventListener("click", () => memberOverlay?.classList.remove("is-open"));
  memberOverlayBackdrop?.addEventListener("click", () => memberOverlay?.classList.remove("is-open"));
  memberOverlayCta?.addEventListener("click", () => {
    memberOverlay?.classList.remove("is-open");
    showToast("Abrindo suporte...");
  });

  if (regularMembers.length > 1) { renderRotatingMember(); setInterval(renderRotatingMember, 3400); }
  if (topWeekMembers.length > 1) { renderFixedTopWeek(); setInterval(renderFixedTopWeek, 3000); }

  // ==========================================================
  //  HAMBURGER MENU
  // ==========================================================
  const hamburger = document.getElementById("hamburgerMenu");
  const navMenu = document.getElementById("navMenu");
  hamburger?.addEventListener("click", () => {
    navMenu?.classList.toggle("mobile-show");
    hamburger.classList.toggle("active");
  });

  // ==========================================================
  //  AI SUPPORT CHAT & HUMAN FORWARDING (RAFAEL / ALEX)
  // ==========================================================
  const navSuporteLink = document.getElementById("navSuporteLink");
  const supportModal = document.getElementById("supportModal");
  const supportModalClose = document.getElementById("supportModalClose");
  const supportModalBackdrop = document.getElementById("supportModalBackdrop");
  const supportChatBody = document.getElementById("supportChatBody");
  const supportChatForm = document.getElementById("supportChatForm");
  const supportChatInput = document.getElementById("supportChatInput");

  function openSupportModal() {
    if (!supportModal) return;
    openAuthModal(supportModal);
  }

  function closeSupportModal() {
    closeAuthModal(supportModal);
  }

  navSuporteLink?.addEventListener("click", e => {
    e.preventDefault();
    openSupportModal();
  });

  memberOverlayCta?.addEventListener("click", () => {
    memberOverlay?.classList.remove("is-open");
    openSupportModal();
  });

  supportModalClose?.addEventListener("click", closeSupportModal);
  supportModalBackdrop?.addEventListener("click", closeSupportModal);

  function renderHumanSupportCard(userQuery) {
    const defaultText = userQuery ? `Olá, preciso de suporte no D.A.W.LOAD: ${userQuery}` : "Olá, preciso de ajuda no D.A.W.LOAD";
    const encText = encodeURIComponent(defaultText);
    const rafaelLink = `https://wa.me/5521981134378?text=${encText}`;
    const alexLink = `https://wa.me/5513991298707?text=${encText}`;

    return `
      <div class="human-support-card">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:2px;">Fale diretamente no WhatsApp:</div>
        <a href="${rafaelLink}" target="_blank" class="human-contact-btn rafael">
          <span>💬</span> Falar com Rafael (+55 21 981134378)
        </a>
        <a href="${alexLink}" target="_blank" class="human-contact-btn alex">
          <span>💬</span> Falar com Alex (+55 13 99129-8707)
        </a>
      </div>`;
  }

  function appendChatMessage(sender, htmlContent) {
    if (!supportChatBody) return;
    const div = document.createElement("div");
    div.className = `chat-msg ${sender}`;
    div.innerHTML = `<div class="chat-bubble">${htmlContent}</div>`;
    supportChatBody.appendChild(div);
    supportChatBody.scrollTop = supportChatBody.scrollHeight;
  }

  function processSupportTopic(topic) {
    let userText = "";
    let botReply = "";

    if (topic === "download") {
      userText = "🚨 Tenho problemas no download";
      botReply = `Se o seu download não iniciou ou foi interrompido, verifique:<br>
      • Se a sua conexão com a internet está estável.<br>
      • Se o seu navegador não bloqueou a janela pop-up do download.<br>
      • Para bibliotecas Grátis, certifique-se de estar logado no site e inscrito no canal do YouTube.<br><br>
      Caso o problema persista, fale agora com a nossa equipe no WhatsApp:
      ${renderHumanSupportCard("Tenho um problema no download da minha biblioteca no D.A.W.LOAD")}`;
    } else if (topic === "kontakt") {
      userText = "🎉 Dúvida sobre instalação / Kontakt";
      botReply = `Nossas bibliotecas são compatíveis com **Kontakt Full (6 ou 7)** no Windows e macOS.<br><br>
      <strong>Passo a passo rápido:</strong><br>
      1. Baixe e extraia o arquivo da biblioteca (.rar ou .zip).<br>
      2. Abra seu Kontakt.<br>
      3. Arraste a pasta/arquivo .nki para dentro do Kontakt.<br><br>
      Precisa de auxílio direto na instalação ou configuração?
      ${renderHumanSupportCard("Preciso de ajuda na instalação/configuração do Kontakt")}`;
    } else if (topic === "pagamento") {
      userText = "💳 Dúvidas de Pagamento / Comprovante";
      botReply = `Pagamentos por **PIX** e **Cartão** são verificados e liberados no site.<br><br>
      Se você efetuou o pagamento e deseja enviar seu comprovante ou tirar uma dúvida de cobrança:
      ${renderHumanSupportCard("Gostaria de enviar o comprovante do meu pagamento no D.A.W.LOAD")}`;
    } else if (topic === "humano") {
      userText = "💬 Quero falar com suporte humano";
      botReply = `Com certeza! Escolha abaixo com quem prefere falar diretamente no WhatsApp:
      ${renderHumanSupportCard("Olá! Gostaria de falar com o suporte do D.A.W.LOAD.")}`;
    }

    if (userText) appendChatMessage("user", userText);
    if (botReply) {
      setTimeout(() => appendChatMessage("bot", botReply), 350);
    }
  }

  // Clique nos botões de tópicos
  document.getElementById("supportOptionsGrid")?.addEventListener("click", e => {
    const btn = e.target.closest(".chat-option-btn");
    if (btn) {
      processSupportTopic(btn.dataset.topic);
    }
  });

  // Formulário de mensagem de texto livre
  supportChatForm?.addEventListener("submit", e => {
    e.preventDefault();
    const text = supportChatInput?.value.trim();
    if (!text) return;
    supportChatInput.value = "";

    appendChatMessage("user", text);

    const norm = text.toLowerCase();
    let reply = "";

    if (norm.includes("download") || norm.includes("baixar") || norm.includes("link")) {
      reply = `Se você não conseguiu baixar, certifique-se de estar logado no site e ter liberado o link.<br><br>Para ajuda direta dos desenvolvedores:
      ${renderHumanSupportCard(text)}`;
    } else if (norm.includes("kontakt") || norm.includes("instalar") || norm.includes("erro") || norm.includes("nki")) {
      reply = `As bibliotecas exigem Kontakt 6 ou 7 Full.<br><br>Quer que ajudemos você a configurar no seu computador?
      ${renderHumanSupportCard(text)}`;
    } else if (norm.includes("pix") || norm.includes("pagar") || norm.includes("comprar") || norm.includes("comprovante")) {
      reply = `Encaminhando seu comprovante / dúvida de pagamento para verificação rápida:
      ${renderHumanSupportCard(text)}`;
    } else {
      reply = `Entendi a sua solicitação! Para te responder com atenção total, escolha quem você deseja chamar no WhatsApp:
      ${renderHumanSupportCard(text)}`;
    }

    setTimeout(() => appendChatMessage("bot", reply), 400);
  });

  // ==========================================================
  //  INICIALIZAR
  // ==========================================================
  updateHeaderForUser();
  renderProducts();
});

  // ==========================================================
  //  GLOBAL BACKGROUND MUSIC
  // ==========================================================
  const bgMusicToggle = document.getElementById('bgMusicToggle');
  const bgMusicAudio = document.getElementById('bgMusicAudio');
  if (bgMusicToggle && bgMusicAudio) {
    // Set a lower volume for background music
    bgMusicAudio.volume = 0.3;
    
    bgMusicToggle.addEventListener('click', () => {
      const iconPlay = bgMusicToggle.querySelector('.icon-play');
      const iconPause = bgMusicToggle.querySelector('.icon-pause');
      
      if (bgMusicAudio.paused) {
        bgMusicAudio.play().then(() => {
          if(iconPlay) iconPlay.style.display = 'none';
          if(iconPause) iconPause.style.display = 'block';
        }).catch(err => console.error("Error playing audio:", err));
      } else {
        bgMusicAudio.pause();
        if(iconPlay) iconPlay.style.display = 'block';
        if(iconPause) iconPause.style.display = 'none';
      }
    });
  }





