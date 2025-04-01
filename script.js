// در بخش تعریف محصولات (products)، محصولات جدید را اضافه کنید:
const products = {
    // ... محصولات قبلی شما ...
    
    11: {
        id: 11,
        title: "هندزفری بی‌سیم",
        price: 1599000,
        discount: 0.25,
        image: "https://example.com/image1.jpg",
        description: "توضیحات محصول",
        specs: [/* مشخصات */],
        images: [/* تصاویر */],
        category: "headphones"
    },
    12: {
        id: 12,
        title: "کوله پشتی",
        price: 2499000,
        discount: 0.30,
        image: "https://example.com/image2.jpg",
        description: "توضیحات محصول",
        specs: [/* مشخصات */],
        images: [/* تصاویر */],
        category: "bags"
    }
};

// قبل از تابع initializePage این تابع جدید را اضافه کنید:
function showDiscountedProducts() {
    const container = document.getElementById('discountedProducts');
    container.innerHTML = '';
    
    Object.values(products)
        .filter(product => product.discount)
        .forEach(product => {
            const discountedPrice = product.price * (1 - product.discount);
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.title}" class="product-image">
                <div class="product-info">
                    <h3 class="product-name">${product.title}</h3>
                    <div class="price-container">
                        <span class="original-price">${formatPrice(product.price)}</span>
                        <span class="discounted-price">${formatPrice(discountedPrice)}</span>
                    </div>
                </div>
                <div class="discount-badge">${Math.round(product.discount * 100)}%</div>
            `;
            productCard.addEventListener('click', () => showProduct(product.id));
            container.appendChild(productCard);
        });
}

// درون تابع initializePage، قبل از آخرین آکولاد این خط را اضافه کنید:
showDiscountedProducts();