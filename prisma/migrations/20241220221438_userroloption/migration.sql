/*
  Warnings:

  - You are about to drop the column `rolId` on the `Option` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Option" DROP CONSTRAINT "Option_rolId_fkey";

-- AlterTable
ALTER TABLE "Option" DROP COLUMN "rolId";

-- CreateTable
CREATE TABLE "OptionRol" (
    "id" SERIAL NOT NULL,
    "rolId" INTEGER,
    "optionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionRol_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OptionRol" ADD CONSTRAINT "OptionRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionRol" ADD CONSTRAINT "OptionRol_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE SET NULL ON UPDATE CASCADE;
