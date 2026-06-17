/*
  Warnings:

  - You are about to drop the column `isRelevant` on the `BenchmarkResult` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `BenchmarkResult` DROP COLUMN `isRelevant`;

-- CreateTable
CREATE TABLE `_RelevantBenchmarkParagraphs` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_RelevantBenchmarkParagraphs_AB_unique`(`A`, `B`),
    INDEX `_RelevantBenchmarkParagraphs_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_RelevantBenchmarkParagraphs` ADD CONSTRAINT `_RelevantBenchmarkParagraphs_A_fkey` FOREIGN KEY (`A`) REFERENCES `BenchmarkResult`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_RelevantBenchmarkParagraphs` ADD CONSTRAINT `_RelevantBenchmarkParagraphs_B_fkey` FOREIGN KEY (`B`) REFERENCES `Paragraph`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
