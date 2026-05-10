export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Blob A — large, top-left */}
      <div
        className="ambient-blob-a absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full opacity-[0.12]"
        style={{
          background:
            'radial-gradient(circle at center, #C8742A 0%, #D97706 35%, transparent 70%)',
        }}
      />
      {/* Blob B — medium, bottom-right */}
      <div
        className="ambient-blob-b absolute -bottom-24 -right-24 h-[480px] w-[480px] rounded-full opacity-[0.09]"
        style={{
          background:
            'radial-gradient(circle at center, #C8742A 0%, #B85C1A 40%, transparent 70%)',
        }}
      />
      {/* Blob C — small, center */}
      <div
        className="ambient-blob-c absolute top-1/3 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
        style={{
          background:
            'radial-gradient(circle at center, #E8892E 0%, transparent 70%)',
        }}
      />
    </div>
  )
}
