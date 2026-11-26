"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ChevronRight, ShieldCheck, ShoppingCart, Star, Truck, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { canOptimizeRemoteImage } from "@/lib/image-hosts";
import { discountPercent, type MerchItem } from "@/lib/dropship/catalog";
import KesPrice from "@/app/merchandise/KesPrice";

export type ProductDetail = MerchItem;

export default function MerchandiseProductClient({ product }: { product: ProductDetail }) {
  const { addToCart, cart } = useCart();
  const photos = [product.image, ...product.gallery].filter(Boolean);
  const [photo, setPhoto] = useState(photos[0] ?? "");
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<{ size: string; color: string }>({
    size: product.sizes[0] ?? "",
    color: product.colors[0] ?? "",
  });
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const key = useMemo(() => `${product.id}::${variant.size ?? ""}::${variant.color ?? ""}`, [product.id, variant]);
  const alreadyInCart = cart.some((item) => item.key === key);
  const off = discountPercent(product.price, product.originalPrice);
  const optionsReady = (product.sizes.length === 0 || Boolean(variant.size)) && (product.colors.length === 0 || Boolean(variant.color));

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen]);

  return (
    <div className="min-h-screen bg-[#F6F7FB]" style={{ paddingTop: "var(--site-nav-height)" }}>
      <div className="container-custom py-6 md:py-10">
        <nav className="mb-5 flex flex-wrap items-center gap-1 text-xs font-semibold text-[#6B6B7A]">
          <Link href="/merchandise" className="hover:text-[#1148C0]">
            Shop
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{product.category || "Product"}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="line-clamp-1 text-[#151321]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="overflow-hidden rounded-3xl border border-[#E4E7EF] bg-white">
            <button
              type="button"
              onClick={() => photo && setLightboxOpen(true)}
              className="relative block aspect-square w-full cursor-zoom-in bg-[#F6F7FB]"
              aria-label="Open product image"
            >
              {photo ? (
                <Image
                  src={photo}
                  alt={product.name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  referrerPolicy="no-referrer"
                  unoptimized={!canOptimizeRemoteImage(photo)}
                  className="object-contain"
                />
              ) : null}
            </button>
            {photos.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto border-t border-[#E4E7EF] p-3">
                {photos.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setPhoto(src)}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${
                      src === photo ? "border-[#1148C0]" : "border-[#E4E7EF]"
                    }`}
                    aria-label="Show product photo"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      referrerPolicy="no-referrer"
                      unoptimized={!canOptimizeRemoteImage(src)}
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-[#E4E7EF] bg-white p-5 md:p-7">
            <div className="flex flex-wrap items-center gap-2 text-sm font-normal text-[#666666]">
              <p>{product.category || "Shop"}</p>
              {product.source === "aliexpress" ? <span>Supplier</span> : null}
            </div>
            <h1 className="mt-2 !text-xl !font-normal !leading-snug !tracking-normal !text-[#191919] md:!text-2xl">{product.name}</h1>
            {product.rating > 0 || product.orders > 0 ? (
              <div className="mt-3 flex items-center gap-2 text-sm font-normal text-[#666666]">
                {product.rating > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-[#FFB400] text-[#FFB400]" />
                    {product.rating.toFixed(1)}
                  </span>
                ) : null}
                {product.orders > 0 ? <span className="text-[#191919]">{product.orders.toLocaleString("en-KE")} sold</span> : null}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-baseline gap-2">
              <KesPrice amount={product.price} currencyClass="text-base" amountClass="text-[28px]" />
              {product.originalPrice != null && product.originalPrice > product.price ? (
                <p className="text-sm font-normal text-[#999999] line-through">
                  KSh{Math.round(product.originalPrice).toLocaleString("en-KE")}
                </p>
              ) : null}
              {off ? <span className="text-sm font-normal text-[#F00633]">-{off}%</span> : null}
            </div>
            {product.description ? <p className="mt-4 text-sm leading-relaxed text-[#6B6B7A]">{product.description}</p> : null}

            <div className="mt-6 space-y-4">
              {product.sizes.length > 0 ? (
                <div>
                  <p className="text-sm font-normal text-[#191919]">Size</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setVariant((current) => ({ ...current, size }))}
                        className={`rounded-full px-3 py-1.5 text-sm font-normal ${
                          variant.size === size ? "bg-[#191919] text-white" : "bg-[#F6F7FB] text-[#191919] ring-1 ring-[#E4E7EF]"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {product.colors.length > 0 ? (
                <div>
                  <p className="text-sm font-normal text-[#191919]">Color</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setVariant((current) => ({ ...current, color }))}
                        className={`rounded-full px-3 py-1.5 text-sm font-normal ${
                          variant.color === color ? "bg-[#191919] text-white" : "bg-[#F6F7FB] text-[#191919] ring-1 ring-[#E4E7EF]"
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <p className="text-sm font-normal text-[#191919]">Quantity</p>
                <div className="inline-flex items-center rounded-full border border-[#E4E7EF]">
                  <button type="button" className="px-3 py-1.5 text-lg" onClick={() => setQty((value) => Math.max(1, value - 1))} aria-label="Decrease quantity">
                    −
                  </button>
                  <span className="min-w-8 text-center text-sm font-normal">{qty}</span>
                  <button type="button" className="px-3 py-1.5 text-lg" onClick={() => setQty((value) => Math.min(10, value + 1))} aria-label="Increase quantity">
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <button
                  type="button"
                  disabled={!product.inStock || !optionsReady}
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
                      quantity: qty,
                    });
                  }}
                  className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white ${
                    product.inStock && optionsReady
                      ? alreadyInCart
                        ? "bg-[#2CBD71]"
                        : "bg-[#1148C0] hover:bg-[#0D3A99]"
                      : "cursor-not-allowed bg-[#E4E7EF] text-[#6B6B7A]"
                  }`}
                >
                  {alreadyInCart ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                  {alreadyInCart ? "Added to cart" : "Add to cart"}
                </button>
                <Link
                  href="/cart"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#191919] px-5 text-sm font-medium text-[#191919] hover:bg-[#191919] hover:text-white"
                >
                  View cart
                </Link>
              </div>
              {!product.inStock ? <p className="text-sm font-semibold text-amber-700">Out of stock</p> : null}
            </div>

            <ul className="mt-6 space-y-3 border-t border-[#E4E7EF] pt-5 text-sm text-[#151321]">
              <li className="flex gap-2">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#1148C0]" />
                <span>
                  {product.source === "aliexpress"
                    ? "We place this order with the supplier after you pay. Delivery to Kenya is usually 7–20 days."
                    : "This item ships from our own stock to addresses in Kenya."}
                </span>
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1148C0]" />
                <span>Pay with M-Pesa or card. The charge is in Kenya shillings on this site.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lightboxOpen && photo ? (
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
            <div className="relative mx-auto h-full w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="absolute right-0 top-0 z-[1] rounded-full bg-white/15 p-2 text-white"
                aria-label="Close image preview"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="relative h-full w-full">
                <Image
                  src={photo}
                  alt={product.name}
                  fill
                  referrerPolicy="no-referrer"
                  unoptimized={!canOptimizeRemoteImage(photo)}
                  className="object-contain"
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
