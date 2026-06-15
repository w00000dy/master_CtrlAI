/*
  Warnings:

  - You are about to drop the column `text` on the `Control` table. All the data in the column will be lost.
  - Added the required column `statement` to the `Control` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Control` DROP COLUMN `text`,
    ADD COLUMN `implementationGuidance` TEXT NULL,
    ADD COLUMN `statement` TEXT NOT NULL;
