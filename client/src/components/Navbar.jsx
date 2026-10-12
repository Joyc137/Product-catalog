import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BoxIcon, ChartIcon, MenuIcon, PlusIcon, XIcon } from './icons'

const navLinkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const links = (
    <>
      <NavLink to="/" end className={navLinkClass} onClick={close}>
        Products
      </NavLink>
      {isAdmin && (
        <>
          <NavLink to="/admin/dashboard" className={navLinkClass} onClick={close}>
            <span className="inline-flex items-center gap-1.5">
              <ChartIcon className="size-4" /> Dashboard
            </span>
          </NavLink>
          <NavLink to="/admin/products/new" className={navLinkClass} onClick={close}>
            <span className="inline-flex items-center gap-1.5">
              <PlusIcon className="size-4" /> Add product
            </span>
          </NavLink>
        </>
      )}
    </>
  )

  const account = user ? (
    <div className="flex items-center gap-3">
      <div className="text-right text-sm leading-tight">
        <p className="font-medium text-slate-900">{user.name}</p>
        <p className="text-xs text-slate-500 capitalize">{user.role}</p>
      </div>
      <button
        onClick={() => {
          close()
          logout()
        }}
        className="btn-secondary"
      >
        Log out
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link to="/login" className="btn-ghost" onClick={close}>
        Log in
      </Link>
      <Link to="/register" className="btn-primary" onClick={close}>
        Sign up
      </Link>
    </div>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <BoxIcon className="size-5" />
            </span>
            Catalog
          </Link>
          <div className="hidden items-center gap-1 md:flex">{links}</div>
        </div>
        <div className="hidden md:block">{account}</div>
        <button
          className="btn-ghost -mr-2 px-2 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? <XIcon /> : <MenuIcon />}
        </button>
      </nav>
      {open && (
        <div className="space-y-4 border-t border-slate-200 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">{links}</div>
          <div className="border-t border-slate-100 pt-4">{account}</div>
        </div>
      )}
    </header>
  )
}
