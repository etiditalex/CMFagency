"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Heart, Search, ShoppingCart, SlidersHorizontal, Star, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/lib/supabase";
import BlogPromoCarousel from "@/components/blogs/BlogPromoCarousel";
import type { BlogSidebarAdRow } from "@/lib/blog-server";
import { canOptimizeRemoteImage } from "@/lib/image-hosts";
import KesPrice from "@/app/merchandise/KesPrice";
import {
  SUPPLIER_DEPARTMENTS,
  discountPercent,
  formatKes,
  loadActiveMerchandise,
  type MerchItem,
} from "@/lib/dropship/catalog";

export type { MerchItem };

type SortKey = "featured" | "price-asc" | "price-desc" | "rating" | "discount";
type PriceBand = "all" | "under" | "mid" | "over";

function soldLabel(orders: number): string {
  if (orders >= 1000) {
    const value = orders / 1000;
    return `${value >= 10 ? Math.round(value) : value.toFixed(1)}k sold`;
  }
  return `${orders.toLocaleString("en-KE")} sold`;
}

function needsOptions(item: MerchItem): boolean {
  return item.sizes.length > 0 || item.colors.length > 0;
}

export default function MerchandiseClient({
  initialMerchandise,
  promoAds = [],
}: {
  initialMerchandise: MerchItem[];
  promoAds?: BlogSidebarAdRow[];
}) {
  const [merchandise, setMerchandise] = useState<MerchItem[]>(initialMerchandise);
  const [loadingCatalog, setLoadingCatalog] = useState(initialMerchandise.length === 0);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [priceBand, setPriceBand] = useState<PriceBand>("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<number[]>([]);
  const [supplierConfigured, setSupplierConfigured] = useState<boolean | null>(null);
  const [pulling, setPulling] = useState(false);
  const [supplierNote, setSupplierNote] = useState<string | null>(null);
  const [focusIds, setFocusIds] = useState<number[]>([]);
  const pullRequest = useRef(0);
  const { addToCart, cart } = useCart();
  const [showToast, setShowToast] = useState(false);
  const [addedItem, setAddedItem] = useState("");
  const [lightbox, setLightbox] = useState<null | { src: string; alt: string }>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cmf-shop-wishlist");
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) setSaved(parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id)));
    } catch {
      setSaved([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("cmf-shop-wishlist", JSON.stringify(saved));
    } catch {
      /* wishlist is optional */
    }
  }, [saved]);

  useEffect(() => {
    let cancelled = false;
    const status = async () => {
      try {
        const response = await fetch("/api/dropship/search", { cache: "no-store" });
        const body = (await response.json()) as { configured?: boolean };
        if (!cancelled) setSupplierConfigured(Boolean(body.configured));
      } catch {
        if (!cancelled) setSupplierConfigured(false);
      }
    };
    void status();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialMerchandise.length > 0) return;
    let cancelled = false;
    const load = async () => {
      setLoadingCatalog(true);
      setCatalogError(null);
      try {
        const mapped = await loadActiveMerchandise(supabase);
        if (!cancelled) setMerchandise(mapped);
      } catch (error: unknown) {
        if (!cancelled) {
          setCatalogError(error instanceof Error ? error.message : "Could not load products");
          setMerchandise([]);
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialMerchandise]);

  const pullSupplier = useCallback(async (query: string, category?: string) => {
    const q = query.trim();
    if (q.length < 2) return;
    const requestId = ++pullRequest.current;
    setPulling(true);
    setSupplierNote(null);
    try {
      const params = new URLSearchParams({ q });
      if (category) params.set("category", category);
      const response = await fetch(`/api/dropship/search?${params.toString()}`, { cache: "no-store" });
      const body = (await response.json()) as {
        configured?: boolean;
        products?: MerchItem[];
        warning?: string | null;
      };
      if (requestId !== pullRequest.current) return;
      setSupplierConfigured(Boolean(body.configured));
      const incoming = Array.isArray(body.products) ? body.products : [];
      if (incoming.length > 0) {
        setMerchandise((prev) => {
          const incomingIds = new Set(incoming.map((item) => item.id));
          return [...incoming, ...prev.filter((item) => !incomingIds.has(item.id))];
        });
        setFocusIds(category ? [] : incoming.map((item) => item.id));
        setPriceBand("all");
        setInStockOnly(false);
        setSaleOnly(false);
        setSavedOnly(false);
        setSupplierNote(`${incoming.length} supplier product${incoming.length === 1 ? "" : "s"} added to the shop.`);
      } else if (body.configured === false) {
        setFocusIds([]);
        setSupplierNote("Supplier catalog is not connected yet. You are browsing this shop’s own products.");
      } else if (body.warning && !category) {
        setFocusIds([]);
        setSupplierNote(body.warning);
      } else if (!response.ok && !category) {
        setSupplierNote("Supplier search is unavailable right now.");
      }
    } catch {
      if (requestId === pullRequest.current) setSupplierNote("Supplier search is unavailable right now.");
    } finally {
      if (requestId === pullRequest.current) setPulling(false);
    }
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setFocusIds([]);
      return;
    }
    setFocusIds([]);
    const timer = window.setTimeout(() => {
      setSelectedCategory("All");
      void pullSupplier(q);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [searchQuery, pullSupplier]);

  const supplierPrimed = useRef(false);
  useEffect(() => {
    if (supplierConfigured !== true || supplierPrimed.current) return;
    if (merchandise.some((item) => item.source === "aliexpress")) return;
    supplierPrimed.current = true;
    void pullSupplier("fashion clothes", "Fashion");
  }, [supplierConfigured, merchandise, pullSupplier]);

  const heroOffers = useMemo(() => {
    const deals = merchandise
      .filter((item) => item.originalPrice != null && item.originalPrice > item.price)
      .sort((a, b) => b.originalPrice! - b.price - (a.originalPrice! - a.price))
      .slice(0, 4)
      .map((item) => ({
        key: String(item.id),
        href: `/merchandise/${item.id}`,
        title: `${formatKes(item.originalPrice! - item.price)} OFF`,
        detail: `from ${formatKes(item.price)}`,
        chip: item.category || "Shop deal",
        image: item.image,
        name: item.name,
      }));
    if (deals.length > 0) return deals;
    return [
      { key: "pay", href: null as string | null, title: "M-Pesa or card", detail: "checkout on this site", chip: "Kenya checkout", image: "", name: "" },
      { key: "price", href: null as string | null, title: "Prices in KSh", detail: "supplier sale, shown here", chip: "Pay on this site", image: "", name: "" },
      { key: "ship", href: "/cart", title: "Ships to Kenya", detail: "usually 7–20 days", chip: "Delivery", image: "", name: "" },
    ];
  }, [merchandise]);

  const heroPercent = useMemo(() => {
    return merchandise.reduce((max, item) => Math.max(max, discountPercent(item.price, item.originalPrice) ?? 0), 0);
  }, [merchandise]);

  const heroVisual = heroOffers.find((offer) => offer.image) ?? merchandise.find((item) => item.image);

  const categories = useMemo(() => {
    const names = new Set<string>(SUPPLIER_DEPARTMENTS.map((item) => item.id));
    for (const item of merchandise) {
      if (item.category?.trim()) names.add(item.category.trim());
    }
    const supplierIds: string[] = SUPPLIER_DEPARTMENTS.map((item) => item.id);
    const extras = Array.from(names)
      .filter((name) => !supplierIds.includes(name))
      .sort((a, b) => a.localeCompare(b));
    return ["All", ...supplierIds, ...extras];
  }, [merchandise]);

  const filteredMerchandise = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const focusing = q.length >= 2 && focusIds.length > 0;
    const list = merchandise.filter((item) => {
      if (focusing && !focusIds.includes(item.id)) return false;
      const matchesCategory = focusing || selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch =
        focusing ||
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      const matchesStock = !inStockOnly || item.inStock;
      const matchesSale = !saleOnly || discountPercent(item.price, item.originalPrice) != null;
      const matchesSaved = !savedOnly || saved.includes(item.id);
      const matchesPrice =
        priceBand === "all" ||
        (priceBand === "under" && item.price < 2000) ||
        (priceBand === "mid" && item.price >= 2000 && item.price <= 5000) ||
        (priceBand === "over" && item.price > 5000);
      return matchesCategory && matchesSearch && matchesStock && matchesSale && matchesSaved && matchesPrice;
    });
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "rating") sorted.sort((a, b) => b.rating - a.rating || b.orders - a.orders);
    else if (sort === "discount") {
      sorted.sort(
        (a, b) =>
          (discountPercent(b.price, b.originalPrice) ?? 0) - (discountPercent(a.price, a.originalPrice) ?? 0)
      );
    }
    return sorted;
  }, [merchandise, selectedCategory, searchQuery, focusIds, inStockOnly, saleOnly, savedOnly, saved, priceBand, sort]);

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox]);

  const toggleSaved = (id: number) => {
    setSaved((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const addItem = (item: MerchItem) => {
    if (!item.inStock || needsOptions(item)) return;
    addToCart({
      key: `${item.id}::::`,
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      category: item.category,
      size: null,
      color: null,
    });
    setAddedItem(item.name);
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 2800);
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB]" style={{ paddingTop: "var(--site-nav-height)" }}>
      <header className="bg-black text-white">
        <div className="relative mx-auto flex min-h-[240px] max-w-[1200px] items-center px-4 py-4 md:px-8">
          <div className="relative z-10 min-w-0 flex-1 md:max-w-[680px]">
            <p className="text-xl font-bold leading-none text-white">Sale ends: Dec 4, 10:59 (GMT+3)</p>
            <h1 className="!mt-2 !bg-gradient-to-r !from-[#d9f8cf] !via-[#f4f1ff] !to-[#f3b6e0] !bg-clip-text !text-[34px] !font-black !leading-none !tracking-tight !text-transparent sm:!text-[42px]">
              {heroPercent > 0 ? `UP TO ${heroPercent}% OFF` : "UP TO 80% OFF"}
            </h1>
            <div className="mt-4 flex h-[110px] max-w-[560px] overflow-x-auto bg-[#FFDBDB] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {heroOffers.map((offer, index) => {
                const body = (
                  <span className={`flex h-full w-[148px] shrink-0 flex-col px-2.5 py-2 ${index > 0 ? "border-l border-dashed border-[#ff8aa0]" : ""}`}>
                    <span className="truncate text-[15px] font-bold leading-6 text-[#FF2751]">{offer.title}</span>
                    <span className="truncate text-xs font-normal leading-6 text-[#FF7D97]">{offer.detail}</span>
                    <span className="mt-auto inline-flex h-6 max-w-full items-center truncate bg-white px-1.5 text-[13px] font-bold leading-6 text-[#FF2751]">
                      {offer.chip}
                    </span>
                  </span>
                );
                return offer.href ? (
                  <Link key={offer.key} href={offer.href} className="flex shrink-0">
                    {body}
                  </Link>
                ) : (
                  <div key={offer.key} className="flex shrink-0">
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
          {heroVisual && "image" in heroVisual && heroVisual.image ? (
            <div className="absolute inset-y-0 right-0 hidden w-[387px] md:block">
              <Image
                src={heroVisual.image}
                alt={heroVisual.name || "Shop deal"}
                fill
                sizes="387px"
                referrerPolicy="no-referrer"
                unoptimized={!canOptimizeRemoteImage(heroVisual.image)}
                className="object-cover object-center"
              />
            </div>
          ) : null}
        </div>
        <div className="border-t border-white/10 bg-white">
          <form
            className="container-custom py-3"
            onSubmit={(event) => {
              event.preventDefault();
              setSelectedCategory("All");
              void pullSupplier(searchQuery);
            }}
          >
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B6B7A]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={
                  supplierConfigured
                    ? "Search the shop or pull products from the supplier catalog"
                    : "Search products"
                }
                className="w-full rounded-full border border-[#E4E7EF] bg-[#F6F7FB] py-3.5 pl-12 pr-28 text-sm text-[#151321] outline-none ring-[#1148C0] focus:bg-white focus:ring-2"
              />
              <button
                type="submit"
                disabled={pulling}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-[#191919] px-4 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-60"
              >
                {pulling ? "Searching…" : "Search"}
              </button>
            </label>
          </form>
          {supplierNote ? <p className="container-custom pb-3 text-sm text-[#6B6B7A]">{supplierNote}</p> : null}
        </div>
      </header>

      <section className="container-custom py-6 md:py-8">
        {catalogError ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Products could not be loaded.</p>
            <p className="mt-1">{catalogError}</p>
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-2 pb-1">
          {categories.map((category) => {
            const department = SUPPLIER_DEPARTMENTS.find((item) => item.id === category);
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFocusIds([]);
                  setSavedOnly(false);
                  if (department && supplierConfigured === false) {
                    setSupplierNote("Supplier catalog is not connected yet. You are browsing this shop’s own products.");
                    if (merchandise.some((item) => item.category === category)) setSelectedCategory(category);
                    return;
                  }
                  setSelectedCategory(category);
                  if (department) void pullSupplier(department.query, department.id);
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-[#151321] text-white" : "bg-white text-[#151321] ring-1 ring-[#E4E7EF] hover:bg-[#E7EEFB]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#E4E7EF] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <SlidersHorizontal className="h-4 w-4 text-[#6B6B7A]" />
            {(
              [
                ["all", "Any price"],
                ["under", "Under 2,000"],
                ["mid", "2,000 – 5,000"],
                ["over", "Over 5,000"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPriceBand(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  priceBand === id ? "bg-[#E7EEFB] text-[#0D3A99]" : "text-[#6B6B7A] hover:bg-[#F6F7FB]"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setInStockOnly((value) => !value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${inStockOnly ? "bg-[#E7EEFB] text-[#0D3A99]" : "text-[#6B6B7A]"}`}
            >
              In stock
            </button>
            <button
              type="button"
              onClick={() => setSaleOnly((value) => !value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${saleOnly ? "bg-[#E7EEFB] text-[#0D3A99]" : "text-[#6B6B7A]"}`}
            >
              On sale
            </button>
            <button
              type="button"
              onClick={() => setSavedOnly((value) => !value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${savedOnly ? "bg-[#E7EEFB] text-[#0D3A99]" : "text-[#6B6B7A]"}`}
            >
              Saved
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p className="text-xs font-semibold text-[#6B6B7A]">
              {loadingCatalog ? "Loading…" : `${filteredMerchandise.length} product${filteredMerchandise.length === 1 ? "" : "s"}`}
            </p>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Sort products"
              className="rounded-full border border-[#E4E7EF] bg-white px-3 py-2 text-xs font-semibold text-[#151321]"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating">Top rated</option>
              <option value="discount">Biggest discount</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
          {loadingCatalog &&
            [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={`sk-${i}`} className="overflow-hidden rounded-2xl border border-[#E4E7EF] bg-white">
                <div className="aspect-square animate-pulse bg-[#E4E7EF]" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-16 animate-pulse rounded bg-[#E4E7EF]" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-[#E4E7EF]" />
                  <div className="h-5 w-1/2 animate-pulse rounded bg-[#E4E7EF]" />
                </div>
              </div>
            ))}

          {!loadingCatalog &&
            filteredMerchandise.map((item) => {
              const off = discountPercent(item.price, item.originalPrice);
              const lineKey = `${item.id}::::`;
              const inCart = cart.some((cartItem) => cartItem.key === lineKey);
              const choose = needsOptions(item);
              return (
                <article key={item.id} className="group flex flex-col bg-white">
                  <div className="relative aspect-square overflow-hidden rounded-md bg-[#F6F7FB]">
                    <Link href={`/merchandise/${item.id}`} className="absolute inset-0" aria-label={item.name}>
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                          referrerPolicy="no-referrer"
                          unoptimized={!canOptimizeRemoteImage(item.image)}
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : null}
                    </Link>
                    {item.source === "aliexpress" ? (
                      <span className="absolute bottom-2 left-2 rounded bg-white/95 px-1.5 py-0.5 text-[11px] font-normal text-[#666666]">
                        Supplier
                      </span>
                    ) : null}
                    {!item.inStock ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <span className="rounded-full bg-[#151321] px-3 py-1 text-xs font-bold text-white">Out of stock</span>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => toggleSaved(item.id)}
                      className="absolute right-2 top-2 rounded-full bg-white p-2 shadow-sm"
                      aria-label={saved.includes(item.id) ? "Remove from saved" : "Save product"}
                    >
                      <Heart className={`h-4 w-4 ${saved.includes(item.id) ? "fill-[#D64545] text-[#D64545]" : "text-[#151321]"}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => item.image && setLightbox({ src: item.image, alt: item.name })}
                      className="absolute bottom-2 right-2 hidden rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-[#151321] shadow-sm group-hover:inline"
                    >
                      Zoom
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col px-1 pb-3 pt-2">
                    <h2 className="line-clamp-2 min-h-9 !text-sm !font-normal !leading-[18px] !tracking-normal !text-[#191919]">
                      <Link href={`/merchandise/${item.id}`} className="hover:text-[#191919]">
                        {item.name}
                      </Link>
                    </h2>
                    {item.rating > 0 || item.orders > 0 ? (
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-normal text-[#666666]">
                        {item.rating > 0 ? (
                          <>
                            <Star className="h-3 w-3 fill-[#FFB400] text-[#FFB400]" />
                            <span>{item.rating.toFixed(1)}</span>
                          </>
                        ) : null}
                        {item.orders > 0 ? <span className="text-[#191919]">{soldLabel(item.orders)}</span> : null}
                      </div>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                      <KesPrice amount={item.price} />
                      {item.originalPrice != null && item.originalPrice > item.price ? (
                        <span className="text-xs font-normal text-[#999999] line-through">
                          KSh{Math.round(item.originalPrice).toLocaleString("en-KE")}
                        </span>
                      ) : null}
                      {off ? <span className="text-sm font-normal text-[#F00633]">-{off}%</span> : null}
                    </div>
                    {choose ? (
                      <Link
                        href={`/merchandise/${item.id}`}
                        className="mt-2 inline-flex items-center justify-center rounded-full border border-[#191919] px-3 py-1.5 text-xs font-medium text-[#191919] hover:bg-[#191919] hover:text-white"
                      >
                        Choose options
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={!item.inStock}
                        onClick={() => addItem(item)}
                        className={`mt-2 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                          !item.inStock
                            ? "cursor-not-allowed bg-[#E4E7EF] text-[#6B6B7A]"
                            : inCart
                              ? "bg-[#2CBD71] text-white"
                              : "bg-[#1148C0] text-white hover:bg-[#0D3A99]"
                        }`}
                      >
                        {inCart ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                        {inCart ? "Added" : "Add to cart"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
        </div>

        {!loadingCatalog && filteredMerchandise.length === 0 && !catalogError ? (
          <div className="rounded-2xl border border-dashed border-[#E4E7EF] bg-white px-6 py-16 text-center">
            <p className="text-lg font-bold text-[#151321]">No products match.</p>
            <p className="mt-2 text-sm text-[#6B6B7A]">
              {merchandise.length === 0
                ? "The shop is empty. Search a product name to pull it from the supplier catalog."
                : "Try another department, clear the price filter, or search a different word."}
            </p>
          </div>
        ) : null}
      </section>

      <AnimatePresence>
        {showToast ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 left-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-[#E4E7EF] bg-white p-3 shadow-xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2CBD71]">
                <Check className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#151321]">Added to cart</p>
                <p className="truncate text-xs text-[#6B6B7A]">{addedItem}</p>
              </div>
              <Link href="/cart" className="text-xs font-bold text-[#1148C0]">
                View
              </Link>
              <button type="button" onClick={() => setShowToast(false)} aria-label="Dismiss">
                <X className="h-4 w-4 text-[#6B6B7A]" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Product image preview"
            onClick={() => setLightbox(null)}
          >
            <div className="relative mx-auto h-full w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="absolute right-0 top-0 z-[1] rounded-full bg-white/15 p-2 text-white"
                aria-label="Close image preview"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="relative h-full w-full">
                <Image
                  src={lightbox.src}
                  alt={lightbox.alt}
                  fill
                  unoptimized={!canOptimizeRemoteImage(lightbox.src)}
                  referrerPolicy="no-referrer"
                  className="object-contain"
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {promoAds.length > 0 ? (
        <section className="bg-white py-12">
          <div className="container-custom max-w-4xl">
            <BlogPromoCarousel ads={promoAds} imageMaxClass="max-h-[min(420px,55vh)]" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
