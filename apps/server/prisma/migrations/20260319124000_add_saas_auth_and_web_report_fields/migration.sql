-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('WECHAT', 'GOOGLE');

-- CreateEnum
CREATE TYPE "VideoLanguage" AS ENUM ('AUTO', 'EN', 'ZH');

-- CreateEnum
CREATE TYPE "InputType" AS ENUM ('IMAGE', 'PDF');

-- CreateEnum
CREATE TYPE "ReportSource" AS ENUM ('MINIPROGRAM', 'WEB');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('WECHAT_PAY', 'CREEM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'EXPIRED');

-- AlterEnum
ALTER TYPE "ReportType" ADD VALUE 'GENERAL';

-- AlterTable
ALTER TABLE "User"
  ALTER COLUMN "openid" DROP NOT NULL,
  ADD COLUMN "authProvider" "AuthProvider" NOT NULL DEFAULT 'WECHAT',
  ADD COLUMN "email" TEXT,
  ADD COLUMN "googleId" TEXT;

-- AlterTable
ALTER TABLE "Report"
  ADD COLUMN "inputType" "InputType" NOT NULL DEFAULT 'IMAGE',
  ADD COLUMN "language" "VideoLanguage" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN "source" "ReportSource" NOT NULL DEFAULT 'MINIPROGRAM';

-- CreateTable
CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "creemSubscriptionId" TEXT,
  "status" "SubscriptionStatus" NOT NULL,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_creemSubscriptionId_key" ON "Subscription"("creemSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- AddForeignKey
ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
