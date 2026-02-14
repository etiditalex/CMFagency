"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import PaystackPop from "@paystack/inline-js";
import { useCart } from "@/contexts/CartContext";

const SHIPPING = 500;

export default function CartPage() {
  const searchParams = useSearchParams();
  const ref = searchParams?.get("ref") ?? null;

  const { cart, removeFromCart, updateQuantity, clearCart, getTotalPrice, getTotalItems } = useCart();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<{
    status: string;
    amount?: number;
    currency?: string;
  } | null>(null);

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/transactions/status?ref=${encodeURIComponent(ref)}`);
        const json = (await res.json()) as { status?: string; amount?: number; currency?: string; error?: string };
        if (!cancelled && json.status) setTxStatus({ status: json.status, amount: json.amount, currency: json.currency });
      } catch {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [ref]);

  const onCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      const emailTrim = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailTrim || !emailRegex.test(emailTrim)) {
        throw new Error("Please enter a valid email address.");
      }

      const useInline = !!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
      const res = await fetch("/api/paystack/merchandise-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrim,
          cart: cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            category: item.category,
          })),
          shipping: SHIPPING,
          inline: useInline,
        }),
      });

      const raw = await res.text();
      let json: { reference?: string; authorization_url?: string; amount_subunit?: number; currency?: string; error?: string } = {};
      if (raw) {
        try {
          json = JSON.parse(raw);
        } catch {}
      }

      if (!res.ok) {
        throw new Error(json?.error ?? `Checkout failed (HTTP ${res.status})`);
      }

      if (useInline && json.reference && json.amount_subunit != null && json.email && json.currency) {
        const paystack = new PaystackPop();
        paystack.newTransaction({
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
          email: json.email,
          amount: json.amount_subunit,
          currency: json.currency,
          reference: json.reference,
          channels: ["card", "mobile_money"],
          onSuccess: () => {
            window.location.href = `/cart?ref=${encodeURIComponent(json.reference!)}`;
          },
          onCancel: () => setSubmitting(false),
          onError: (err: { message?: string }) => {
            setError(err?.message ?? "Payment was not completed.");
            setSubmitting(false);
          },
        });
        return;
      }

      if (json.authorization_url) {
        window.location.href = json.authorization_url;
        return;
      }

      throw new Error("Missing payment link.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  };

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

                  {ref && txStatus && (
                    <div className="mb-6 rounded-lg border p-4 bg-secondary-50 border-secondary-200">
                      <div className="flex items-start gap-3">
                        {txStatus.status === "success" ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-secondary-700 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-semibold text-gray-900">Payment confirmed</div>
                              <div className="text-sm text-gray-700 mt-1">
                                Your order has been received. We&apos;ll contact you for delivery details.
                              </div>
                              {txStatus.amount != null && (
                                <div className="text-sm font-medium text-gray-600 mt-1">
                                  {txStatus.currency ?? "KES"} {txStatus.amount?.toLocaleString()} paid
                                </div>
                              )}
                            </div>
                          </>
                        ) : txStatus.status === "failed" || txStatus.status === "abandoned" ? (
                          <>
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-semibold text-gray-900">Payment not completed</div>
                              <div className="text-sm text-gray-700 mt-1">
                                Try again or contact us if you need help.
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0 animate-spin" />
                            <div>
                              <div className="font-semibold text-gray-900">Processing payment</div>
                              <div className="text-sm text-gray-700 mt-1">
                                We&apos;re confirming your payment. Reference: {ref.slice(0, 16)}...
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <form onSubmit={onCheckout} className="space-y-4">
                    <div>
                      <label htmlFor="cart-email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        id="cart-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="you@example.com"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Pay with card, M-Pesa, or Airtel Money via Paystack
                      </p>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal ({getTotalItems()} items)</span>
                        <span className="font-semibold">KSh {getTotalPrice().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Shipping</span>
                        <span className="font-semibold">KSh {SHIPPING.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between text-xl font-bold text-gray-900">
                          <span>Total</span>
                          <span>KSh {(getTotalPrice() + SHIPPING).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || cart.length === 0}
                      className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Proceed to Checkout"
                      )}
                    </button>
                  </form>

                  <a
                    href={`https://wa.me/254797777347?text=${encodeURIComponent(
                      `Hello! I would like to place an order:\n\n` +
                        cart.map(
                          (item) =>
                            `• ${item.name} (${item.category})\n  Quantity: ${item.quantity}\n  Price: KSh ${item.price.toLocaleString()} each\n  Subtotal: KSh ${(item.price * item.quantity).toLocaleString()}\n`
                        ).join("\n") +
                        `\nSubtotal: KSh ${getTotalPrice().toLocaleString()}\n` +
                        `Shipping: KSh ${SHIPPING}\n` +
                        `Total: KSh ${(getTotalPrice() + SHIPPING).toLocaleString()}\n\n` +
                        `Please confirm my order.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 block w-full text-center py-2 text-sm text-gray-600 hover:text-primary-600"
                  >
                    Or order via WhatsApp
                  </a>

                  <Link
                    href="/merchandise"
                    className="mt-4 block w-full text-center py-3 border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
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

