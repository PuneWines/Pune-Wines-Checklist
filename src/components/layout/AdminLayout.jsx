

"use client"

import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { CheckSquare, ClipboardList, Home, LogOut, Menu, Database, ChevronDown, ChevronRight, KeyRound,Video } from 'lucide-react'

export default function AdminLayout({ children, darkMode, toggleDarkMode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDataSubmenuOpen, setIsDataSubmenuOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [userRole, setUserRole] = useState("")
  
  // ADD: State for dynamic data categories
  const [dataCategories, setDataCategories] = useState([])
  const [isFetchingCategories, setIsFetchingCategories] = useState(false)

  // Apps Script URL - same as dashboard
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyBPTmVksbejNrOPNZNHYajQWWLbzA34hshoAPYig99hcqkYuiKy-j5pavsuqeFKIXNFg/exec"

  // Function to fetch data using Apps Script
  const fetchDataFromAppsScript = async (sheetName) => {
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(sheetName)}&action=fetch`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success && data.error) {
        throw new Error(data.error)
      }

      return data
    } catch (error) {
      console.error(`Error fetching data from Apps Script for ${sheetName}:`, error)
      throw error
    }
  }

  // ADD: Function to fetch and set dynamic data categories
  const fetchDataCategories = async () => {
    try {
      setIsFetchingCategories(true)

      const username = sessionStorage.getItem("username") || ""
      const userRole = sessionStorage.getItem("role") || ""
      const isAdmin = userRole.toLowerCase() === "admin"

      const data = await fetchDataFromAppsScript("MASTER")

      if (data?.table?.rows) {
        const masterData = data.table.rows.slice(1).map(row => ({
          department: row?.c?.[0]?.v,
          userName: row?.c?.[2]?.v,
          userRole: row?.c?.[4]?.v,
          accessDepartments: row?.c?.[9]?.v
        })).filter(item => 
          item.userName !== null && 
          item.userName !== undefined && 
          item.userName !== ""
        )

        let accessibleDepartments = []

        if (isAdmin) {
          const adminRow = masterData.find(item => 
            item.userRole?.toLowerCase() === "admin" && 
            item.userName?.toLowerCase() === username.toLowerCase()
          )
          
          if (adminRow && adminRow.accessDepartments) {
            accessibleDepartments = adminRow.accessDepartments
              .split(',')
              .map(dept => dept.trim())
              .filter(dept => dept !== "")
          }
        } else {
          const userRow = masterData.find(item => 
            item.userRole?.toLowerCase() === userRole.toLowerCase() && 
            item.userName?.toLowerCase() === username.toLowerCase()
          )
          
          if (userRow && userRow.accessDepartments) {
            accessibleDepartments = userRow.accessDepartments
              .split(',')
              .map(dept => dept.trim())
              .filter(dept => dept !== "")
          }
        }

        // Convert departments to dataCategories format
        const dynamicCategories = accessibleDepartments.map(dept => ({
          id: dept.toLowerCase().replace(/\s+/g, '-'),
          name: dept,
          link: `/dashboard/data/${dept.toLowerCase().replace(/\s+/g, '-')}`
        }))

        setDataCategories(dynamicCategories)
        return
      }

      // Fallback code - same as dashboard
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1GnzBl9yq2M5FXBeCNnPIVL5PFSTXi2T3SBBOCHAKqMs/gviz/tq?tqx=out:json&sheet=MASTER`
      )

      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)

      const text = await response.text()
      const jsonStart = text.indexOf("{")
      const jsonEnd = text.lastIndexOf("}")
      const jsonString = text.substring(jsonStart, jsonEnd + 1)
      const fallbackData = JSON.parse(jsonString)

      const fallbackMasterData = fallbackData.table.rows.slice(1).map(row => ({
        department: row?.c?.[0]?.v,
        userName: row?.c?.[2]?.v,
        userRole: row?.c?.[4]?.v,
        accessDepartments: row?.c?.[9]?.v
      })).filter(item => item.userName !== null && item.userName !== undefined && item.userName !== "")

      let accessibleDepartments = []

      if (isAdmin) {
        const adminRow = fallbackMasterData.find(item => 
          item.userRole?.toLowerCase() === "admin" && 
          item.userName?.toLowerCase() === username.toLowerCase()
        )
        
        if (adminRow && adminRow.accessDepartments) {
          accessibleDepartments = adminRow.accessDepartments
            .split(',')
            .map(dept => dept.trim())
            .filter(dept => dept !== "")
        }
      } else {
        const userRow = fallbackMasterData.find(item => 
          item.userRole?.toLowerCase() === userRole.toLowerCase() && 
          item.userName?.toLowerCase() === username.toLowerCase()
        )
        
        if (userRow && userRow.accessDepartments) {
          accessibleDepartments = userRow.accessDepartments
            .split(',')
            .map(dept => dept.trim())
            .filter(dept => dept !== "")
        }
      }

      // Convert departments to dataCategories format
      const dynamicCategories = accessibleDepartments.map(dept => ({
        id: dept.toLowerCase().replace(/\s+/g, '-'),
        name: dept,
        link: `/dashboard/data/${dept.toLowerCase().replace(/\s+/g, '-')}`
      }))

      setDataCategories(dynamicCategories)

    } catch (error) {
      console.error("Error loading data categories:", error)
      // Fallback to empty array on error
      setDataCategories([])
    } finally {
      setIsFetchingCategories(false)
    }
  }

  // Check authentication on component mount
  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username')
    const storedRole = sessionStorage.getItem('role')
    
    if (!storedUsername) {
      // Redirect to login if not authenticated
      navigate("/login")
      return
    }
  
    setUsername(storedUsername)
    setUserRole(storedRole || "user")

    // ADD: Fetch dynamic data categories after authentication check
    fetchDataCategories()
  }, [navigate])

  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem('username')
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('department')
    navigate("/login")
  }

  // Update the routes array based on user role
  const routes = [
    {
      href: "/dashboard/admin",
      label: "Dashboard",
      icon: Database,
      active: location.pathname === "/dashboard/admin",
      showFor: ["admin", "user"] // Show for both roles
    },
    {
      href: "/dashboard/assign-task",
      label: "Assign Task",
      icon: CheckSquare,
      active: location.pathname === "/dashboard/assign-task",
      showFor: ["admin"] // Only show for admin
    },
    {
      href: "/dashboard/delegation",
     label: "Delegation",
     icon: ClipboardList,
     active: location.pathname === "/dashboard/delegation",
     showFor: ["admin", "user"] // Only show for admin
   },
    {
      href: "#",
      label: "Data",
      icon: Database,
      active: location.pathname.includes("/dashboard/data"),
      submenu: true,
      showFor: ["admin", "user"] // Show for both roles
    },
    {
      href: "/dashboard/license",
      label: "License",
      icon: KeyRound,
      active: location.pathname === "/dashboard/license",
      showFor: ["admin", "user"] // show both
    },

    {
      href: "/dashboard/traning-video",
      label: "Training Video",
      icon: Video,
      active: location.pathname === "/dashboard/traning-video",
      showFor: ["admin", "user"] //  show both
    },
  ]

