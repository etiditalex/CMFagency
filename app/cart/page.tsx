"use client";

import { motion } from "framer-motion";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, getTotalPrice, getTotalItems } = useCart();

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <section className="section-padding">
        <div className="container-custom max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <Link
              href="/merchandise"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-semibold mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Continue Shopping</span>
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Shopping Cart
            </h1>
            <p className="text-gray-600">
              {getTotalItems()} {getTotalItems() === 1 ? "item" : "items"} in your cart
            </p>
          </motion.div>

          {cart.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-xl shadow-lg p-12 text-center"
            >
              <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">Add some items to your cart to get started.</p>
              <Link
                href="/merchandise"
                className="inline-block btn-primary"
              >
                Browse Merchandise
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cart.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-lg p-6 flex flex-col md:flex-row gap-4"
                  >
                    <div className="relative w-full md:w-32 h-32 flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{item.category}</p>
                        <p className="text-2xl font-bold text-primary-600">
                          KSh {item.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-4 h-4 text-gray-700" />
                          </button>
                          <span className="text-lg font-semibold text-gray-900 w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-4 h-4 text-gray-700" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="mt-2 text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          Subtotal: KSh {(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 font-semibold transition-colors"
                >
                  Clear Cart
                </button>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="bg-white rounded-xl shadow-lg p-6 sticky top-24"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({getTotalItems()} items)</span>
                      <span className="font-semibold">KSh {getTotalPrice().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span className="font-semibold">KSh 500</span>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between text-xl font-bold text-gray-900">
                        <span>Total</span>
                        <span>KSh {(getTotalPrice() + 500).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/254797777347?text=${encodeURIComponent(
                      `Hello! I would like to place an order:\n\n` +
                      cart.map((item) => 
                        `• ${item.name} (${item.category})\n  Quantity: ${item.quantity}\n  Price: KSh ${item.price.toLocaleString()} each\n  Subtotal: KSh ${(item.price * item.quantity).toLocaleString()}\n`
                      ).join('\n') +
                      `\nSubtotal: KSh ${getTotalPrice().toLocaleString()}\n` +
                      `Shipping: KSh 500\n` +
                      `Total: KSh ${(getTotalPrice() + 500).toLocaleString()}\n\n` +
                      `Please confirm my order.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full btn-primary mb-4 inline-block text-center"
                  >
                    Proceed to Checkout
                  </a>
                  <Link
                    href="/merchandise"
                    className="block w-full text-center py-3 border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
                  >
                    Continue Shopping
                  </Link>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

