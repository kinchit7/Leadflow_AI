---
name: ecommerce
description: Cart and checkout functionality for catalog collections. Use when implementing shopping cart, checkout, buy now, product purchasing, or any ecommerce features.
---

# eCommerce

This skill contains all patterns for implementing shopping cart, checkout, and product purchasing functionality.

---

## Critical Rule

**Cart and buyNow ONLY work with `@catalog` collections.**

Before implementing ecommerce features:
1. Check `src/entities/index.ts` for catalog collections
2. If NO `@catalog` exists → do NOT implement cart/buyNow
3. If `@catalog` exists → MUST implement cart or buyNow

---

## Pricing Rules

- Each catalog item has a price field
- Prices are **fixed** to collection values
- Custom/dynamic pricing is **NOT supported**
- You cannot modify prices at checkout

### Currency Display (CRITICAL)

**NEVER hardcode currency symbols** like `$`, `€`, or `£`. Always use `formatPrice()` with the currency from `useCurrency()`:

```typescript
import { useCurrency, formatPrice, DEFAULT_CURRENCY } from '@/integrations';

const { currency } = useCurrency();

// ❌ WRONG - hardcoded currency
<span>${product.price.toFixed(2)}</span>

// ✅ CORRECT - dynamic currency from site settings
<span>{formatPrice(product.price, currency ?? DEFAULT_CURRENCY)}</span>
```

The `formatPrice()` function:
- Formats prices with proper locale (symbol placement, decimals)
- Uses Intl.NumberFormat for browser-native formatting
- Falls back to USD if invalid currency code provided

The `useCurrency()` hook:
- Fetches site currency from the ecommerce API
- Represents the site's currency from Business Manager
- Returns `null` while loading, use `DEFAULT_CURRENCY` as fallback

---

## Required Components Checklist

**Before finishing any ecommerce implementation, verify ALL exist:**

- [ ] **Cart UI component** (drawer, modal, or sidebar)
- [ ] **Cart icon in Header** showing item count
- [ ] **"Add to Cart" buttons** on product cards/pages

**Missing any = incomplete app.**

---

## useCart Hook

```typescript
import { useCart, useCurrency, formatPrice, DEFAULT_CURRENCY } from '@/integrations';

const MyComponent = () => {
  const {
    items,          // CartItem[] - items in cart
    itemCount,      // number - total quantity of all items
    totalPrice,     // number - sum of all items
    isOpen,         // boolean - cart UI open state
    isLoading,      // boolean - true while fetching cart
    addingItemId,   // string | null - item currently being added
    isCheckingOut,  // boolean - checkout in progress
    error,          // string | null - error message if any operation failed
    actions         // object - all cart actions
  } = useCart();

  // Get site currency from separate hook
  const { currency } = useCurrency();

  // Format prices with site currency
  const formattedTotal = formatPrice(totalPrice, currency ?? DEFAULT_CURRENCY);

  return (
    // ...
  );
};
```

### CartItem Shape

```typescript
interface CartItem {
  id: string;           // Cart item ID
  collectionId: string; // Collection the item belongs to
  itemId: string;       // Original item ID from collection
  name: string;         // Product name
  price: number;        // Item price
  quantity: number;     // Quantity in cart
  image?: string;       // Product image URL (optional)
}
```

---

## Cart Actions

```typescript
const { actions } = useCart();

// Add item to cart (quantity defaults to 1)
actions.addToCart({
  collectionId: 'products',
  itemId: item._id,
  quantity: 1
});

// Remove item from cart (pass the whole cart item object)
actions.removeFromCart(cartItem);

// Update quantity (pass the whole cart item and new quantity)
actions.updateQuantity(cartItem, newQuantity);

// Toggle cart open/closed
actions.toggleCart();

// Open cart
actions.openCart();

// Close cart
actions.closeCart();

// Clear all items from cart
actions.clearCart();

// Proceed to checkout
actions.checkout();
```

---

## Loading States

### addToCart Loading

**`addToCart` is NOT instant** - it waits for the server response. Show loading on the specific button only:

```typescript
import { useCart, useCurrency, formatPrice, DEFAULT_CURRENCY } from '@/integrations';

const ProductCard = ({ item }) => {
  const { addingItemId, actions } = useCart();
  const { currency } = useCurrency();

  // Check if THIS item is being added
  const isAdding = addingItemId === item._id;

  return (
    <div className="border rounded-lg p-4">
      <h3>{item.name}</h3>
      <p>{formatPrice(item.price, currency ?? DEFAULT_CURRENCY)}</p>

      <Button
        disabled={isAdding}
        onClick={() => actions.addToCart({
          collectionId: 'products',
          itemId: item._id
        })}
      >
        {isAdding ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          'Add to Cart'
        )}
      </Button>
    </div>
  );
};
```

### removeFromCart & updateQuantity

These are **optimistic** - instant UI update, no loading needed:

```typescript
// Just call the action, UI updates immediately
<Button onClick={() => actions.removeFromCart(item)}>
  Remove
</Button>

<Button onClick={() => actions.updateQuantity(item, item.quantity + 1)}>
  +
</Button>
```

### isCheckingOut Loading

True during checkout process - disable the checkout button:

```typescript
<Button
  onClick={actions.checkout}
  disabled={isCheckingOut}
  className="w-full"
>
  {isCheckingOut ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Processing...
    </>
  ) : (
    'Checkout'
  )}
</Button>
```

---

## Buy Now API

For direct purchase without adding to cart:

```typescript
import { buyNow } from '@/integrations';

const handleBuyNow = async () => {
  await buyNow([
    {
      collectionId: 'products',
      itemId: item._id,
      quantity: 1
    }
  ]);
};

// Multiple items
await buyNow([
  { collectionId: 'products', itemId: 'item-1', quantity: 2 },
  { collectionId: 'products', itemId: 'item-2', quantity: 1 },
]);
```

---

## Cart UI Component

**No pre-built cart UI exists** - you must create your own.

### Requirements

- **Responsive** - handle all screen sizes
- **Scrollable items area** - for when there are many items
- **No overflow** - content must fit within the container
- **Clear totals** - show item count and total price
- **Checkout button** - prominent call to action

### Cart Drawer Pattern (Recommended)

```typescript
import { useCart, useCurrency, formatPrice, DEFAULT_CURRENCY, type CartItem } from '@/integrations';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { Minus, Plus, Trash2, Loader2 } from 'lucide-react';

const CartDrawer = () => {
  const {
    items,
    itemCount,
    totalPrice,
    isOpen,
    isCheckingOut,
    actions
  } = useCart();
  const { currency } = useCurrency();

  return (
    <Sheet open={isOpen} onOpenChange={actions.toggleCart}>
      <SheetContent className="flex flex-col w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Shopping Cart ({itemCount})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="font-paragraph text-muted-foreground mb-4">
                Your cart is empty
              </p>
              <Button variant="outline" onClick={actions.closeCart}>
                Continue Shopping
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Scrollable items area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map(item => (
                <CartItemRow key={item.id} item={item} currency={currency} />
              ))}
            </div>

            {/* Fixed footer with totals */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-heading text-lg">Total</span>
                <span className="font-heading text-xl">
                  {formatPrice(totalPrice, currency ?? DEFAULT_CURRENCY)}
                </span>
              </div>

              <Button
                onClick={actions.checkout}
                disabled={isCheckingOut}
                className="w-full"
                size="lg"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Checkout'
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

const CartItemRow = ({ item, currency }: { item: CartItem; currency: string | null }) => {
  const { actions } = useCart();

  return (
    <div className="flex gap-4">
      {/* Image */}
      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
        <Image
          src={item.image}
          alt={item.name}
          width={80}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-heading text-sm truncate">{item.name}</h4>
        <span className="font-paragraph text-muted-foreground">
          {formatPrice(item.price, currency ?? DEFAULT_CURRENCY)}
        </span>

        {/* Quantity controls */}
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              if (item.quantity === 1) {
                actions.removeFromCart(item);
              } else {
                actions.updateQuantity(item, item.quantity - 1);
              }
            }}
          >
            <Minus className="w-3 h-3" />
          </Button>

          <span className="w-8 text-center font-paragraph">
            {item.quantity}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => actions.updateQuantity(item, item.quantity + 1)}
          >
            <Plus className="w-3 h-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto text-destructive"
            onClick={() => actions.removeFromCart(item)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
```

---

