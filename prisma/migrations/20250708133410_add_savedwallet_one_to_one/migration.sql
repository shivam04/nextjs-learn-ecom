/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `SavedWallet` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SavedWallet_userId_key" ON "SavedWallet"("userId");
