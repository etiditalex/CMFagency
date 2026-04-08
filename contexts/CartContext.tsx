"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface CartItem {
  /** Unique line identifier: `${productId}::${size||''}::${color||''}` */
  key: string;
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart)) {
            const normalized = parsedCart
              .filter(Boolean)
              .map((it: any) => {
                const id = Number(it?.id ?? 0);
                const size = typeof it?.size === "string" ? it.size : null;
                const color = typeof it?.color === "string" ? it.color : null;
                const key = typeof it?.key === "string" && it.key.trim() ? it.key : `${id}::${size ?? ""}::${color ?? ""}`;
                return { ...it, id, size, color, key } as CartItem;
              });
            setCart(normalized);
          }
        } catch (error) {
          console.error("Error loading cart from localStorage:", error);
          localStorage.removeItem("cart");
        }
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cart", JSON.stringify(cart));
      } catch (error) {
        console.error("Error saving cart to localStorage:", error);
      }
    }
  }, [cart]);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.key === item.key);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.key === item.key
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (key: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.key !== key));
  };

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(key);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.key === key ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalPrice,
        getTotalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

