/**
 * Baby & Kids Online Store - Main Application Logic
 * จัดการ State ตะกร้าสินค้า, การกรองสินค้า, PromptPay QR และ Supabase Auth
 */

// Global Application State
const AppState = {
  products: PRODUCTS || [],
  filteredProducts: [...PRODUCTS],
  selectedCategory: "all",
  searchQuery: "",
  sortBy: "default",
  cart: JSON.parse(localStorage.getItem("baby_store_cart") || "[]"),
  wishlist: JSON.parse(localStorage.getItem("baby_store_wishlist") || "[]"),
  discountRate: 0,
  activeCoupon: null,
  promptpayTarget: "0937586699", // เบอร์พร้อมเพย์รับเงินของร้านค้า (แก้ไขเฉพาะในโค้ดหรือระบบหลังบ้านเท่านั้น)
  theme: localStorage.getItem("baby_store_theme") || "dark",
  currentQuickView: null
};

// ==========================================================================
// Theme Management (Dark Mode & Light Mode)
// ==========================================================================
function initTheme() {
  document.documentElement.setAttribute("data-theme", AppState.theme);
  updateThemeButtonUI();
}

function toggleTheme() {
  AppState.theme = AppState.theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", AppState.theme);
  localStorage.setItem("baby_store_theme", AppState.theme);
  updateThemeButtonUI();
  showToast(`สลับเป็นโหมด ${AppState.theme === "dark" ? "Dark Mode (ดำ-ชมพู)" : "Light Mode (ขาว-ชมพู)"}`);
}

function updateThemeButtonUI() {
  const label = document.getElementById("themeLabel");
  if (label) {
    label.textContent = AppState.theme === "dark" ? "Dark Mode" : "Light Mode";
  }
}

