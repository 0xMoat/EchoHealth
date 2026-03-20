'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface UploadModalContextType {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}

const UploadModalContext = createContext<UploadModalContextType | undefined>(undefined)

export function UploadModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  return (
    <UploadModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </UploadModalContext.Provider>
  )
}

export function useUploadModal() {
  const context = useContext(UploadModalContext)
  if (context === undefined) {
    throw new Error('useUploadModal must be used within an UploadModalProvider')
  }
  return context
}
