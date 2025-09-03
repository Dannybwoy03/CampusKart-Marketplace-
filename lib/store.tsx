"use client"

import type React from "react"

import { createContext, useContext, useReducer, type ReactNode } from "react"

// Types
interface Product {
  id: string
  title: string
  price: number
  image: string
  category: string
  seller: string
  description: string
  condition: string
  postedDate: string
  specifications?: string[]
  status: "active" | "sold" | "pending"
  views: number
  requests: number
  reports: number
}

interface User {
  id: string
  name: string
  email: string
  university: string
  isAdmin: boolean
}

interface PurchaseRequest {
  id: string
  productId: string
  productTitle: string
  price: number
  seller: string
  status: "pending" | "approved" | "rejected"
  requestDate: string
}

// Add cart to AppState
interface AppState {
  user: User | null
  products: Product[]
  myListings: Product[]
  myRequests: PurchaseRequest[]
  searchTerm: string
  selectedCategory: string
  selectedStatus: string
  isLoading: boolean
  cart: Product[];
}

// Actions
type AppAction =
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_PRODUCTS"; payload: Product[] }
  | { type: "ADD_PRODUCT"; payload: Product }
  | { type: "UPDATE_PRODUCT"; payload: Product }
  | { type: "DELETE_PRODUCT"; payload: string }
  | { type: "SET_SEARCH_TERM"; payload: string }
  | { type: "SET_CATEGORY"; payload: string }
  | { type: "SET_STATUS"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "ADD_REQUEST"; payload: PurchaseRequest }
  | { type: "UPDATE_REQUEST"; payload: PurchaseRequest }
  | { type: "ADD_TO_CART"; payload: Product }
  | { type: "REMOVE_FROM_CART"; payload: string }

// Initial state
const initialCart = typeof window !== 'undefined' && localStorage.getItem('cart')
  ? JSON.parse(localStorage.getItem('cart')!)
  : [];
