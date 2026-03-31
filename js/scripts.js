document.addEventListener('DOMContentLoaded', () => {

    let menuItems = []; 
    let cart = [];
    
    // Selectors
    const appContainer = document.getElementById('app-container');
    const loginModal = document.getElementById('admin-login-modal');
    const openLoginBtn = document.getElementById('open-admin-login');
    const closeLoginBtn = document.getElementById('close-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginForm = document.getElementById('login-form');
    const loader = document.getElementById('loader');

    function initApp() {
        checkAuth();
        setupNavigation();
        setupMenuEvents();
        setupCartEvents();
        setupForms();
        loadProducts();
    }

    function showLoader() { loader.style.display = 'flex'; }
    function hideLoader() { loader.style.display = 'none'; }

    function checkAuth() {
        const token = sessionStorage.getItem('adminToken');
        if (token) {
            document.querySelectorAll('.admin-nav').forEach(el => el.classList.remove('hidden'));
            logoutBtn.classList.remove('hidden');
            openLoginBtn.classList.add('hidden');
        } else {
            document.querySelectorAll('.admin-nav').forEach(el => el.classList.add('hidden'));
            logoutBtn.classList.add('hidden');
            openLoginBtn.classList.remove('hidden');
        }
    }

    // --- FETCH DATA ---
    async function loadProducts() {
        showLoader();
        try {
            const res = await fetch(`${API_URL}/api/products`);
            if (res.ok) {
                menuItems = await res.json();
                renderMenu();
                if(sessionStorage.getItem('adminToken')) renderAdminTable();
            } else {
                showNotification('Error cargando el menú', 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('Error de conexión', 'error');
        }
        hideLoader();
    }

    // --- RENDER MENU VIEW ---
    function renderMenu() {
        const menuGrid = document.getElementById('menu-grid');
        if (!menuGrid) return;
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const category = document.getElementById('category-filter').value;
        
        menuGrid.innerHTML = '';
        
        let filtered = menuItems;
        if (category !== 'all') filtered = filtered.filter(i => i.category === category);
        if (searchTerm) filtered = filtered.filter(i => i.name.toLowerCase().includes(searchTerm));

        if (filtered.length === 0) {
            menuGrid.innerHTML = '<p style="text-align:center; width: 100%; color:#888;">No se encontraron productos.</p>';
            return;
        }

        filtered.forEach(item => {
            const quantityInCart = cart.find(ci => ci.id === item.id)?.quantity || 0;
            const currentStock = item.stock - quantityInCart;
            
            let stockClass = 'stock-out';
            let stockText = 'Agotado';
            
            if (currentStock > 10) { stockClass = 'stock-high'; stockText = 'Disponible'; }
            else if (currentStock > 5) { stockClass = 'stock-medium'; stockText = `¡Quedan ${currentStock}!`; }
            else if (currentStock > 0) { stockClass = 'stock-low'; stockText = `¡Solo ${currentStock}!`; }

            const card = document.createElement('div');
            card.className = 'card premium-card';
            card.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="card-img" onerror="this.src='images/logo.png'">
                <div class="card-body">
                    <h3 class="card-title">${item.name}</h3>
                    <p class="card-text">${item.description || ''}</p>
                    <div class="card-footer">
                        <div>
                            <p class="price-tag">Bs ${item.price.toFixed(2)}</p>
                            <span class="stock-badge ${stockClass}">${stockText}</span>
                        </div>
                        <button class="cta-button add-to-cart-btn" data-id="${item.id}" ${currentStock === 0 ? 'disabled' : ''}>
                           <i class="fa-solid fa-plus"></i> Añadir
                        </button>
                    </div>
                </div>
            `;
            menuGrid.appendChild(card);
        });
    }

    // --- CART LOGIC ---
    function updateCartCounter() {
        const counter = document.getElementById('cart-counter');
        counter.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    function addToCart(id) {
        const itemInMenu = menuItems.find(i => i.id === id);
        const itemInCart = cart.find(i => i.id === id);
        const quantityInCart = itemInCart ? itemInCart.quantity : 0;
        
        if (quantityInCart >= itemInMenu.stock) {
            return showNotification(`No hay más stock de ${itemInMenu.name}`, 'error');
        }
        
        if (itemInCart) itemInCart.quantity++; 
        else cart.push({ ...itemInMenu, quantity: 1 });
        
        showNotification(`${itemInMenu.name} añadido!`, 'success');
        updateCartCounter();
        renderMenu();
        if(document.getElementById('pedido').classList.contains('active')) renderCartPage();
    }

    function updateCartQty(id, qty) {
        const cartItem = cart.find(i => i.id === id);
        if (!cartItem) return;
        const itemInMenu = menuItems.find(i => i.id === id);
        
        if (qty > itemInMenu.stock) qty = itemInMenu.stock;
        if (qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        } else {
            cartItem.quantity = qty;
        }
        updateCartCounter();
        renderCartPage();
        renderMenu();
    }

    function renderCartPage() {
        const list = document.getElementById('cart-items-list');
        const totalEl = document.getElementById('cart-total-price');
        const checkoutBtn = document.getElementById('checkout-btn');
        list.innerHTML = '';
        
        if (cart.length === 0) {
            list.innerHTML = '<p style="text-align:center; padding: 2rem;">Tu carrito está vacío.</p>';
            totalEl.textContent = 'Bs 0.00';
            checkoutBtn.disabled = true;
            return;
        }
        checkoutBtn.disabled = false;
        
        let total = 0;
        cart.forEach(item => {
            const row = document.createElement('div');
            row.className = 'cart-item';
            row.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.src='images/logo.png'">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <p class="cart-item-price">Bs ${item.price.toFixed(2)}</p>
                </div>
                <div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="document.dispatchEvent(new CustomEvent('updateCart', {detail:{id:${item.id}, q:${item.quantity-1}}}))">-</button>
                        <input type="text" value="${item.quantity}" class="quantity-input" readonly>
                        <button class="quantity-btn" onclick="document.dispatchEvent(new CustomEvent('updateCart', {detail:{id:${item.id}, q:${item.quantity+1}}}))">+</button>
                    </div>
                </div>
                <button class="remove-item-btn" onclick="document.dispatchEvent(new CustomEvent('updateCart', {detail:{id:${item.id}, q:0}}))"><i class="fa-solid fa-trash"></i></button>
            `;
            list.appendChild(row);
            total += item.price * item.quantity;
        });
        totalEl.textContent = `Bs ${total.toFixed(2)}`;
    }

    document.addEventListener('updateCart', (e) => {
        updateCartQty(e.detail.id, e.detail.q);
    });

    // --- CHECKOUT ---
    let lastOrder = [];
    let lastTotal = 0;

    document.getElementById('checkout-btn').addEventListener('click', async () => {
        if(cart.length === 0) return;
        
        const payload = { cart: cart.map(i => ({ id: i.id, quantity: i.quantity })) };
        showLoader();
        try {
            const res = await fetch(`${API_URL}/api/buy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                lastOrder = [...cart];
                lastTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
                cart = [];
                updateCartCounter();
                showModalExito('¡Pedido Exitoso!', 'Se descontaron los artículos de nuestro inventario (Base de Datos). Te esperamos.');
                await loadProducts(); // recargar
            } else {
                showNotification(data.message, 'error');
            }
        } catch (e) {
            showNotification('Error en la compra', 'error');
        }
        hideLoader();
    });

    // --- EVENTS SETUP ---
    function setupMenuEvents() {
        document.getElementById('search-input').addEventListener('input', renderMenu);
        document.getElementById('category-filter').addEventListener('change', renderMenu);
        document.getElementById('menu-grid').addEventListener('click', e => {
            const btn = e.target.closest('.add-to-cart-btn');
            if (btn) addToCart(Number(btn.dataset.id));
        });
    }

    function setupCartEvents() {
        document.getElementById('reservation-form').addEventListener('submit', e => {
            e.preventDefault();
            showModalExito('¡Reserva VIP Lista!', 'Te esperamos a la hora acordada.');
            e.target.reset();
        });
    }

    function setupNavigation() {
        document.querySelectorAll('[data-page]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = e.currentTarget.dataset.page;
                if(pageId === 'admin' && !sessionStorage.getItem('adminToken')) return;
                
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                
                const page = document.getElementById(pageId);
                if (page) {
                    page.classList.add('active');
                    e.currentTarget.classList.add('active');
                    window.scrollTo({top:0, behavior:'smooth'});
                    
                    if(pageId === 'pedido') renderCartPage();
                    if(pageId === 'admin') renderAdminTable();
                }
            });
        });
    }

    function setupForms() {
        // Modal logic
        openLoginBtn.addEventListener('click', (e) => { e.preventDefault(); loginModal.classList.add('show'); });
        closeLoginBtn.addEventListener('click', () => loginModal.classList.remove('show'));
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usr = document.getElementById('admin-user').value;
            const pwd = document.getElementById('admin-pass').value;
            const err = document.getElementById('login-error');
            
            showLoader();
            try {
                const res = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: usr, password: pwd})
                });
                const data = await res.json();
                if(res.ok && data.success) {
                    sessionStorage.setItem('adminToken', data.token);
                    loginModal.classList.remove('show');
                    checkAuth();
                    showNotification('¡Hola Liliana!', 'success');
                    document.querySelector('[data-page="admin"]').click();
                    err.classList.add('hidden');
                } else {
                    err.classList.remove('hidden');
                }
            } catch(error) {
                console.error(error);
            }
            hideLoader();
        });

        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('adminToken');
            checkAuth();
            document.querySelector('[data-page="inicio"]').click();
            showNotification('Sesión cerrada');
        });

        // Add new product
        document.getElementById('new-product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('np-name').value;
            const price = parseFloat(document.getElementById('np-price').value);
            const category = document.getElementById('np-category').value;
            const stock = parseInt(document.getElementById('np-stock').value);
            const image = document.getElementById('np-image').value;
            const desc = document.getElementById('np-desc').value;

            showLoader();
            try {
                const res = await fetch(`${API_URL}/api/products`, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({name, price, category, stock, image, description: desc})
                });
                if(res.ok) {
                    showNotification('Plato añadido a BD!', 'success');
                    e.target.reset();
                    await loadProducts();
                }
            } catch (err) { }
            hideLoader();
        });
        
        document.getElementById('close-success-modal-btn').addEventListener('click', () => {
             document.getElementById('success-modal').classList.remove('show');
        });

        // Generate PDF
        document.getElementById('generate-pdf-btn')?.addEventListener('click', () => {
            if(!lastOrder || lastOrder.length === 0) return;
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.text("Pollos Liliana & Gladis", 105, 20, null, null, "center");
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            doc.text("Recibo de Compra Oficial VIP", 105, 30, null, null, "center");
            
            const tableData = lastOrder.map(item => [
                item.name, 
                item.quantity.toString(), 
                `Bs ${item.price.toFixed(2)}`, 
                `Bs ${(item.price * item.quantity).toFixed(2)}`
            ]);
            
            doc.autoTable({
                startY: 40,
                head: [['Producto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [139, 0, 0], textColor: [255, 255, 255] }, // Dark red header
                styles: { halign: 'center' },
                columnStyles: { 0: { halign: 'left' } }
            });
            
            let finalY = doc.lastAutoTable.finalY || 40;
            doc.setFont("helvetica", "bold");
            doc.text(`TOTAL A PAGAR: Bs ${lastTotal.toFixed(2)}`, 195, finalY + 15, null, null, "right");
            
            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);
            doc.text("¡Gracias por su preferencia! Le esperamos de vuelta.", 105, finalY + 35, null, null, "center");
            doc.text("Cuatro Cañadas, Santa Cruz - Cel: 63585285", 105, finalY + 42, null, null, "center");
            
            doc.save("Recibo_Pollos_Liliana_Gladis.pdf");
        });

        // WhatsApp Checkout
        document.getElementById('whatsapp-btn')?.addEventListener('click', () => {
            if(!lastOrder || lastOrder.length === 0) return;
            
            let message = "🍗 *NUEVO PEDIDO - POLLOS LILIANA & GLADIS* 🍗\n\n";
            message += "Hola, acabo de realizar este pedido en la web:\n";
            
            lastOrder.forEach(item => {
                message += `👉 ${item.quantity}x ${item.name} (- Bs ${(item.price * item.quantity).toFixed(2)})\n`;
            });
            
            message += `\n💵 *TOTAL COMPRA: Bs ${lastTotal.toFixed(2)}*\n\n`;
            message += "¡Muchas gracias! Ya descargué mi recibo también.";
            
            const encodedMessage = encodeURIComponent(message);
            const phoneNumber = "59163585285"; // El número que usamos en las primeras etapas
            window.open(`https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`, '_blank');
        });
    }

    // --- ADMIN DASHBOARD ---
    function renderAdminTable() {
        const tbody = document.getElementById('inventory-tbody');
        tbody.innerHTML = '';
        menuItems.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${item.id}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.category}</td>
                <td><input type="number" id="edit-price-${item.id}" value="${item.price}" step="0.5" class="edit-input"></td>
                <td><input type="number" id="edit-stock-${item.id}" value="${item.stock}" class="edit-input"></td>
                <td><button class="save-btn" onclick="document.dispatchEvent(new CustomEvent('updateProduct', {detail:${item.id}}))"><i class="fa-solid fa-floppy-disk"></i> Guardar</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.addEventListener('updateProduct', async (e) => {
        const id = e.detail;
        const price = parseFloat(document.getElementById(`edit-price-${id}`).value);
        const stock = parseInt(document.getElementById(`edit-stock-${id}`).value);
        showLoader();
        try {
            const res = await fetch(`${API_URL}/api/products/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({price, stock})
            });
            if(res.ok){
                showNotification('Producto actualizado', 'success');
                await loadProducts(); // Recarga la info oficial
            }
        }catch(e){
            showNotification('Error al editar DB', 'error');
        }
        hideLoader();
    });

    // Utilities
    function showNotification(msg, type='success') {
        const el = document.getElementById('notification');
        el.textContent = msg;
        el.style.background = type === 'error' ? 'rgba(211, 47, 47, 0.9.5)' : 'rgba(76, 175, 80, 0.95)';
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3000);
    }
    
    function showModalExito(title, msg) {
        document.getElementById('success-modal-title').textContent = title;
        document.getElementById('success-modal-message').textContent = msg;
        document.getElementById('success-modal').classList.add('show');
    }

    initApp();
});
