"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingCart, Heart, Star, Filter, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";

const merchandise: Array<{
  id: number;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  description: string;
  inStock: boolean;
}> = [
  // T-Shirts
  {
    id: 1,
    name: "Changer Fusions Classic T-Shirt",
    price: 2500,
    originalPrice: null,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765963219/t-shirts_hm50aj.jpg",
    category: "T-Shirts",
    rating: 4.8,
    reviews: 124,
    description: "Premium quality cotton t-shirt with Changer Fusions branding. Comfortable fit for everyday wear.",
    inStock: true,
  },
  // Water Bottles
  {
    id: 2,
    name: "Changer Fusions Water Bottle",
    price: 1500,
    originalPrice: null,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765963219/water_bottle_it6dhy.jpg",
    category: "Water Bottles",
    rating: 4.6,
    reviews: 203,
    description: "Eco-friendly stainless steel water bottle with Changer Fusions logo. Keeps drinks cold for 24 hours or hot for 12 hours.",
    inStock: true,
  },
  // Hoodies
  {
    id: 3,
    name: "Changer Fusions Classic Hoodie",
    price: 4500,
    originalPrice: null,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765963219/hoodie_hwkw2l.jpg",
    category: "Hoodies",
    rating: 4.9,
    reviews: 89,
    description: "Comfortable hoodie perfect for casual wear. Features Changer Fusions branding and soft fleece interior.",
    inStock: true,
  },
  // Key Holders
  {
    id: 4,
    name: "Changer Fusions Key Holder",
    price: 800,
    originalPrice: null,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765963219/Key_holder_nkhf6x.jpg",
    category: "Key Holders",
    rating: 4.4,
    reviews: 145,
    description: "Premium key holder with Changer Fusions logo. Durable and stylish design.",
    inStock: true,
  },
];

const categories = ["All", "T-Shirts", "Water Bottles", "Hoodies", "Key Holders"];

export default function MerchandisePage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const { addToCart, cart } = useCart();
  const [showToast, setShowToast] = useState(false);
  const [addedItem, setAddedItem] = useState<string>("");

  const filteredMerchandise = merchandise.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards8_ifgxzv.jpg"
            alt="Changer Fusions Merchandise"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/80 via-secondary-800/70 to-primary-900/80"></div>
        </div>
        
        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Changer Fusions Merchandise
            </h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Show your support with our premium branded merchandise. Quality products designed
              for professionals who value marketing excellence and business growth.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="section-padding">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8 flex flex-col md:flex-row gap-4"
          >
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search merchandise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    selectedCategory === category
                      ? "bg-primary-600 text-white shadow-lg"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredMerchandise.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group"
              >
                <div className="relative h-64 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {item.originalPrice && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Sale
                    </div>
                  )}
                  {!item.inStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  <button className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
                    <Heart className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
                <div className="p-5">
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-primary-600 uppercase">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900 group-hover:text-primary-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                  <div className="flex items-center space-x-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(item.rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-600 ml-2">
                      {item.rating} ({item.reviews})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-gray-900">
                          KSh {item.price.toLocaleString()}
                        </span>
                        {item.originalPrice !== null && (
                          <span className="text-sm text-gray-500 line-through">
                            KSh {item.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={!item.inStock}
                    onClick={() => {
                      if (item.inStock) {
                        addToCart({
                          id: item.id,
                          name: item.name,
                          price: item.price,
                          image: item.image,
                          category: item.category,
                        });
                        setAddedItem(item.name);
                        setShowToast(true);
                        setTimeout(() => {
                          setShowToast(false);
                        }, 3000);
                      }
                    }}
                    className={`w-full mt-4 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                      item.inStock
                        ? cart.some((cartItem) => cartItem.id === item.id)
                          ? "bg-secondary-600 text-white shadow-lg"
                          : "bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl active:scale-95"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {cart.some((cartItem) => cartItem.id === item.id) ? (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Added to Cart</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        <span>Add to Cart</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredMerchandise.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-gray-600 text-lg">No products found matching your criteria.</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-8 left-1/2 z-50 transform -translate-x-1/2"
          >
            <div className="bg-white rounded-lg shadow-2xl p-4 flex items-center space-x-3 border-2 border-primary-600 min-w-[300px]">
              <div className="w-10 h-10 bg-secondary-600 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Item Added!</p>
                <p className="text-sm text-gray-600 truncate">{addedItem}</p>
              </div>
              <button
                onClick={() => setShowToast(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Custom Merchandise Available
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Need custom branded merchandise for your team or event? Contact us for bulk orders
              and custom designs.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-white text-primary-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Contact Us for Custom Orders
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