const initialState: AppState = {
  user: {
    id: "1",
    name: "John Doe",
    email: "john.doe@university.edu",
    university: "Stanford University",
    isAdmin: true,
  },
  products: [
    {
      id: "1",
      title: 'MacBook Pro 13" 2021 - Excellent Condition',
      price: 1200,
      image: "/placeholder.svg?height=300&width=400",
      category: "Electronics",
      seller: "John Doe",
      description:
        "Selling my MacBook Pro in excellent condition. Used for 1 year, no scratches or dents. Comes with original charger and box.",
      condition: "Excellent",
      postedDate: "2024-01-15",
      specifications: ["Apple M1 Chip", "8GB RAM", "256GB SSD", '13.3" Retina Display', "Touch Bar"],
      status: "active",
      views: 45,
      requests: 3,
      reports: 0,
    },
    {
      id: "2",
      title: "Calculus Textbook - 8th Edition",
      price: 45,
      image: "/placeholder.svg?height=300&width=400",
      category: "Books",
      seller: "Sarah Smith",
      description: "Calculus textbook in good condition. Some highlighting but all pages intact.",
      condition: "Good",
      postedDate: "2024-01-14",
      status: "active",
      views: 23,
      requests: 1,
      reports: 1,
    },
    {
      id: "3",
      title: "Dorm Room Mini Fridge",
      price: 80,
      image: "/placeholder.svg?height=300&width=400",
      category: "Furniture",
      seller: "Mike Johnson",
      description: "Perfect mini fridge for dorm room. Works perfectly, very quiet.",
      condition: "Good",
      postedDate: "2024-01-13",
      status: "active",
      views: 34,
      requests: 2,
      reports: 0,
    },
    {
      id: "4",
      title: "Scientific Calculator TI-84",
      price: 60,
      image: "/placeholder.svg?height=300&width=400",
      category: "Electronics",
      seller: "Emily Davis",
      description: "TI-84 calculator in excellent condition. Perfect for math and science courses.",
      condition: "Excellent",
      postedDate: "2024-01-12",
      status: "active",
      views: 28,
      requests: 1,
      reports: 0,
    },
    {
      id: "5",
      title: "Study Desk with Drawers",
      price: 120,
      image: "/placeholder.svg?height=300&width=400",
      category: "Furniture",
      seller: "Alex Wilson",
      description: "Wooden study desk with 3 drawers. Great for dorm or apartment.",
      condition: "Good",
      postedDate: "2024-01-10",
      status: "sold",
      views: 56,
      requests: 4,
      reports: 0,
    },
    {
      id: "6",
      title: "Chemistry Lab Goggles",
      price: 15,
      image: "/placeholder.svg?height=300&width=400",
      category: "Supplies",
      seller: "Lisa Brown",
      description: "Safety goggles for chemistry lab. Never used, still in packaging.",
      condition: "New",
      postedDate: "2024-01-11",
      status: "active",
      views: 12,
      requests: 0,
      reports: 0,
    },
  ],
  myListings: [],
  myRequests: [
    {
      id: "1",
      productId: "2",
      productTitle: "Calculus Textbook - 8th Edition",
      price: 45,
      seller: "Sarah Smith",
      status: "pending",
      requestDate: "2024-01-16",
    },
    {
      id: "2",
      productId: "4",
      productTitle: "Scientific Calculator TI-84",
      price: 60,
      seller: "Emily Davis",
      status: "approved",
      requestDate: "2024-01-14",
    },
  ],
  searchTerm: "",
  selectedCategory: "all",
  selectedStatus: "all",
  isLoading: false,
  cart: initialCart,
}

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload }
    case "SET_PRODUCTS":
      return { ...state, products: action.payload }
    case "ADD_PRODUCT":
      return {
        ...state,
        products: [...state.products, action.payload],
        myListings:
          state.user?.name === action.payload.seller ? [...state.myListings, action.payload] : state.myListings,
      }
    case "UPDATE_PRODUCT":
      return {
        ...state,
        products: state.products.map((p) => (p.id === action.payload.id ? action.payload : p)),
        myListings: state.myListings.map((p) => (p.id === action.payload.id ? action.payload : p)),
      }
    case "DELETE_PRODUCT":
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.payload),
        myListings: state.myListings.filter((p) => p.id !== action.payload),
      }
    case "SET_SEARCH_TERM":
      return { ...state, searchTerm: action.payload }
    case "SET_CATEGORY":
      return { ...state, selectedCategory: action.payload }
    case "SET_STATUS":
      return { ...state, selectedStatus: action.payload }
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    case "ADD_REQUEST":
      return { ...state, myRequests: [...state.myRequests, action.payload] }
    case "UPDATE_REQUEST":
      return {
        ...state,
        myRequests: state.myRequests.map((r) => (r.id === action.payload.id ? action.payload : r)),
      }
    case "ADD_TO_CART":
      if (state.cart.some((p) => p.id === action.payload.id)) return state;
      const updatedCart = [...state.cart, action.payload];
      if (typeof window !== 'undefined') localStorage.setItem('cart', JSON.stringify(updatedCart));
      return { ...state, cart: updatedCart };
    case "REMOVE_FROM_CART":
      const filteredCart = state.cart.filter((p) => p.id !== action.payload);
      if (typeof window !== 'undefined') localStorage.setItem('cart', JSON.stringify(filteredCart));
      return { ...state, cart: filteredCart };
    default:
      return state
  }
}

// Context
const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
} | null>(null)

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    myListings: initialState.products.filter((p) => p.seller === initialState.user?.name),
  })

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

// Hook
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}

// Utility functions
export function getFilteredProducts(products: Product[], searchTerm: string, category: string, status: string) {
  return products.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = category === "all" || product.category.toLowerCase() === category.toLowerCase()
    const matchesStatus = status === "all" || product.status === status

    return matchesSearch && matchesCategory && matchesStatus
  })
}
