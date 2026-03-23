import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Toaster } from 'react-hot-toast'
import { CartProvider } from './components/CartContext'
import { AuthProvider } from './components/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'

const Home            = lazy(() => import('./pages/Home'))
const Shop            = lazy(() => import('./pages/Shop'))
const Cart            = lazy(() => import('./pages/Cart'))
const OrderSuccess    = lazy(() => import('./pages/OrderSuccess'))
const About           = lazy(() => import('./pages/About'))
const AdminLogin      = lazy(() => import('./pages/AdminLogin'))
const AdminDashboard  = lazy(() => import('./pages/AdminDashboard'))
const ReturnPolicy    = lazy(() => import('./pages/ReturnPolicy'))
const PrivacyPolicy   = lazy(() => import('./pages/PrivacyPolicy'))
const TermsConditions = lazy(() => import('./pages/TermsConditions'))

function PageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:12, animation:'spin 1s linear infinite', display:'inline-block' }}>🌿</div>
        <div style={{ fontFamily:'Nunito,sans-serif', color:'#888', fontSize:14 }}>Loading...</div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              style: { fontFamily:'Nunito,sans-serif', borderRadius:'12px', fontWeight:600, fontSize:'14px', maxWidth:'380px' },
              success: { style: { background:'#1e6641', color:'#fff' }, iconTheme: { primary:'#fff', secondary:'#1e6641' } },
              error:   { style: { background:'#e63946', color:'#fff' }, iconTheme: { primary:'#fff', secondary:'#e63946' } },
              duration: 3000,
            }}
          />
          <Navbar />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"              element={<Home />} />
              <Route path="/shop"          element={<Shop />} />
              <Route path="/cart"          element={<Cart />} />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/about"         element={<About />} />
              <Route path="/admin"           element={<Navigate to="/admin/login" replace />} />
              <Route path="/admin/login"     element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/return-policy"   element={<ReturnPolicy />} />
              <Route path="/privacy-policy"  element={<PrivacyPolicy />} />
              <Route path="/terms"           element={<TermsConditions />} />
              <Route path="*"               element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Footer />
          <ScrollToTop />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  )
}