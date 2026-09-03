-- CreateTable
CREATE TABLE "UcpCheckoutSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lineItems" JSON NOT NULL DEFAULT '[]',
    "itemsPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "buyerEmail" TEXT,
    "buyerName" TEXT,
    "buyerPhone" TEXT,
    "shippingAddress" JSON,
    "paymentHandlerId" TEXT,
    "paymentIntentId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "userId" UUID,
    "orderId" UUID,
    "messages" JSON NOT NULL DEFAULT '[]',
    "capabilities" JSON NOT NULL DEFAULT '[]',
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UcpCheckoutSession_pkey" PRIMARY KEY ("id")
);
