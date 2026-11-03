type StatCardProps = {
  label: string
  value: string
  suffix?: string
  description: string
}

function StatCard({
  label,
  value,
  suffix,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-bold text-slate-900">
          {value}
        </span>

        {suffix && (
          <span className="mb-1 text-sm text-slate-500">
            {suffix}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-slate-600">
        {description}
      </p>
    </div>
  )
}

export default StatCard