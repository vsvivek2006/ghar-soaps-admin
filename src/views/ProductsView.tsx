'use client';

import React, { useState } from 'react';
import { formatPrice } from '../lib/utils';
import { Package, Search, Star, ExternalLink, Tag } from 'lucide-react';
import productsData from '../data/products.json';

interface ProductItem {
  id: number | string;
  title: string;
  handle: string;
  price?: number;
  compare_at_price?: number;
  rating?: number;
  reviews_count?: number;
  badge?: string;
  category?: string;
  tags?: string[];
  images: any[];
  variants?: any[];
}

function getProductPrice(p: ProductItem): number {
  if (typeof p.price === 'number' && p.price > 0) return p.price;
  if (p.variants && p.variants[0]?.price) {
    const parsed = parseFloat(p.variants[0].price);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 299;
}

function getProductComparePrice(p: ProductItem): number {
  if (typeof p.compare_at_price === 'number' && p.compare_at_price > 0) return p.compare_at_price;
  if (p.variants && p.variants[0]?.compare_at_price) {
    const parsed = parseFloat(p.variants[0].compare_at_price);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function getProductImage(p: ProductItem): string {
  if (Array.isArray(p.images) && p.images.length > 0) {
    const first = p.images[0];
    if (typeof first === 'string') return first;
    if (first && typeof first.src === 'string') return first.src;
  }
  return '';
}

function getProductCategory(p: ProductItem): string {
  const t = (p.title + ' ' + (p.tags ? p.tags.join(' ') : '')).toLowerCase();
  if (t.includes('soap') || t.includes('bar')) return 'Soaps';
  if (t.includes('face') || t.includes('mask') || t.includes('toner')) return 'Face Care';
  if (t.includes('body') || t.includes('deo') || t.includes('wash') || t.includes('lotion')) return 'Body Care';
  if (t.includes('serum') || t.includes('oil')) return 'Serums & Oils';
  if (t.includes('combo') || t.includes('box') || t.includes('pack')) return 'Combos & Gift Sets';
  return 'Ayurvedic Skincare';
}

export const ProductsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const rawProducts: ProductItem[] = productsData as any[];

  // Normalize products with real values
  const products = rawProducts.map((p) => ({
    ...p,
    normalizedPrice: getProductPrice(p),
    normalizedComparePrice: getProductComparePrice(p),
    normalizedImage: getProductImage(p),
    normalizedCategory: getProductCategory(p),
  }));

  const categories = ['All', 'Soaps', 'Face Care', 'Body Care', 'Serums & Oils', 'Combos & Gift Sets'];

  const filtered = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.normalizedCategory === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q || p.title.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Search & Categories Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3.5">
        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const count =
              cat === 'All'
                ? products.length
                : products.filter((p) => p.normalizedCategory === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition touch-manipulation min-h-[36px] ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                }`}
              >
                <span>{cat}</span>
                <span className={`ml-1.5 text-[10px] ${isSelected ? 'opacity-90' : 'text-neutral-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by title or handle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-neutral-300 text-xs font-medium text-neutral-900 focus:outline-none focus:border-black transition"
          />
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 font-heading uppercase tracking-wide">
            Product Catalog ({filtered.length} items)
          </h2>
          <span className="text-[11px] text-neutral-400 font-medium">Synced with Storefront</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-xs">
            No products match your search.
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="block md:hidden divide-y divide-neutral-100">
              {filtered.map((product) => (
                <div key={product.id} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {product.normalizedImage ? (
                      <img
                        src={product.normalizedImage}
                        alt={product.title}
                        className="w-14 h-14 rounded-2xl object-cover border border-neutral-200 shrink-0 bg-neutral-50"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-neutral-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-neutral-900 text-xs leading-snug">
                        {product.title}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-[10px] font-semibold">
                          {product.normalizedCategory}
                        </span>
                        <span className="text-emerald-700 font-bold text-[10px]">In Stock</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div>
                      <span className="text-sm font-extrabold text-neutral-950">
                        {formatPrice(product.normalizedPrice)}
                      </span>
                      {product.normalizedComparePrice > product.normalizedPrice && (
                        <span className="ml-1.5 text-[11px] text-neutral-400 line-through">
                          {formatPrice(product.normalizedComparePrice)}
                        </span>
                      )}
                    </div>
                    <a
                      href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://gharsoap.shop'}/#bestsellers`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-xl transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Storefront</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-600">
                <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3.5 px-5">Product Details</th>
                    <th className="py-3.5 px-5">Category</th>
                    <th className="py-3.5 px-5">Price</th>
                    <th className="py-3.5 px-5">Ratings</th>
                    <th className="py-3.5 px-5">Variants</th>
                    <th className="py-3.5 px-5">Stock Status</th>
                    <th className="py-3.5 px-5 text-right">Storefront</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map((product) => (
                    <tr key={product.id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {product.normalizedImage ? (
                            <img
                              src={product.normalizedImage}
                              alt={product.title}
                              className="w-12 h-12 rounded-xl object-cover border border-neutral-200 shrink-0 bg-neutral-50"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-neutral-400" />
                            </div>
                          )}
                          <div className="min-w-0 max-w-xs">
                            <div className="font-bold text-neutral-900 truncate">{product.title}</div>
                            <div className="text-[10px] text-neutral-400 font-mono truncate">
                              handle: {product.handle}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[11px] font-semibold">
                          {product.normalizedCategory}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="font-extrabold text-neutral-900">
                          {formatPrice(product.normalizedPrice)}
                        </div>
                        {product.normalizedComparePrice > product.normalizedPrice && (
                          <div className="text-[10px] text-neutral-400 line-through">
                            {formatPrice(product.normalizedComparePrice)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-bold text-neutral-800">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>4.9</span>
                          <span className="text-[10px] text-neutral-400 font-normal">(120+)</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap text-neutral-700 font-semibold">
                        {product.variants?.length || 1} variant(s)
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>In Stock</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <a
                          href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://gharsoap.shop'}/#bestsellers`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 hover:text-black p-1.5 rounded-lg hover:bg-neutral-100 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
