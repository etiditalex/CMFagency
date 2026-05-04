"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ShoppingCart, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";

export type ProductDetail = {
  id: number;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string;
  category: string;
  description: string;
  inStock: boolean;
  sizes: string[];
  colors: string[];
};

export default function MerchandiseProductClient({ product }: { product: ProductDetail }) {
  const { addToCart, cart } = useCart();
  const [variant, setVariant] = useState<{ size: string; color: string }>({
    size: product.sizes[0] ?? "",
    color: product.colors[0] ?? "",
  });
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const key = useMemo(() => `${product.id}::${variant.size ?? ""}::${variant.color ?? ""}`, [product.id, variant]);
  const alreadyInCart = cart.some((c) => c.key === key);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen]);

  return (
    <div className="pt-24 md:pt-28 min-h-screen bg-gray-50">
      <div className="container-custom">
        <div className="mb-5 text-sm text-gray-600">
          <Link href="/merchandise" className="text-primary-700 hover:underline">
            ← Back to merchandise
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="relative block w-full aspect-square cursor-zoom-in"
              aria-label="Open product image"
            >
              <Image src={product.image} alt={product.name} fill unoptimized className="object-contain bg-white" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-primary-700">{product.category || "Merchandise"}</p>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-gray-900">{product.name}</h1>
            {product.description ? <p className="mt-3 text-gray-700 leading-relaxed">{product.description}</p> : null}

            <div className="mt-5 flex items-end gap-3">
              <div className="text-3xl font-extrabold text-gray-900">KSh {product.price.toLocaleString()}</div>
              {product.originalPrice != null ? (
                <div className="text-sm text-gray-500 line-through pb-1">KSh {product.originalPrice.toLocaleString()}</div>
              ) : null}
            </div>

            <div className="mt-6 space-y-4">
              {product.sizes.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-gray-700">Size</label>
                  <select
                    value={variant.size}
                    onChange={(e) => setVariant((v) => ({ ...v, size: e.target.value }))}
                    className="min-w-[200px] rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    {product.sizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {product.colors.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-gray-700">Color</label>
                  <select
                    value={variant.color}
                    onChange={(e) => setVariant((v) => ({ ...v, color: e.target.value }))}
                    className="min-w-[200px] rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    {product.colors.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  disabled={
                    !product.inStock ||
                    (product.sizes.length > 0 && !variant.size) ||
                    (product.colors.length > 0 && !variant.color)
                  }
                  onClick={() => {
                    addToCart({
                      key,
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                      category: product.category,
                      size: variant.size || null,
                      color: variant.color || null,
                    });
                  }}
                  className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition ${
                    product.inStock
                      ? alreadyInCart
                        ? "bg-secondary-600 text-white"
                        : "bg-primary-700 text-white hover:bg-primary-800"
                      : "bg-gray-300 text-gray-600 cursor-not-allowed"
                  }`}
                >
                  {alreadyInCart ? (
                    <>
                      <Check className="h-5 w-5" /> Added to cart
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" /> Add to cart
                    </>
                  )}
                </button>
                <Link
                  href="/cart"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-900 hover:bg-gray-50"
                >
                  View cart
                </Link>
              </div>

              {!product.inStock ? (
                <p className="text-sm font-semibold text-amber-700">Out of stock</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lightboxOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Product image preview"
            onClick={() => setLightboxOpen(false)}
          >
            <div className="relative mx-auto h-full w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
              <div className="absolute right-0 top-0 z-[1] flex items-center gap-2">
                <a
                  href={product.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/20"
                >
                  Open in new tab
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="inline-flex items-center justify-center rounded-md bg-white/10 p-2 text-white backdrop-blur hover:bg-white/20"
                  aria-label="Close image preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative h-full w-full">
                <Image src={product.image} alt={product.name} fill unoptimized className="object-contain" />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

