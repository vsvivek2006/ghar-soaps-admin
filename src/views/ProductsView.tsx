import React, { useState } from 'react';
import { formatPrice } from '../lib/utils';
import { Package, Search, Star, ExternalLink, Sparkles, Tag } from 'lucide-react';
import productsData from '../data/products.json';

interface ProductItem {
  id: number | string;
  title: string;
  handle: string;
  price: number;
  compare_at_price: number;
  rating?: number;
  reviews_count?: number;
  badge?: string;
  category?: string;
  images: string[];
  variants?: any[];
}

export const ProductsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const products: ProductItem[] = productsData as any[];

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category || 'General')))];

  const filtered = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || p.title.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Search & Categories Bar */}
      <div className="bg-white p-5 rounded-3xl border border-neutral-200/90 shadow-sm space-y-4">
        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const count = cat === 'All' ? products.length : products.filter((p) => p.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-sm'
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
            placeholder="Search catalog products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-neutral-300 text-xs font-medium text-neutral-900 focus:outline-none focus:border-black"
          />
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm overflow-hidden">
        <div className="p-5 sm:px-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-neutral-900 font-heading uppercase tracking-wide">
            Store Catalog ({filtered.length} products)
          </h3>
          <span className="text-xs text-neutral-400 font-medium">Synced with Ghar Soaps Storefront</span>
        </div>

        <div className="overflow-x-auto">
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
              {filtered.map((product) => {
                const img = product.images?.[0] || '';
                return (
                  <tr key={product.id} className="hover:bg-neutral-50/70 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        {img ? (
                          <img
                            src={img}
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
                        {product.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="font-extrabold text-neutral-900">{formatPrice(product.price)}</div>
                      {product.compare_at_price > product.price && (
                        <div className="text-[10px] text-neutral-400 line-through">
                          {formatPrice(product.compare_at_price)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-bold text-neutral-800">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{product.rating || '4.9'}</span>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          ({product.reviews_count || 120})
                        </span>
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