// ==========================================================================
// Product Rendering & Card Template
// ==========================================================================
function renderProducts() {
  const container = document.getElementById("productsGrid");
  const countEl = document.getElementById("productsCount");
  if (!container) return;

  if (countEl) {
    countEl.innerHTML = `แสดงทั้งหมด <strong>${AppState.filteredProducts.length}</strong> รายการ`;
  }

  if (AppState.filteredProducts.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <i class="fa-solid fa-shirt" style="font-size: 3rem; margin-bottom: 12px; color: var(--pink-primary); opacity: 0.5;"></i>
        <h3>ไม่พบสินค้าที่ตรงกับการค้นหา</h3>
        <p>ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่นดูนะครับ</p>
      </div>
    `;
    return;
  }

  container.innerHTML = AppState.filteredProducts.map(product => {
    const isWished = AppState.wishlist.includes(product.id);
    const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

    return `
      <div class="product-card" data-id="${product.id}">
        <!-- Image Box พร้อมเส้นขอบเรืองแสงสีชมพู (Pink Border & Glow) -->
        <div class="product-image-box" onclick="openQuickView(${product.id})">
          <span class="badge-tag ${product.tagType}">${product.tag}</span>
          <button class="wishlist-btn ${isWished ? 'active' : ''}" 
                  onclick="event.stopPropagation(); toggleWishlist(${product.id})" 
                  title="บันทึกในรายการโปรด">
            <i class="${isWished ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
          
          <img src="${product.image}" 
               alt="${product.name}" 
               loading="lazy"
               onerror="this.onerror=null; this.src='${product.imageCdn}'; this.onerror=function(){this.src='assets/images/product-1.jpg';};" />
        </div>

        <div class="product-info">
          <span class="product-cat">${product.categoryName}</span>
          <h3 class="product-title" onclick="openQuickView(${product.id})">${product.name}</h3>
          <p class="product-subtitle">${product.nameEn}</p>

          <div class="product-rating">
            <i class="fa-solid fa-star"></i>
            <strong>${product.rating}</strong>
            <span>(${product.reviews} รีวิว)</span>
          </div>

          <div class="product-price-row">
            <span class="current-price">฿${product.price.toLocaleString()}</span>
            <span class="original-price">฿${product.originalPrice.toLocaleString()}</span>
            <span class="discount-pill">ลด ${discountPercent}%</span>
          </div>

          <div class="card-actions">
            <button class="quick-view-btn" onclick="openQuickView(${product.id})" title="ดูรายละเอียดแบบรวดเร็ว">
              <i class="fa-solid fa-eye"></i> ดูสินค้า
            </button>
            <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
              <i class="fa-solid fa-cart-plus"></i> เพิ่มลงตะกร้า
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================================================
// Top 3 Best Sellers Showcase (สำหรับหน้าแรก index.html)
// ==========================================================================
function renderTopProducts() {
  const container = document.getElementById("topProductsGrid");
  if (!container) return;

  // รายการสินค้า Top 3 ขายดีตลอดกาล
  // อันดับ 1: id 1 (ชุดหมีรอมเปอร์ลายน้องหมีสีพาสเทล) 🧸 ขายดีอันดับ 1
  // อันดับ 2: id 4 (ชุดเดรสเจ้าหญิงตัวน้อยผ้าทูลล์หวาน) 👑 ยอดรีวิวสูงสุด 215 รีวิว
  // อันดับ 3: id 13 (ชุดบอดี้สูทสกรีนกราฟิก Hello World) 👶 ฮิตในคุณแม่ยุคใหม่
  const topConfigs = [
    { id: 1, rank: 1, medal: "#1", label: "อันดับ 1 ขายดีตลอดกาล", badge: "ยอดนิยมอันดับ 1" },
    { id: 4, rank: 2, medal: "#2", label: "อันดับ 2 ขวัญใจคุณแม่", badge: "รีวิวสูงสุด 215 รีวิว" },
    { id: 13, rank: 3, medal: "#3", label: "อันดับ 3 ผ้านุ่มพิเศษ", badge: "ผ้านุ่มพิเศษ" }
  ];

  const topProducts = topConfigs.map(cfg => {
    const prod = AppState.products.find(p => p.id === cfg.id);
    return prod ? { ...prod, ...cfg } : null;
  }).filter(Boolean);

  container.innerHTML = topProducts.map(product => {
    const isWished = AppState.wishlist.includes(product.id);
    const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

    return `
      <div class="product-card top-product-card rank-${product.rank}" data-id="${product.id}">
        <!-- Rank Header Badge -->
        <div class="top-rank-banner">
          <span class="top-rank-medal">${product.medal}</span>
          <span class="top-rank-text">${product.label}</span>
        </div>

        <div class="product-image-box" onclick="openQuickView(${product.id})">
          <span class="badge-tag hot">${product.badge}</span>
          <button class="wishlist-btn ${isWished ? 'active' : ''}" 
                  onclick="event.stopPropagation(); toggleWishlist(${product.id})" 
                  title="บันทึกในรายการโปรด">
            <i class="${isWished ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
          
          <img src="${product.image}" 
               alt="${product.name}" 
               loading="lazy"
               onerror="this.onerror=null; this.src='${product.imageCdn}';" />
        </div>

        <div class="product-info">
          <span class="product-cat">${product.categoryName}</span>
          <h3 class="product-title" onclick="openQuickView(${product.id})">${product.name}</h3>
          <p class="product-subtitle">${product.nameEn}</p>

          <div class="product-rating">
            <i class="fa-solid fa-star" style="color: #ffb703;"></i>
            <strong>${product.rating}</strong>
            <span>(${product.reviews} รีวิว)</span>
          </div>

          <div class="product-price-row">
            <span class="current-price">฿${product.price.toLocaleString()}</span>
            <span class="original-price">฿${product.originalPrice.toLocaleString()}</span>
            <span class="discount-pill">ลด ${discountPercent}%</span>
          </div>

          <div class="card-actions">
            <button class="quick-view-btn" onclick="openQuickView(${product.id})" title="ดูรายละเอียดแบบรวดเร็ว">
              <i class="fa-solid fa-eye"></i> ดูสินค้า
            </button>
            <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
              <i class="fa-solid fa-cart-plus"></i> เพิ่มลงตะกร้า
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================================================
// Filtering, Searching & Sorting
// ==========================================================================
function filterProducts() {
  let list = [...AppState.products];

  // หมวดหมู่
  if (AppState.selectedCategory !== "all") {
    list = list.filter(p => p.category === AppState.selectedCategory);
  }

  // ค้นหา
  if (AppState.searchQuery.trim()) {
    const q = AppState.searchQuery.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.nameEn.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tag.toLowerCase().includes(q)
    );
  }

  // เรียงลำดับ
  if (AppState.sortBy === "price-low") {
    list.sort((a, b) => a.price - b.price);
  } else if (AppState.sortBy === "price-high") {
    list.sort((a, b) => b.price - a.price);
  } else if (AppState.sortBy === "popular") {
    list.sort((a, b) => b.reviews - a.reviews);
  } else if (AppState.sortBy === "rating") {
    list.sort((a, b) => b.rating - a.rating);
  }

  AppState.filteredProducts = list;
  renderProducts();
}

function setCategory(categoryName, el) {
  AppState.selectedCategory = categoryName;
  document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
  if (el) el.classList.add("active");
  filterProducts();
}

// ==========================================================================
// Cart Management
// ==========================================================================
function saveCart() {
  localStorage.setItem("baby_store_cart", JSON.stringify(AppState.cart));
  updateCartBadge();
  renderCartDrawer();
}

function updateCartBadge() {
  const totalCount = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById("cartBadge");
  if (badge) {
    badge.textContent = totalCount;
    badge.style.display = totalCount > 0 ? "inline-flex" : "none";
  }

  // อัปเดตแถบปุ่มลัดตะกร้าลอยด้านล่างสำหรับมือถือ (Floating Mobile Cart Bar)
  let floatingBar = document.getElementById("floatingMobileCartBar");
  if (!floatingBar && typeof document !== "undefined" && document.body) {
    floatingBar = document.createElement("div");
    floatingBar.id = "floatingMobileCartBar";
    floatingBar.className = "floating-mobile-cart-bar";
    floatingBar.onclick = () => toggleCartDrawer(true);
    document.body.appendChild(floatingBar);
  }

  if (floatingBar) {
    if (totalCount > 0) {
      const totals = calculateCartTotals();
      floatingBar.innerHTML = `
        <div class="floating-cart-info">
          <div class="floating-cart-badge"><i class="fa-solid fa-bag-shopping"></i> <span>${totalCount} ชิ้น</span></div>
          <div class="floating-cart-total">฿${totals.grandTotal.toLocaleString()}</div>
        </div>
        <div class="floating-cart-action">
          <span>ดูตะกร้า & ชำระเงิน</span> <i class="fa-solid fa-arrow-right"></i>
        </div>
      `;
      floatingBar.classList.add("active");
    } else {
      floatingBar.classList.remove("active");
    }
  }
}

function addToCart(productId, size = null, color = null, quantity = 1) {
  const product = AppState.products.find(p => p.id === productId);
  if (!product) return;

  const chosenSize = size || product.sizes[0];
  const chosenColor = color || product.colors[0].name;

  const existing = AppState.cart.find(
    item => item.id === productId && item.size === chosenSize && item.color === chosenColor
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    AppState.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      imageCdn: product.imageCdn,
      size: chosenSize,
      color: chosenColor,
      quantity: quantity
    });
  }

  saveCart();
  showToast(`เพิ่ม "${product.name}" (${chosenSize}) ลงตะกร้าแล้ว`);
}

function updateCartItemQty(index, change) {
  if (AppState.cart[index]) {
    AppState.cart[index].quantity += change;
    if (AppState.cart[index].quantity <= 0) {
      AppState.cart.splice(index, 1);
    }
    saveCart();
  }
}

function removeCartItem(index) {
  if (AppState.cart[index]) {
    const item = AppState.cart[index];
    AppState.cart.splice(index, 1);
    saveCart();
    showToast(`ลบ "${item.name}" ออกจากตะกร้าแล้ว`);
  }
}

function calculateCartTotals() {
  const subtotal = AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = Math.round(subtotal * AppState.discountRate);
  // หากเป็นออเดอร์ทดสอบระบบ (สินค้าเทสระบบชำระเงินราคา 1 บาท) และไม่มีสินค้าอื่น ให้ส่งฟรี 0 บาท เพื่อให้ยอดตรง 1.00 บาท พอดี
  const isOnlyTestOrder = AppState.cart.length > 0 && AppState.cart.every(item => item.id === 99 || item.price === 1);
  const shipping = (subtotal > 500 || subtotal === 0 || isOnlyTestOrder) ? 0 : 50; // ส่งฟรีเมื่อยอด 500 บาทขึ้นไป หรือออเดอร์ทดสอบระบบ
  const grandTotal = Math.max(0, subtotal - discount + shipping);

  return { subtotal, discount, shipping, grandTotal };
}

function renderCartDrawer() {
  const body = document.getElementById("cartBody");
  const totals = calculateCartTotals();

  if (!body) return;

  if (AppState.cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty-state">
        <i class="fa-solid fa-basket-shopping"></i>
        <h4>ตะกร้าสินค้ายังว่างอยู่</h4>
        <p style="font-size: 0.85rem; margin-top: 6px;">เลือกชุดเด็กน่ารักๆ เพิ่มลงตะกร้าได้เลยครับ</p>
      </div>
    `;
  } else {
    body.innerHTML = AppState.cart.map((item, idx) => `
      <div class="cart-item">
        <div class="cart-item-img">
          <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null; this.src='${item.imageCdn}'; this.onerror=function(){this.src='https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80';};" />
        </div>
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.name}</h4>
          <span class="cart-item-variant">ไซส์: ${item.size} | สี: ${item.color}</span>
          <div class="cart-item-bottom">
            <span class="cart-item-price">฿${(item.price * item.quantity).toLocaleString()}</span>
            <div class="qty-control">
              <button class="qty-btn" onclick="updateCartItemQty(${idx}, -1)">-</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" onclick="updateCartItemQty(${idx}, 1)">+</button>
            </div>
            <button class="qty-btn" onclick="removeCartItem(${idx})" title="ลบรายการ" style="color: #ef4444; margin-left: 4px;">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `).join("");
  }

  // Update Summary UI
  document.getElementById("cartSubtotal").textContent = `฿${totals.subtotal.toLocaleString()}`;
  document.getElementById("cartDiscount").textContent = `-฿${totals.discount.toLocaleString()}`;
  document.getElementById("cartShipping").textContent = totals.shipping === 0 ? "ฟรี (ยอดเกิน ฿500)" : `฿${totals.shipping}`;
  document.getElementById("cartGrandTotal").textContent = `฿${totals.grandTotal.toLocaleString()}`;

  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.disabled = AppState.cart.length === 0;
    checkoutBtn.style.opacity = AppState.cart.length === 0 ? "0.5" : "1";
  }
}

function toggleCartDrawer(open = null) {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  const shouldOpen = open !== null ? open : !drawer.classList.contains("open");

  if (shouldOpen) {
    drawer.classList.add("open");
    overlay.classList.add("open");
    renderCartDrawer();
  } else {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
  }
}

function applyCoupon() {
  const input = document.getElementById("couponInput");
  const code = input.value.trim().toUpperCase();

  if (code === "BABYPINK10") {
    AppState.discountRate = 0.10;
    AppState.activeCoupon = "BABYPINK10";
    showToast("ใช้โค้ด BABYPINK10 สำเร็จ! รับส่วนลด 10%");
    renderCartDrawer();
  } else if (code === "BABYFREE") {
    AppState.discountRate = 0.15;
    AppState.activeCoupon = "BABYFREE";
    showToast("ใช้โค้ด BABYFREE สำเร็จ! รับส่วนลด 15%");
    renderCartDrawer();
  } else {
    showToast("ไม่พบคูปองส่วนลดนี้ ลองใช้รหัส BABYPINK10 ดูนะครับ");
  }
}

// ==========================================================================
// Wishlist Management
// ==========================================================================
function toggleWishlist(productId) {
  const index = AppState.wishlist.indexOf(productId);
  if (index > -1) {
    AppState.wishlist.splice(index, 1);
    showToast("นำออกจากรายการโปรดแล้ว");
  } else {
    AppState.wishlist.push(productId);
    showToast("บันทึกในรายการโปรดแล้ว ❤️");
  }
  localStorage.setItem("baby_store_wishlist", JSON.stringify(AppState.wishlist));
  renderProducts();
}

// ==========================================================================
// Quick View Modal
// ==========================================================================
function openQuickView(productId) {
  const product = AppState.products.find(p => p.id === productId);
  if (!product) return;

  AppState.currentQuickView = {
    product: product,
    selectedSize: product.sizes[0],
    selectedColor: product.colors[0].name,
    quantity: 1
  };

  const modalContent = document.getElementById("quickViewContent");
  modalContent.innerHTML = `
    <div class="quick-view-grid">
      <div class="quick-view-img-frame">
        <img src="${product.image}" alt="${product.name}" onerror="this.onerror=null; this.src='${product.imageCdn}'; this.onerror=function(){this.src='https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80';};" />
      </div>
      <div>
        <span class="product-cat">${product.categoryName}</span>
        <h2 style="font-size: 1.3rem; margin: 4px 0 6px;">${product.name}</h2>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 10px;">${product.nameEn}</p>
        
        <div class="product-price-row" style="margin-bottom: 12px;">
          <span class="current-price" style="font-size: 1.5rem;">฿${product.price.toLocaleString()}</span>
          <span class="original-price">฿${product.originalPrice.toLocaleString()}</span>
        </div>

        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.5;">
          ${product.description}
        </p>

        <label style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary);">เลือกไซส์:</label>
        <div class="pill-group">
          ${product.sizes.map((s, i) => `
            <button class="choice-pill ${i === 0 ? 'selected' : ''}" onclick="selectQuickSize('${s}', this)">${s}</button>
          `).join("")}
        </div>

        <label style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary);">เลือกสี:</label>
        <div class="pill-group">
          ${product.colors.map((c, i) => `
            <button class="choice-pill ${i === 0 ? 'selected' : ''}" onclick="selectQuickColor('${c.name}', this)">
              <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${c.code}; margin-right:4px; vertical-align:middle; border:1px solid #ccc;"></span>
              ${c.name}
            </button>
          `).join("")}
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button class="btn-primary" style="flex: 1;" onclick="addQuickViewToCart()">
            <i class="fa-solid fa-cart-plus"></i> เพิ่มลงในตะกร้า
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("quickViewModal").classList.add("active");
}

function selectQuickSize(size, btn) {
  if (AppState.currentQuickView) AppState.currentQuickView.selectedSize = size;
  btn.parentElement.querySelectorAll(".choice-pill").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
}

function selectQuickColor(color, btn) {
  if (AppState.currentQuickView) AppState.currentQuickView.selectedColor = color;
  btn.parentElement.querySelectorAll(".choice-pill").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
}

function addQuickViewToCart() {
  if (!AppState.currentQuickView) return;
  const { product, selectedSize, selectedColor } = AppState.currentQuickView;
  addToCart(product.id, selectedSize, selectedColor, 1);
  closeModal("quickViewModal");
}

// ==========================================================================
// PromptPay Real QR Payment System (โอนจ่ายได้จริงตามมาตรฐาน EMVCo)
// ==========================================================================
let checkoutTimer = null;

function openPromptPayCheckout() {
  toggleCartDrawer(false);
  const totals = calculateCartTotals();
  if (totals.grandTotal <= 0) {
    showToast("⚠️ ตะกร้าสินค้าว่างเปล่า ไม่สามารถชำระเงินได้");
    return;
  }

  // แสดงยอดเงิน
  document.getElementById("promptpayAmount").textContent = `฿ ${totals.grandTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;

  // วาด PromptPay QR Code
  generateAndDisplayPromptPayQR(totals.grandTotal);

  // เริ่มตัวจับเวลาชำระเงิน 15 นาที
  startCheckoutTimer(15 * 60);

  document.getElementById("promptpayModal").classList.add("active");
}

function generateAndDisplayPromptPayQR(amount) {
  const canvas = document.getElementById("promptpayQrCanvas");
  const target = AppState.promptpayTarget;
  
  // สร้าง Payload มาตรฐาน EMVCo พร้อม CRC16
  const payload = PromptPay.generatePayload(target, amount);
  
  // วาดลง Canvas
  PromptPay.renderQR(canvas, payload, { size: 240, color: "#001a33" });

  const info = PromptPay.formatTarget(target);
  document.getElementById("promptpayRecipient").innerHTML = `
    โอนเข้าบัญชีพร้อมเพย์: <strong style="color: var(--pink-primary); font-family: monospace;">${info.display}</strong>
  `;
}

/**
 * ฟังก์ชันสำหรับแก้ไขเบอร์พร้อมเพย์รับเงินของร้านค้า (สำหรับแอดมินหรือระบบหลังบ้านเท่านั้น)
 * @param {string} newTarget - เบอร์โทรศัพท์ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก
 */
function setAdminPromptPayTarget(newTarget) {
  if (!newTarget || newTarget.length < 10) {
    console.warn("⚠️ กรุณาระบุเบอร์มือถือ 10 หลัก หรือเลขบัตร ปชช. 13 หลัก");
    return;
  }

  AppState.promptpayTarget = newTarget;
  const totals = calculateCartTotals();
  if (totals.grandTotal > 0) {
    generateAndDisplayPromptPayQR(totals.grandTotal);
  }
  console.log(`✅ อัปเดตเบอร์พร้อมเพย์รับเงินเป็น: ${newTarget} เรียบร้อย`);
}

function startCheckoutTimer(durationSeconds) {
  clearInterval(checkoutTimer);
  let timer = durationSeconds;
  const display = document.getElementById("promptpayTimer");

  function update() {
    const minutes = Math.floor(timer / 60).toString().padStart(2, "0");
    const seconds = (timer % 60).toString().padStart(2, "0");
    if (display) display.textContent = `${minutes}:${seconds}`;

    if (--timer < 0) {
      clearInterval(checkoutTimer);
      if (display) display.textContent = "00:00 (หมดอายุ)";
    }
  }

  update();
  checkoutTimer = setInterval(update, 1000);
}

let selectedSlipFile = null;

function handleSlipUpload(event) {
  const file = event.target.files[0];
  if (file) {
    selectedSlipFile = file;
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById("slipPreview");
      preview.src = e.target.result;
      preview.style.display = "block";
      document.getElementById("slipUploadText").textContent = `แนบสลิป: ${file.name}`;
      showToast("แนบภาพหลักฐานสลิปโอนเงินแล้ว");
    };
    reader.readAsDataURL(file);
  }
}

// ==========================================================================
// Google Sheets Integration (เชื่อมต่อฐานข้อมูลคำสั่งซื้อแบบ Real-time)
// ==========================================================================
const GOOGLE_SHEETS_CONFIG = {
  // ลิงก์ตาราง Google Sheets ของร้าน BabyPink
  sheetUrl: "https://docs.google.com/spreadsheets/d/1lzP0kcoIMh6zGosyNHgMZ3AqXMtLLrkmKQPPvy6hVyY/edit?gid=338856045#gid=338856045",
  
  // นำ Web App URL ที่ได้จากการ Deploy Apps Script (ลงท้ายด้วย /exec) มาวางที่นี่
  webhookUrl: "https://script.google.com/macros/s/AKfycbwwLZ2jV1C7uPYeXFL4Q4hkjsFx3626C4Cx58cmAkS7gbsn1OFrYfHH4rfor_twDy0G/exec", 

  async syncToGoogleSheets(orderData) {
    const activeUrl = this.webhookUrl || localStorage.getItem("babypink_sheets_webhook_url");
    if (!activeUrl) {
      console.log("ℹ️ Google Sheets Webhook ยังไม่ได้ตั้งค่า URL (ดูวิธีตั้งค่าใน google-sheets-script.js)");
      return;
    }

    try {
      // ส่งข้อมูลเข้า Google Apps Script Web App แบบ no-cors
      await fetch(activeUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          date: orderData.date,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerAddress: orderData.customerAddress,
          items: orderData.items,
          totalAmount: orderData.totalAmount,
          paymentMethod: orderData.paymentMethod || "พร้อมเพย์ 093-758-6699",
          deliveryStatus: orderData.deliveryStatus || "รอตรวจสอบยอดเงิน",
          slipUrl: orderData.slipUrl || (orderData.hasSlip ? "แนบหลักฐานสลิปแล้ว" : "-")
        })
      });
      console.log("บันทึกคำสั่งซื้อไปยัง Google Sheets สำเร็จ!");
      showToast("ข้อมูลคำสั่งซื้อถูกส่งไปยัง Google Sheets เรียบร้อย!");
    } catch (err) {
      console.warn("⚠️ Google Sheets Webhook sync error:", err);
    }
  }
};

