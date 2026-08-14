/*
  Warnings:

  - You are about to drop the column `hasHallucinations` on the `ParagraphBenchmark` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ControlBenchmark` ADD COLUMN `hasHallucinations` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `ParagraphBenchmark` DROP COLUMN `hasHallucinations`;
