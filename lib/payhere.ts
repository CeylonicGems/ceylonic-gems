import { createHash, timingSafeEqual } from "node:crypto";
const md5=(v:string)=>createHash("md5").update(v,"utf8").digest("hex").toUpperCase();
export const formatPayHereAmount=(n:number)=>n.toFixed(2);
export function createPayHereHash(p:{merchantId:string;orderId:string;amount:number;currency:string;merchantSecret:string}){
  return md5(p.merchantId+p.orderId+formatPayHereAmount(p.amount)+p.currency+md5(p.merchantSecret));
}
export function verifyPayHereNotification(p:{merchantId:string;orderId:string;amount:string;currency:string;statusCode:string;merchantSecret:string;receivedSignature:string}){
  const expected=md5(p.merchantId+p.orderId+p.amount+p.currency+p.statusCode+md5(p.merchantSecret)); const received=p.receivedSignature.toUpperCase();
  return received.length===expected.length&&timingSafeEqual(Buffer.from(received),Buffer.from(expected));
}
export const payHereCheckoutUrl=()=>process.env.PAYHERE_SANDBOX==="false"?"https://www.payhere.lk/pay/checkout":"https://sandbox.payhere.lk/pay/checkout";