// UPDATED: Use dynamic dataCategories instead of static array
const getAccessibleDepartments = () => {
  const userRole = sessionStorage.getItem('role') || 'user'
  return dataCategories.filter(cat => 
    !cat.showFor || cat.showFor.includes(userRole)
  )
}

// Filter routes based on user role
const getAccessibleRoutes = () => {
  const userRole = sessionStorage.getItem('role') || 'user'
  return routes.filter(route => 
    route.showFor.includes(userRole)
  )
}

  // Check if the current path is a data category page
  const isDataPage = location.pathname.includes("/dashboard/data/")
  
  // If it's a data page, expand the submenu by default
  useEffect(() => {
    if (isDataPage && !isDataSubmenuOpen) {
      setIsDataSubmenuOpen(true)
    }
  }, [isDataPage, isDataSubmenuOpen])

  // Get accessible routes and departments
  const accessibleRoutes = getAccessibleRoutes()
  const accessibleDepartments = getAccessibleDepartments()

  return (
    <div className={`flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50`}>
      {/* Sidebar for desktop */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-blue-200 bg-white md:flex md:flex-col">
        <div className="flex h-14 items-center border-b border-blue-200 px-4 bg-gradient-to-r from-blue-100 to-purple-100">
          <Link to="/dashboard/admin" className="flex items-center gap-2 font-semibold text-blue-700">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <span>Checklist & Delegation</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {accessibleRoutes.map((route) => (
              <li key={route.label}>
                {route.submenu ? (
                  <div>
                    <button
                      onClick={() => setIsDataSubmenuOpen(!isDataSubmenuOpen)}
                      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        route.active
                          ? "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700"
                          : "text-gray-700 hover:bg-blue-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <route.icon className={`h-4 w-4 ${route.active ? "text-blue-600" : ""}`} />
                        {route.label}
                      </div>
                      {isDataSubmenuOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    {isDataSubmenuOpen && (
                      <ul className="mt-1 ml-6 space-y-1 border-l border-blue-100 pl-2">
                        {/* ADD: Show loading state or empty state */}
                        {isFetchingCategories ? (
                          <li className="px-3 py-2 text-sm text-gray-500">
                            Loading departments...
                          </li>
                        ) : accessibleDepartments.length > 0 ? (
                          accessibleDepartments.map((category) => (
                            <li key={category.id}>
                              <Link
                                to={category.link || `/dashboard/data/${category.id}`}
                                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                                  location.pathname === (category.link || `/dashboard/data/${category.id}`)
                                    ? "bg-blue-50 text-blue-700 font-medium"
                                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-700 "
                                }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                {category.name}
                              </Link>
                            </li>
                          ))
                        ) : (
                          <li className="px-3 py-2 text-sm text-gray-500">
                            No departments available
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    to={route.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      route.active
                        ? "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700"
                        : "text-gray-700 hover:bg-blue-50"
                    }`}
                  >
                    <route.icon className={`h-4 w-4 ${route.active ? "text-blue-600" : ""}`} />
                    {route.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-blue-200 p-4 bg-gradient-to-r from-blue-50 to-purple-50 ">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">{username ? username.charAt(0).toUpperCase() : 'U'}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">
                  {username || "User"} {userRole === "admin" ? "(Admin)" : ""}
                </p>
                <p className="text-xs text-blue-600">
                  {username ? `${username.toLowerCase()}@example.com` : "user@example.com"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {toggleDarkMode && (
                <button 
                  onClick={toggleDarkMode} 
                  className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100"
                >
                  {darkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  <span className="sr-only">{darkMode ? "Light mode" : "Dark mode"}</span>
                </button>
              )}
              <button 
                onClick={handleLogout}
                className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Log out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden absolute left-4 top-3 z-50 text-blue-700 p-2 rounded-md hover:bg-blue-100"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </button>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/20" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
            <div className="flex h-14 items-center border-b border-blue-200 px-4 bg-gradient-to-r from-blue-100 to-purple-100">
              <Link
                to="/dashboard/admin"
                className="flex items-center gap-2 font-semibold text-blue-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ClipboardList className="h-5 w-5 text-blue-600" />
                <span>Checklist & Delegation</span>
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto p-2 bg-white">
              <ul className="space-y-1">
                {accessibleRoutes.map((route) => (
                  <li key={route.label}>
                    {route.submenu ? (
                      <div>
                        <button
                          onClick={() => setIsDataSubmenuOpen(!isDataSubmenuOpen)}
                          className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            route.active
                              ? "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700"
                              : "text-gray-700 hover:bg-blue-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <route.icon className={`h-4 w-4 ${route.active ? "text-blue-600" : ""}`} />
                            {route.label}
                          </div>
                          {isDataSubmenuOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        {isDataSubmenuOpen && (
                          <ul className="mt-1 ml-6 space-y-1 border-l border-blue-100 pl-2">
                            {/* ADD: Show loading state or empty state for mobile */}
                            {isFetchingCategories ? (
                              <li className="px-3 py-2 text-sm text-gray-500">
                                Loading departments...
                              </li>
                            ) : accessibleDepartments.length > 0 ? (
                              accessibleDepartments.map((category) => (
                                <li key={category.id}>
                                  <Link
                                    to={category.link || `/dashboard/data/${category.id}`}
                                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                                      location.pathname === (category.link || `/dashboard/data/${category.id}`)
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                                    }`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                  >
                                    {category.name}
                                  </Link>
                                </li>
                              ))
                            ) : (
                              <li className="px-3 py-2 text-sm text-gray-500">
                                No departments available
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <Link
                        to={route.href}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          route.active
                            ? "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700"
                            : "text-gray-700 hover:bg-blue-50"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <route.icon className={`h-4 w-4 ${route.active ? "text-blue-600" : ""}`} />
                        {route.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t border-blue-200 p-4 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">{username ? username.charAt(0).toUpperCase() : 'U'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700">
                      {username || "User"} {userRole === "admin" ? "(Admin)" : ""}
                    </p>
                    <p className="text-xs text-blue-600">
                      {username ? `${username.toLowerCase()}@example.com` : "user@example.com"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {toggleDarkMode && (
                    <button 
                      onClick={toggleDarkMode} 
                      className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100"
                    >
                      {darkMode ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      )}
                      <span className="sr-only">{darkMode ? "Light mode" : "Dark mode"}</span>
                    </button>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 "
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Log out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-blue-200 bg-white px-4 md:px-6">
          <div className="flex md:hidden w-8"></div>
          <h1 className="text-lg font-semibold text-blue-700">Checklist & Delegation</h1>
          <div className="w-8"></div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-br from-blue-50 to-purple-50">
          {children}
          <div className="fixed md:left-64 left-0 right-0 bottom-0 py-1 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center text-sm shadow-md z-10">
          <a
    href="https://www.botivate.in/" // Replace with actual URL
    target="_blank"
    rel="noopener noreferrer"
    className="hover:underline"
  >
    Powered by-<span className="font-semibold">Botivate</span>
  </a>
    </div>
        </main>
      </div>
      
    </div>
  )
}