function setGoogleSheetsWebhook() {
  const current = localStorage.getItem("babypink_sheets_webhook_url") || GOOGLE_SHEETS_CONFIG.webhookUrl || "";
  const input = prompt("กรุณาวาง Web App URL จาก Google Apps Script (ลงท้ายด้วย /exec):", current);
  if (input !== null) {
    const trimmed = input.trim();
    if (trimmed) {
      localStorage.setItem("babypink_sheets_webhook_url", trimmed);
      GOOGLE_SHEETS_CONFIG.webhookUrl = trimmed;
      showToast("✅ บันทึก Google Sheets Webhook เรียบร้อย!");
    } else {
      localStorage.removeItem("babypink_sheets_webhook_url");
      showToast("🗑️ ล้างค่า Webhook URL แล้ว");
    }
  }
}

async function confirmPayment() {
  const nameInput = document.getElementById("customerNameInput");
  const phoneInput = document.getElementById("customerPhoneInput");
  const addressInput = document.getElementById("customerAddressInput");

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const address = addressInput.value.trim();

  if (!name || !phone || !address) {
    showToast("⚠️ กรุณากรอกชื่อ เบอร์โทร และที่อยู่จัดส่งให้ครบถ้วน");
    return;
  }

  // ตรวจสอบว่ามีการแนบสลิปหลักฐานการโอนเงินหรือไม่ (ป้องกันการกดยืนยันโดยไม่โอนเงินจริง)
  const slipPreview = document.getElementById("slipPreview");
  const hasSlip = !!(slipPreview && slipPreview.src && slipPreview.style.display !== "none" && slipPreview.src.startsWith("data:image"));

  if (!hasSlip) {
    showToast("⚠️ กรุณาสแกน QR และแนบภาพสลิปหลักฐานการโอนเงินก่อนยืนยันครับ");
    const uploadZone = document.querySelector(".slip-upload-zone");
    if (uploadZone) {
      uploadZone.style.borderColor = "#ff4081";
      uploadZone.style.boxShadow = "0 0 15px rgba(255, 64, 129, 0.5)";
      uploadZone.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        uploadZone.style.borderColor = "";
        uploadZone.style.boxShadow = "";
      }, 2500);
    }
    return;
  }

  const totals = calculateCartTotals();
  const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);

  // อัปโหลดรูปสลิปขึ้น Supabase Storage เพื่อให้ได้ Direct URL จริง
  let slipUrl = "แนบหลักฐานสลิปแล้ว";
  if (selectedSlipFile && typeof SupabaseService.uploadSlip === "function") {
    try {
      showToast("☁️ กำลังบันทึกข้อมูลและอัปโหลดสลิป...");
      const uploadedUrl = await SupabaseService.uploadSlip(selectedSlipFile, orderId);
      if (uploadedUrl) {
        slipUrl = uploadedUrl;
      }
    } catch (e) {
      console.warn("Slip upload notice:", e);
    }
  }

  const now = new Date();
  const pad = num => String(num).padStart(2, "0");
  const formattedDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const orderData = {
    orderId: orderId,
    customerName: name,
    customerPhone: phone,
    customerAddress: address,
    items: [...AppState.cart],
    totalAmount: totals.grandTotal,
    discount: totals.discount,
    hasSlip: true,
    slipUrl: slipUrl,
    paymentStatus: "pending_verify", // สถานะการเงิน: รอตรวจสอบสลิป
    deliveryStatus: "รอตรวจสอบยอดเงิน", // สถานะการจัดส่ง: รอตรวจสอบยอดเงิน
    paymentMethod: "PromptPay พร้อมเพย์ (093-758-6699)",
    date: formattedDate
  };

  // 1. บันทึกลง Supabase หรือ Local Database
  await SupabaseService.saveOrder(orderData);

  // 2. บันทึกลง Google Sheets แบบ Real-time
  GOOGLE_SHEETS_CONFIG.syncToGoogleSheets(orderData);

  // ล้างตะกร้าและปิด Modal
  AppState.cart = [];
  saveCart();
  clearInterval(checkoutTimer);
  closeModal("promptpayModal");

  // แสดงหน้ารับออเดอร์สำเร็จ (สถานะรอตรวจสอบสลิป)
  showOrderSuccessModal(orderData);
}

