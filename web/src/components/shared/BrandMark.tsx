// The Forward Legacy logo mark (public/logo.jpg — supplied brand asset, not
// hand-drawn). `size` is the rendered height in px; width follows the
// source image's own aspect ratio via objectFit:"contain" so the mark never
// looks stretched. Single shared component so the same file is referenced
// everywhere — header, footer, wizard, auth screens, and every generated
// document's toolbar — updating the logo means replacing public/logo.jpg,
// never editing per-usage markup.
export default function BrandMark({size=28,className=""}:{size?: number; className?: string}){
  return(
    <img
      src="/logo.jpg"
      alt="Forward Legacy"
      className={className}
      style={{height:size, width:"auto", objectFit:"contain", display:"block"}}
    />
  );
}
