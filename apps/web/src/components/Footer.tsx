export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-neutral-900" />
            <span className="text-sm font-semibold tracking-tight text-slate-800">
              EchoHealth
            </span>
          </div>
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} EchoHealth. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
