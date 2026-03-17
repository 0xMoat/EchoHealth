'use client'

import { useCallback, useState, type DragEvent } from 'react'

interface FileUploaderProps {
  files: File[]
  onChange: (files: File[]) => void
  maxFiles: number
  accept: string
}

export default function FileUploader({ files, onChange, maxFiles, accept }: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const arr = Array.from(newFiles)
      const combined = [...files, ...arr].slice(0, maxFiles)
      onChange(combined)
    },
    [files, onChange, maxFiles],
  )

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
          dragOver
            ? 'border-neutral-900 bg-neutral-50'
            : 'border-neutral-300 hover:border-neutral-400'
        }`}
      >
        <input
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <svg className="h-10 w-10 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3 3 0 013.4 3.178A3.38 3.38 0 0118 15.75" />
        </svg>
        <p className="mt-3 text-sm text-neutral-600">
          Drag files here or <span className="font-medium text-neutral-900">browse</span>
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Images (JPEG, PNG, WebP) or PDF · Max {maxFiles} files
        </p>
      </label>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{file.name}</p>
                <p className="text-xs text-neutral-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label={`Remove ${file.name}`}
                className="ml-4 rounded-md text-neutral-400 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
