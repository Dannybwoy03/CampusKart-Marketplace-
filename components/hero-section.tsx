"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApp } from "@/lib/store"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function HeroSection() {
  const { dispatch } = useApp()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    dispatch({ type: "SET_SEARCH_TERM", payload: searchQuery })
    router.push("/")
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#1e293b] py-20 sm:py-28">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500 opacity-20 blur-3xl dark:bg-blue-700"
          animate={{ x: [0, 10, 0], y: [0, 15, 0] }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-purple-500 opacity-20 blur-3xl dark:bg-purple-700"
          animate={{ x: [0, -10, 0], y: [0, -15, 0] }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse", delay: 1 }}
        />
      </div>
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-blue-700 bg-clip-text text-transparent">Campus</span>
            <span className="text-white">Kart</span>
          </h1>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <p className="text-2xl sm:text-3xl text-gray-300 mb-8">
            The ultimate marketplace for students to buy and sell items on campus
          </p>
        </motion.div>
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full max-w-xl"
          onSubmit={handleSearch}
        >
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Search for textbooks, electronics, furniture..."
                className="pl-10 pr-24 py-6 rounded-lg border-0 ring-2 ring-blue-900 focus:ring-blue-500 shadow-lg transition-all duration-300 bg-[#1e293b] text-white placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-5 w-5" />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white rounded-md px-6 py-2 transition-all duration-300 shadow"
              >
                Search
              </Button>
            </div>
          </div>
        </motion.form>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-wrap justify-center gap-4 mt-10"
        >
          {["Electronics", "Books", "Furniture", "Clothing", "Supplies"].map((category, index) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
            >
              <Button
                variant="outline"
                className="bg-[#232e41] text-white border-blue-800 hover:bg-blue-900/60 hover:text-blue-300 transition-all duration-300 px-6 py-3 text-lg font-semibold rounded-xl shadow"
                onClick={() => {
                  dispatch({ type: "SET_CATEGORY", payload: category.toLowerCase() })
                  router.push("/")
                }}
              >
                {category}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
} 