function showOrderSuccessModal(order) {
  document.getElementById("successOrderId").textContent = order.orderId;
  document.getElementById("successOrderAmount").textContent = `฿${order.totalAmount.toLocaleString()}`;
  document.getElementById("successOrderAddress").textContent = `${order.customerName} | ${order.customerPhone}\n${order.customerAddress}`;
  
  // แสดงรูปสลิปใน Modal ความสำเร็จหากมีลิงก์
  const slipContainer = document.getElementById("successSlipContainer");
  const slipImg = document.getElementById("successSlipImg");
  const slipLink = document.getElementById("successSlipLink");
  if (slipContainer && slipImg && slipLink) {
    if (order.slipUrl && order.slipUrl.startsWith("http")) {
      slipImg.src = order.slipUrl;
      slipLink.href = order.slipUrl;
      slipContainer.style.display = "block";
    } else {
      slipContainer.style.display = "none";
    }
  }

  // รีเซ็ตฟอร์มสลิปเพื่อรองรับการสั่งซื้อครั้งต่อไป
  selectedSlipFile = null;
  const slipPreview = document.getElementById("slipPreview");
  const slipFileInput = document.getElementById("slipFileInput");
  const slipText = document.getElementById("slipUploadText");
  if (slipPreview) { slipPreview.src = ""; slipPreview.style.display = "none"; }
  if (slipFileInput) { slipFileInput.value = ""; }
  if (slipText) { slipText.textContent = "คลิกเพื่อแนบสลิปหลักฐานการโอนเงิน"; }

  document.getElementById("orderSuccessModal").classList.add("active");
}

