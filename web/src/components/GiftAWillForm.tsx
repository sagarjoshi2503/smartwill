import { useState } from "react";
import { Gift, Copy, Download } from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import { API_GIFT_VOUCHER_ORDER, API_GIFT_VOUCHER_PURCHASE, API_GIFT_VOUCHER_VERIFY, RAZORPAY_KEY_ID } from "../constants";
import type { RazorpaySuccessResponse } from "../types/razorpay";

// Pricing from the theme's Gift a Will form (lines 640-651) — ₹4,999 /
// ₹6,999 / ₹24,999. Kept as a local literal (not reused from
// data/plans.tsx's PLANS) since this form only needs amount + a short
// label. Labels renamed per explicit product request (theme's "WILL" for
// both allindia/goan read as duplicate/ambiguous — see the same rename on
// the Home page plan cards in data/plans.tsx).
const GIFT_PLANS = [
  { amount: 4999, label: "All India Will" },
  { amount: 6999, label: "Goan Will" },
  { amount: 24999, label: "CUSTOMIZED WILL" },
];

export default function GiftAWillForm(){
  const [amount, setAmount] = useState(GIFT_PLANS[0].amount);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ordering" | "error">("idle");
  const [error, setError] = useState("");
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const planLabel = GIFT_PLANS.find(p => p.amount === amount)?.label || "WILL";

  const applyCoupon = async () => {
    if(!coupon.trim()) return;
    setCouponMsg(null);
    try {
      const res = await fetch(apiUrl(API_GIFT_VOUCHER_VERIFY), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon.trim() }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      setCouponMsg(res.ok && data?.found ? "Code recognized." : "That code wasn't found.");
    } catch {
      setCouponMsg("Could not check that code right now.");
    }
  };

  const resetForm = () => {
    setSuccessCode(null);
    setAmount(GIFT_PLANS[0].amount);
    setRecipientName(""); setRecipientEmail(""); setMessage(""); setCoupon(""); setCouponMsg(null);
    setStatus("idle"); setError("");
  };

  const finishPurchase = async (order: { orderId: string; amount: number; currency: string }, response: RazorpaySuccessResponse) => {
    try {
      const res = await fetch(apiUrl(API_GIFT_VOUCHER_PURCHASE), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          planLabel, amount, recipientName, recipientEmail,
          message: message || undefined,
        }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if(!res.ok || !data?.code) throw new Error(data?.error || "Payment succeeded, but the voucher could not be created. Please contact support.");
      setSuccessCode(data.code);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not complete the gift purchase.");
    }
  };

  const handleBuyNow = async () => {
    if(!recipientName.trim() || !recipientEmail.trim()) {
      setStatus("error");
      setError("Please enter the recipient's name and email address.");
      return;
    }
    setStatus("ordering"); setError("");
    try {
      const orderRes = await fetch(apiUrl(API_GIFT_VOUCHER_ORDER), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Razorpay's Orders API takes the amount in paise, not rupees — the
        // `amount` state here is rupees (₹4,999 etc., same as GIFT_PLANS and
        // the voucher's stored amount below), so it must be converted here,
        // same as the main Will-payment flow does in WizardForms.tsx.
        body: JSON.stringify({ amount: Math.round(amount * 100), planLabel }),
      });
      const orderIsJson = orderRes.headers.get("content-type")?.includes("application/json");
      const order = orderIsJson ? await orderRes.json() : null;
      if(!orderRes.ok || !order?.orderId) throw new Error(order?.error || "Could not start the gift purchase.");

      if(typeof window.Razorpay !== "function" || !RAZORPAY_KEY_ID) {
        throw new Error("Payment gateway isn't available right now. Please try again shortly.");
      }
      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY_ID as string,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Forward Legacy — Gift a Will",
        description: `Gift voucher: ${planLabel} ₹${amount.toLocaleString("en-IN")}`,
        prefill: { name: recipientName, email: recipientEmail },
        theme: { color: "#2F8132" },
        handler: (response) => { finishPurchase(order, response); },
        modal: {
          ondismiss: () => {
            setStatus("error");
            setError("Payment was cancelled. Click Buy Now to try again.");
          },
        },
      });
      rzp.on("payment.failed", () => {
        setStatus("error");
        setError("Payment failed. Click Buy Now to try again.");
      });
      rzp.open();
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not start the gift purchase.");
    }
  };

  const IC = "w-full apv-input rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none transition";
  const LC = "block text-slate-700 text-xs font-semibold mb-1.5";

  if(successCode) {
    return(
      <div className="bg-white p-6 rounded-2xl border border-[#E5E8E3] text-center fade-in">
        <div className="w-14 h-14 bg-[#EDF6EA] rounded-full flex items-center justify-center mx-auto mb-4"><Gift size={26} className="text-[#2F8132]"/></div>
        <h3 className="text-slate-900 font-bold text-lg serif mb-1.5">Gift Voucher Sent!</h3>
        <p className="text-slate-500 text-sm mb-4">A unique voucher code has been emailed to <strong className="text-slate-700">{recipientEmail}</strong>. It's valid for 12 months.</p>
        <div className="my-3 py-3 px-4 bg-[#EDF6EA] border border-dashed border-[#2F8132] rounded-xl text-lg font-bold tracking-widest text-[#1E5B22] font-mono">{successCode}</div>
        <div className="flex items-center justify-center gap-2">
          <button onClick={()=>navigator.clipboard?.writeText(successCode)} className="apv-btn-alt text-sm px-4 py-2"><Copy size={13}/>Copy Code</button>
          <button
            onClick={()=>{
              const blob = new Blob([`Forward Legacy — Gift a Will\n\nVoucher code: ${successCode}\nPlan: ${planLabel}\nRecipient: ${recipientName} <${recipientEmail}>\nValid for 12 months from purchase.\n`], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `${successCode}.txt`; a.click();
              URL.revokeObjectURL(url);
            }}
            className="apv-btn-alt text-sm px-4 py-2"><Download size={13}/>Download</button>
        </div>
        <button onClick={resetForm} className="text-slate-400 hover:text-[#2F8132] text-xs underline mt-4 inline-block">← Send another gift</button>
      </div>
    );
  }

  return(
    <div className="bg-white p-6 rounded-2xl border border-[#E5E8E3]">
      <label className={LC}>Select a Plan</label>
      <div className="grid gap-2 mb-4">
        {GIFT_PLANS.map(p=>(
          <label key={p.amount}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-[1.5px] cursor-pointer transition-colors ${amount===p.amount?"border-[#2F8132] bg-[#EDF6EA]":"border-[#E5E8E3] hover:border-[#8BC34A]"}`}>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <input type="radio" name="giftPlan" checked={amount===p.amount} onChange={()=>setAmount(p.amount)} className="accent-[#2F8132]"/>
              {p.label}
            </span>
            <span className="font-bold text-[#2F8132] text-sm">₹{p.amount.toLocaleString("en-IN")}</span>
          </label>
        ))}
      </div>
      <div className="mb-3">
        <label className={LC}>Recipient's Full Name</label>
        <input value={recipientName} onChange={e=>setRecipientName(e.target.value)} className={IC} placeholder="e.g. Priya Naik"/>
      </div>
      <div className="mb-3">
        <label className={LC}>Recipient's Email Address</label>
        <input type="email" value={recipientEmail} onChange={e=>setRecipientEmail(e.target.value)} className={IC} placeholder="name@email.com"/>
      </div>
      <div className="mb-3">
        <label className={LC}>Custom Personal Message</label>
        <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={3} className={IC+" resize-none"} placeholder="Write a short personal note…"/>
      </div>
      <label className={LC}>Have a coupon code?</label>
      <div className="flex gap-2 mb-1">
        <input value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())} className={IC+" rounded-full font-mono"} placeholder="Enter Coupon Code"/>
        <button type="button" onClick={applyCoupon} className="apv-btn-alt text-xs px-4 shrink-0">Apply</button>
      </div>
      {couponMsg && <p className="text-[11px] text-slate-500 mb-2">{couponMsg}</p>}
      {status==="error" && <p className="text-red-500 text-xs mt-2 mb-1">{error}</p>}
      <button type="button" onClick={handleBuyNow} disabled={status==="ordering"}
        className="apv-btn w-full justify-center mt-3 disabled:opacity-60 disabled:cursor-not-allowed">
        {status==="ordering" ? <>Processing…</> : <><Gift size={14}/>Buy Now</>}
      </button>
    </div>
  );
}
