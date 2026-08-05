/*
  Warnings:

  - Added the required column `isMeasurable` to the `BenchmarkResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `BenchmarkResult` ADD COLUMN `isMeasurable` BOOLEAN NOT NULL;
