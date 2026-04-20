import { Resend } from "resend";
import { SENDER_EMAIL, APP_NAME } from "@/lib/constants";
import { Order } from "@/types";
import PurchaseReceiptEmail from "./purchase-receipt";

let resendClient: Resend | null = null;
const getResend = () => {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("Missing RESEND_API_KEY environment variable");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

export const sendPurchaseReceipt = async ({ order }: { order: Order }) => {
  await getResend().emails.send({
    from: `${APP_NAME}<${SENDER_EMAIL}>`,
    to: order.user.email,
    subject: `Order Confirmation ${order.id}`,
    react: <PurchaseReceiptEmail order={order} />,
  });
};
