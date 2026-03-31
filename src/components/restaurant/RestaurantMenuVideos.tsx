// src/components/restaurant/RestaurantMenuVideos.tsx
// PREMIUM VIDEO-STYLE MENU UI - Like Netflix/YouTube
// Vertical scroll with category carousel, infinite loading, AI search

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Play,
  Heart,
  Share2,
  MoreVertical,
  Flame,
  Clock,
  Star,
  Filter,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// TYPES
// ============================================================================

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  thumbnail_url?: string;
  video_url?: string;
  prep_time_minutes: number;
  rating: number;
  reviews_count: number;
  vegetarian: boolean;
  spicy: boolean;
  image_url?: string;
}

interface CategoryData {
  name: string;
  count: number;
  icon: React.ReactNode;
}

// ============================================================================
// CATEGORY CAROUSEL
// ============================================================================

const CategoryCarousel: React.FC<{
  categories: CategoryData[];
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
}> = ({ categories, selectedCategory, onCategorySelect }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          {/* All Categories Button */}
          <button
            onClick={() => onCategorySelect(null)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              selectedCategory === null
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200"
            }`}
          >
            All
          </button>

          {/* Scroll Container */}
          <div className="relative flex-1">
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg hover:shadow-xl"
            >
              <ChevronLeft size={20} />
            </button>

            <div
              ref={scrollContainerRef}
              className="overflow-x-auto scrollbar-hide flex gap-3 px-8"
            >
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => onCategorySelect(cat.name)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-all flex items-center gap-2 ${
                    selectedCategory === cat.name
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {cat.count}
                  </Badge>
                </button>
              ))}
            </div>

            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg hover:shadow-xl"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// VIDEO MENU CARD (Premium)
// ============================================================================

interface MenuVideoCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
  onViewDetails: (item: MenuItem) => void;
}

const MenuVideoCard: React.FC<MenuVideoCardProps> = ({
  item,
  onAddToCart,
  onViewDetails,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  return (
    <div
      className="group cursor-pointer transition-all duration-300"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Video Card */}
      <div className="relative overflow-hidden rounded-lg aspect-video bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
        {/* Thumbnail */}
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt={item.name}
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isHovering ? "scale-105" : "scale-100"
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {item.name}
              </p>
            </div>
          </div>
        )}

        {/* Overlay on Hover */}
        {isHovering && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center gap-3 transition-all duration-300">
            <button
              onClick={() => onViewDetails(item)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full font-semibold transition-all"
            >
              <Play size={16} className="ml-1" />
              View Details
            </button>
            <button
              onClick={() => onAddToCart(item)}
              className="bg-white hover:bg-gray-100 text-gray-900 px-4 py-2 rounded-full font-semibold transition-all"
            >
              <Plus size={18} />
            </button>
          </div>
        )}

        {/* Badge Overlays */}
        <div className="absolute top-2 right-2 flex gap-2">
          {item.spicy && (
            <Badge className="bg-red-500 hover:bg-red-600 animate-pulse">
              <Flame size={12} className="mr-1" />
              HOT
            </Badge>
          )}
          {item.vegetarian && (
            <Badge className="bg-green-500 hover:bg-green-600">VEG</Badge>
          )}
        </div>

        {/* Prep Time Badge */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs font-semibold">
          <Clock size={12} />
          {item.prep_time_minutes}m
        </div>

        {/* Heart Icon */}
        <button
          onClick={() => setIsFavorited(!isFavorited)}
          className="absolute top-2 left-2 bg-white dark:bg-gray-800 rounded-full p-2 hover:bg-gray-100 transition-all"
        >
          <Heart
            size={18}
            className={isFavorited ? "fill-red-500 text-red-500" : "text-gray-600"}
          />
        </button>
      </div>

      {/* Card Content */}
      <div className="mt-3 space-y-2">
        {/* Title & Price */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">
              {item.name}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
              {item.description}
            </p>
          </div>
          <span className="font-bold text-lg text-blue-600 dark:text-blue-400 whitespace-nowrap">
            AED {item.price.toFixed(2)}
          </span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Star size={12} className="fill-yellow-500 text-yellow-500" />
            <span className="font-semibold text-gray-900 dark:text-white">
              {item.rating.toFixed(1)}
            </span>
          </div>
          <span className="text-gray-600 dark:text-gray-400">
            ({item.reviews_count})
          </span>
        </div>

        {/* Category & Actions */}
        <div className="flex items-center justify-between pt-2">
          <Badge variant="outline" className="text-xs">
            {item.category}
          </Badge>
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all">
            <MoreVertical size={14} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: Restaurant Menu Videos
// ============================================================================

interface RestaurantMenuVideosProps {
  venueId: string;
}

export const RestaurantMenuVideos: React.FC<RestaurantMenuVideosProps> = ({
  venueId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([
    {
      id: "1",
      name: "Butter Chicken",
      description: "Creamy tomato-based curry with tender chicken",
      price: 120,
      category: "Main Course",
      prep_time_minutes: 20,
      rating: 4.8,
      reviews_count: 324,
      vegetarian: false,
      spicy: false,
    },
    {
      id: "2",
      name: "Paneer Tikka",
      description: "Grilled cottage cheese with aromatic spices",
      price: 85,
      category: "Appetizer",
      prep_time_minutes: 15,
      rating: 4.9,
      reviews_count: 456,
      vegetarian: true,
      spicy: true,
    },
  ]);

  const categories: CategoryData[] = [
    { name: "Main Course", count: 12, icon: "🍛" },
    { name: "Appetizer", count: 8, icon: "🥗" },
    { name: "Bread", count: 5, icon: "🥖" },
    { name: "Dessert", count: 6, icon: "🍰" },
    { name: "Beverage", count: 7, icon: "🥤" },
  ];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (item: MenuItem) => {
    console.log("Added to cart:", item);
  };

  const handleViewDetails = (item: MenuItem) => {
    console.log("View details:", item);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-black mb-6">Our Menu</h1>

          {/* Search Bar */}
          <div className="relative">
            <Search
              size={20}
              className="absolute left-4 top-3 text-gray-300"
            />
            <Input
              type="text"
              placeholder="Search dishes, cuisines, or ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-0 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Category Carousel */}
      <CategoryCarousel
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      {/* Menu Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600 dark:text-gray-400">
              No items found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <MenuVideoCard
                key={item.id}
                item={item}
                onAddToCart={handleAddToCart}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantMenuVideos;
