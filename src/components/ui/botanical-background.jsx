function LeafyBranch({ className, style }) {
  return (
    <svg viewBox="0 0 240 500" fill="none" className={className} style={style}>
      <path d="M118 495C90 385 158 295 114 180C95 129 117 60 134 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {[75, 145, 220, 295, 370, 440].map((y, index) => (
        <g key={y} transform={`translate(${index % 2 ? 119 : 112} ${y}) rotate(${index % 2 ? 12 : -10})`}>
          <path d="M0 0C-49-4-83-40-80-75C-37-73-7-44 0 0Z" fill="currentColor" fillOpacity="0.65" />
          <path d="M0 10C44 5 79-22 86-61C44-62 12-33 0 10Z" fill="currentColor" fillOpacity="0.45" />
          <path d="M0 0L-62-57M0 10L65-43" stroke="currentColor" strokeWidth="1" />
        </g>
      ))}
    </svg>
  );
}

export function BotanicalBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden text-[#2F7A57] select-none">
      <LeafyBranch className="absolute -left-24 top-8 w-64 opacity-[0.24] sm:-left-16 sm:w-80" style={{ transform: "rotate(24deg)" }} />
      <LeafyBranch className="absolute -right-24 -top-28 w-72 opacity-[0.22] sm:-right-12 sm:w-96" style={{ transform: "rotate(195deg)" }} />
      <LeafyBranch className="absolute -bottom-52 left-[22%] w-80 opacity-[0.18]" style={{ transform: "rotate(-38deg)" }} />
      <LeafyBranch className="absolute -bottom-16 -right-24 w-72 opacity-[0.24]" style={{ transform: "rotate(-25deg)" }} />
    </div>
  );
}
