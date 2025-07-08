-- CreateTable
CREATE TABLE "SavedWallet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "chargePermissionId" TEXT NOT NULL,
    "chargePermissionType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedWallet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SavedWallet" ADD CONSTRAINT "SavedWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
