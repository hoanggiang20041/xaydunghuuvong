'use client'

import { Modal } from './modal'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isDestructive = true,
  loading = false
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center pb-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-500' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500'}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">{message}</p>
        
        <div className="flex items-center gap-3 w-full">
          <button 
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 flex items-center justify-center text-white font-medium rounded-lg transition-colors disabled:opacity-50 ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
