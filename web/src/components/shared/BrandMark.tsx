// The Forward Legacy logo mark — a layered forward-pointing chevron in three
// shades of green. Used everywhere the app previously showed a generic
// "Scale" icon as a stand-in brand badge, so the same mark appears
// consistently across the header, footer, wizard, auth screens, and every
// generated document's toolbar.
export default function BrandMark({size=28,className=""}:{size?: number; className?: string}){
  return(
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <polygon points="0,4 18,4 32,20 18,36 0,36 12,20" fill="#17441A"/>
      <polygon points="8,4 24,4 36,20 24,36 8,36 18,20" fill="#2F8132"/>
      <polygon points="16,4 30,4 38,20 30,36 16,36 24,20" fill="#8BC34A"/>
    </svg>
  );
}