// ==========================================================================
// Authentication & Supabase UI
// ==========================================================================
function updateAuthUI() {
  const userBtn = document.getElementById("userBtn");
  const userText = document.getElementById("userText");
  const userAvatar = document.getElementById("userAvatar");

  if (SupabaseService.currentUser) {
    userText.textContent = SupabaseService.currentUser.name;
    userAvatar.src = SupabaseService.currentUser.avatar;
    userAvatar.style.display = "block";
  } else {
    userText.textContent = "เข้าสู่ระบบ";
    userAvatar.style.display = "none";
  }
}

function openAuthModal() {
  if (SupabaseService.currentUser) {
    // หากล็อกอินอยู่แล้ว เปิดหน้าโปรไฟล์
    document.getElementById("profileUserName").textContent = SupabaseService.currentUser.name;
    document.getElementById("profileUserEmail").textContent = SupabaseService.currentUser.email;
    document.getElementById("profileUserAvatar").src = SupabaseService.currentUser.avatar;
    document.getElementById("userProfileModal").classList.add("active");
  } else {
    // หากยังไม่ล็อกอิน เปิดหน้าเลือกเข้าสู่ระบบ
    document.getElementById("authModal").classList.add("active");
  }
}

async function handleGoogleLogin() {
  try {
    showToast("กำลังเชื่อมต่อระบบยืนยันตัวตน Google...");
    await SupabaseService.signInWithGoogle();
    closeModal("authModal");
    updateAuthUI();
    showToast(`ยินดีต้อนรับคุณ ${SupabaseService.currentUser.name}`);
  } catch (err) {
    showToast("เกิดข้อผิดพลาดในการเข้าสู่ระบบ: " + err.message);
  }
}

async function handleLogout() {
  await SupabaseService.signOut();
  closeModal("userProfileModal");
  updateAuthUI();
  showToast("ออกจากระบบเรียบร้อยแล้ว");
}

// ==========================================================================
// Utilities & Modals Helper
// ==========================================================================
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

function showToast(message) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<i class="fa-solid fa-sparkles"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideInToast 0.3s reverse forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  renderProducts();
  renderTopProducts();
  updateCartBadge();
  renderCartDrawer();
  updateAuthUI();

  // Event Listeners for Search & Filter
  const searchInput = document.getElementById("headerSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      AppState.searchQuery = e.target.value;
      filterProducts();
    });
  }

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      AppState.sortBy = e.target.value;
      filterProducts();
    });
  }

  // Close Modals on click outside
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove("active");
      }
    });
  });
});
