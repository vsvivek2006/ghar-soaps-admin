'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { formatPrice } from '../lib/utils';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import {
  Package,
  Search,
  Star,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import productsData from '../data/products.json';

const FALLBACK_PRODUCT_IMG =
  'https://mlglwjaxvmcswesysipt.supabase.co/storage/v1/object/public/store-assets/catalog/acd01ae19e-1-2_486ce64b-b1be-401c-a596-a0d19973b3f0.webp';

export interface AdminProduct {
  id: number | string;
  title: string;
  handle: string;
  price: number;
  compare_at_price?: number;
  rating?: number;
  reviews_count?: number;
  badge?: string;
  category: string;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  stock_qty?: number;
  images: string[];
}

function getProductPrice(p: any): number {
  if (typeof p.price === 'number' && p.price > 0) return p.price;
  if (p.variants && p.variants[0]?.price) {
    const parsed = parseFloat(p.variants[0].price);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 299;
}

function getProductComparePrice(p: any): number {
  if (typeof p.compare_at_price === 'number' && p.compare_at_price > 0) return p.compare_at_price;
  if (p.variants && p.variants[0]?.compare_at_price) {
    const parsed = parseFloat(p.variants[0].compare_at_price);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function getProductImage(p: any): string {
  if (Array.isArray(p.images) && p.images.length > 0) {
    const first = p.images[0];
    if (typeof first === 'string') return first;
    if (first && typeof first.src === 'string') return first.src;
  }
  return FALLBACK_PRODUCT_IMG;
}

function getProductCategory(p: any): string {
  if (p.category) return p.category;
  const t = (p.title + ' ' + (p.tags ? p.tags.join(' ') : '')).toLowerCase();
  if (t.includes('soap') || t.includes('bar')) return 'Soaps';
  if (t.includes('face') || t.includes('mask') || t.includes('toner')) return 'Face Care';
  if (t.includes('body') || t.includes('deo') || t.includes('wash') || t.includes('lotion')) return 'Body Care';
  if (t.includes('serum') || t.includes('oil')) return 'Serums & Oils';
  if (t.includes('combo') || t.includes('box') || t.includes('pack')) return 'Combos & Gift Sets';
  return 'Ayurvedic Skincare';
}

interface ProductsViewProps {
  token?: string | null;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ token }) => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 200);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Modal states
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states for Edit / Add
  const [formTitle, setFormTitle] = useState('');
  const [formPrice, setFormPrice] = useState<number>(299);
  const [formComparePrice, setFormComparePrice] = useState<number>(399);
  const [formCategory, setFormCategory] = useState('Soaps');
  const [formStock, setFormStock] = useState<'in_stock' | 'low_stock' | 'out_of_stock'>('in_stock');
  const [formStockQty, setFormStockQty] = useState<number>(100);
  const [formBadge, setFormBadge] = useState('');
  const [formRating, setFormRating] = useState<number>(4.9);
  const [formReviewsCount, setFormReviewsCount] = useState<number>(120);
  const [formImage, setFormImage] = useState('');

  const loadFallbackCatalog = () => {
    const rawProducts: any[] = productsData as any[];
    const normalized: AdminProduct[] = rawProducts.map((p) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      price: getProductPrice(p),
      compare_at_price: getProductComparePrice(p),
      rating: p.rating || 4.9,
      reviews_count: p.reviews_count || 120,
      badge: p.badge || (p.title.includes('Magic') ? 'Bestseller' : ''),
      category: getProductCategory(p),
      stock_status: 'in_stock',
      stock_qty: 100,
      images: [getProductImage(p)],
    }));
    setProducts(normalized);
  };

  const fetchProductsFromDb = async () => {
    if (!token) {
      loadFallbackCatalog();
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data) && data.data.length > 0) {
        const mapped: AdminProduct[] = data.data.map((p: any) => ({
          id: p.id,
          title: p.title,
          handle: p.handle,
          price: Number(p.price),
          compare_at_price: Number(p.compare_at_price || 0),
          rating: Number(p.rating || 4.8),
          reviews_count: Number(p.reviews_count || 0),
          badge: p.badge || '',
          category: p.category || getProductCategory(p),
          stock_status: p.stock_status || 'in_stock',
          stock_qty: typeof p.stock_qty === 'number' ? p.stock_qty : 100,
          images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [FALLBACK_PRODUCT_IMG],
        }));
        setProducts(mapped);
      } else {
        loadFallbackCatalog();
      }
    } catch {
      loadFallbackCatalog();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleOpenEdit = (product: AdminProduct) => {
    setEditingProduct(product);
    setFormTitle(product.title);
    setFormPrice(product.price);
    setFormComparePrice(product.compare_at_price || 0);
    setFormCategory(product.category);
    setFormStock(product.stock_status);
    setFormStockQty(typeof product.stock_qty === 'number' ? product.stock_qty : 100);
    setFormBadge(product.badge || '');
    setFormRating(product.rating || 4.9);
    setFormReviewsCount(product.reviews_count || 120);
    setFormImage(product.images[0] || '');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatusMessage('Admin authentication required to save changes.');
      return;
    }
    setIsSaving(true);
    setStatusMessage(null);
    try {
      if (editingProduct) {
        const res = await fetch('/api/products', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: editingProduct.id,
            title: formTitle.trim(),
            price: Number(formPrice),
            compare_at_price: Number(formComparePrice),
            category: formCategory,
            stock_status: formStock,
            stock_qty: Number(formStockQty),
            badge: formBadge.trim(),
            rating: Number(formRating),
            reviews_count: Number(formReviewsCount),
            image: formImage.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Update failed');
        await fetchProductsFromDb();
        setEditingProduct(null);
        setStatusMessage('Product & inventory updated in database.');
      } else if (isAddingNew) {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: formTitle.trim(),
            price: Number(formPrice),
            compare_at_price: Number(formComparePrice),
            category: formCategory,
            stock_status: formStock,
            stock_qty: Number(formStockQty),
            badge: formBadge.trim(),
            rating: Number(formRating),
            reviews_count: Number(formReviewsCount),
            image: formImage.trim() || FALLBACK_PRODUCT_IMG,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Create failed');
        await fetchProductsFromDb();
        setIsAddingNew(false);
        setStatusMessage('New product created in database.');
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Unable to save product changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: number | string) => {
    if (!token || !confirm('Are you sure you want to delete this product from the database?')) return;
    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setStatusMessage('Product deleted.');
      }
    } catch {
      setStatusMessage('Failed to delete product.');
    }
  };

  // 1-Click stock status toggler synced to Supabase
  const handleToggleStock = async (id: number | string) => {
    const target = products.find((p) => p.id === id);
    if (!target || !token) return;
    const nextStock: 'in_stock' | 'out_of_stock' =
      target.stock_status === 'in_stock' ? 'out_of_stock' : 'in_stock';
    const nextQty = nextStock === 'in_stock' ? (target.stock_qty && target.stock_qty > 0 ? target.stock_qty : 100) : 0;

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock_status: nextStock, stock_qty: nextQty } : p))
    );

    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, stock_status: nextStock, stock_qty: nextQty }),
      });
      if (!res.ok) {
        await fetchProductsFromDb();
      }
    } catch {
      await fetchProductsFromDb();
    }
  };

  const handleRefreshCatalog = () => {
    fetchProductsFromDb();
  };

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesQuery = !q || p.title.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [products, selectedCategory, debouncedSearch]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="text-emerald-700 hover:text-black">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/90 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-neutral-900 font-heading">
            Products Catalog & Inventory
          </h2>
          <p className="text-xs text-neutral-500">
            {products.length} synced DB products • Live Price & Stock Controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshCatalog}
            disabled={isLoading}
            title="Sync catalog from database"
            className="px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync DB</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAddingNew(true);
              setFormTitle('');
              setFormPrice(299);
              setFormComparePrice(399);
              setFormCategory('Soaps');
              setFormStock('in_stock');
              setFormStockQty(100);
              setFormBadge('New Launch');
              setFormRating(5.0);
              setFormReviewsCount(10);
              setFormImage('');
            }}
            className="px-4 py-2 rounded-xl bg-[#108474] hover:bg-[#0c6b5e] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3.5">
        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const count = cat === 'All' ? products.length : products.filter((p) => p.category === cat).length;
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
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by title, handle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black font-medium"
          />
        </div>
      </div>

      {/* Products Table Container */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 sm:p-16 text-center text-neutral-400 text-xs">
            No products match your selected category or search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="py-3.5 px-5">Product Details</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Price</th>
                  <th className="py-3.5 px-5">Stock Status</th>
                  <th className="py-3.5 px-5">Badge</th>
                  <th className="py-3.5 px-5">Ratings</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-neutral-50/70 transition">
                    {/* Details */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-12 h-12 rounded-xl object-cover border border-neutral-200 shrink-0 bg-neutral-50"
                        />
                        <div className="min-w-0 max-w-xs">
                          <div className="font-bold text-neutral-900 truncate">{product.title}</div>
                          <div className="text-[10px] text-neutral-400 font-mono truncate">
                            handle: {product.handle}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[11px] font-semibold">
                        {product.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="font-extrabold text-neutral-900">{formatPrice(product.price)}</div>
                      {product.compare_at_price && product.compare_at_price > product.price && (
                        <div className="text-[10px] text-neutral-400 line-through">
                          {formatPrice(product.compare_at_price)}
                        </div>
                      )}
                    </td>

                    {/* Stock Status with 1-Click Toggle */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStock(product.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                          product.stock_status === 'in_stock'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : product.stock_status === 'low_stock'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                        title="Click to toggle In Stock / Out of Stock"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            product.stock_status === 'in_stock'
                              ? 'bg-emerald-500'
                              : product.stock_status === 'low_stock'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span>
                          {product.stock_status === 'in_stock'
                            ? `In Stock (${product.stock_qty ?? 100})`
                            : product.stock_status === 'low_stock'
                            ? `Low Stock (${product.stock_qty ?? 0})`
                            : 'Out of Stock (0)'}
                        </span>
                      </button>
                    </td>

                    {/* Badge */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      {product.badge ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                          {product.badge}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Ratings */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-bold text-neutral-800">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{product.rating}</span>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          ({product.reviews_count || 120})
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`https://gharsoap.shop/products/${product.handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl text-neutral-500 hover:text-black hover:bg-neutral-100 transition"
                          title="View on Storefront"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="p-2 rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Add Product Modal */}
      {(editingProduct || isAddingNew) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-[#fef7ea]">
              <div>
                <h3 className="font-extrabold text-base text-neutral-900 font-heading">
                  {editingProduct ? 'Edit Product Details' : 'Add New Product'}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Update price, inventory, badge, and storefront display
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddingNew(false);
                }}
                className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Product Title
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Magic Soap (Pack of 3)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black font-semibold"
                />
              </div>

              {/* Price & Compare Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Compare At Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formComparePrice}
                    onChange={(e) => setFormComparePrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Category, Stock Status & Stock Qty */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black bg-white"
                  >
                    {Array.from(
                      new Set([
                        formCategory,
                        'Soaps',
                        'Face Care',
                        'Body Care',
                        'Serums',
                        'Serums & Oils',
                        'Combos & Kits',
                        'Combos & Gift Sets',
                        'Body Tools',
                        'Skincare',
                      ].filter(Boolean))
                    ).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Stock Status
                  </label>
                  <select
                    value={formStock}
                    onChange={(e) => {
                      const val = e.target.value as 'in_stock' | 'low_stock' | 'out_of_stock';
                      setFormStock(val);
                      if (val === 'out_of_stock') setFormStockQty(0);
                      else if (val === 'in_stock' && formStockQty <= 0) setFormStockQty(100);
                      else if (val === 'low_stock' && (formStockQty <= 0 || formStockQty > 10)) setFormStockQty(5);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black bg-white"
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStockQty}
                    onChange={(e) => {
                      const q = Math.max(0, Number(e.target.value) || 0);
                      setFormStockQty(q);
                      setFormStock(q === 0 ? 'out_of_stock' : q <= 10 ? 'low_stock' : 'in_stock');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black font-bold"
                  />
                </div>
              </div>

              {/* Badge & Rating */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Promotional Badge
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="e.g. Bestseller, 15% OFF"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Rating (1.0 - 5.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formRating}
                    onChange={(e) => setFormRating(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Product Image URL
                </label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsAddingNew(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#108474] hover:bg-[#0c6b5e] disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