## Header Cart Icon

Add to your Header component:

```typescript
import { useCart } from '@/integrations';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header = () => {
  const { itemCount, actions } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="max-w-[100rem] mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="font-heading text-xl">Brand</Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {/* ... nav links */}
        </nav>

        {/* Cart button */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={actions.toggleCart}
        >
          <ShoppingCart className="w-5 h-5" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center font-medium">
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
};
```

---

## Product Card with Add to Cart

```typescript
import { useCart, useCurrency, formatPrice, DEFAULT_CURRENCY } from '@/integrations';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Product {
  _id: string;
  name: string;
  price: number;
  image: string;
  slug: string;
}

const ProductCard = ({ product }: { product: Product }) => {
  const { addingItemId, actions } = useCart();
  const { currency } = useCurrency();
  const isAdding = addingItemId === product._id;

  return (
    <div className="group border rounded-lg overflow-hidden">
      {/* Image */}
      <Link to={`/products/${product.slug}`}>
        <div className="aspect-square relative overflow-hidden">
          <Image
            src={product.image}
            alt={product.name}
            width={400}
            className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      </Link>

      {/* Details */}
      <div className="p-4">
        <Link to={`/products/${product.slug}`}>
          <h3 className="font-heading text-lg mb-1 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        <p className="font-paragraph text-lg font-medium mb-4">
          {formatPrice(product.price, currency ?? DEFAULT_CURRENCY)}
        </p>

        <Button
          className="w-full"
          disabled={isAdding}
          onClick={() => actions.addToCart({
            collectionId: 'products',
            itemId: product._id
          })}
        >
          {isAdding ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
```

---

## Product Detail Page

```typescript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BaseCrudService, useCart, useCurrency, buyNow, formatPrice, DEFAULT_CURRENCY } from '@/integrations';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Minus, Plus } from 'lucide-react';

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addingItemId, actions } = useCart();
  const { currency } = useCurrency();

  const isAdding = addingItemId === product?._id;

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      const data = await BaseCrudService.getById('products', id);
      setProduct(data);
    };
    loadProduct();
  }, [id]);

  if (!product) {
    return <div>Loading...</div>;
  }

  const handleAddToCart = () => {
    actions.addToCart({
      collectionId: 'products',
      itemId: product._id,
      quantity
    });
  };

  return (
    <div className="max-w-[100rem] mx-auto px-4 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image */}
        <div className="aspect-square relative rounded-lg overflow-hidden">
          <Image
            src={product.image}
            alt={product.name}
            width={800}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div>
          <h1 className="font-heading text-3xl md:text-4xl mb-4">
            {product.name}
          </h1>

          <p className="font-heading text-2xl mb-6">
            {formatPrice(product.price, currency ?? DEFAULT_CURRENCY)}
          </p>

          <p className="font-paragraph text-muted-foreground mb-8">
            {product.description}
          </p>

          {/* Quantity selector */}
          <div className="flex items-center gap-4 mb-6">
            <span className="font-paragraph">Quantity:</span>
            <div className="flex items-center border rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-12 text-center font-paragraph">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(q => q + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Add to Cart */}
          <div className="flex gap-4">
            <Button
              size="lg"
              className="flex-1"
              disabled={isAdding}
              onClick={handleAddToCart}
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </>
              )}
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={() => buyNow([{
                collectionId: 'products',
                itemId: product._id,
                quantity
              }])}
            >
              Buy Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## App Integration

Make sure CartDrawer is included in your app layout:

```typescript
// In your main App or layout component
import CartDrawer from '@/components/CartDrawer';

const App = () => {
  return (
    <>
      <Header />
      <main>
        {/* Routes */}
      </main>
      <Footer />

      {/* Cart drawer - renders as overlay */}
      <CartDrawer />
    </>
  );
};
```

---

## Summary Checklist

Before completing any ecommerce implementation:

1. ✅ Check for `@catalog` collection in entities
2. ✅ Create Cart UI component (drawer/modal)
3. ✅ Add cart icon with count badge to Header
4. ✅ Add "Add to Cart" buttons on product cards
5. ✅ Handle loading states (`addingItemId`, `isCheckingOut`)
6. ✅ Test add, remove, quantity update, and checkout flows
7. ✅ Ensure cart UI is responsive
