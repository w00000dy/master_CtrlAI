-- CreateTable
CREATE TABLE `BenchmarkResult` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `llmControlId` INTEGER NOT NULL,
    `isRelevant` BOOLEAN NOT NULL,
    `isActionable` BOOLEAN NOT NULL,
    `isTechnicallyCorrect` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BenchmarkResult_llmControlId_key`(`llmControlId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ParagraphBenchmark` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paragraphId` INTEGER NOT NULL,
    `isComplete` BOOLEAN NOT NULL,
    `hasRedundancy` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ParagraphBenchmark_paragraphId_key`(`paragraphId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CoveredByBenchmark` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CoveredByBenchmark_AB_unique`(`A`, `B`),
    INDEX `_CoveredByBenchmark_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BenchmarkResult` ADD CONSTRAINT `BenchmarkResult_llmControlId_fkey` FOREIGN KEY (`llmControlId`) REFERENCES `Control`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParagraphBenchmark` ADD CONSTRAINT `ParagraphBenchmark_paragraphId_fkey` FOREIGN KEY (`paragraphId`) REFERENCES `Paragraph`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CoveredByBenchmark` ADD CONSTRAINT `_CoveredByBenchmark_A_fkey` FOREIGN KEY (`A`) REFERENCES `BenchmarkResult`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CoveredByBenchmark` ADD CONSTRAINT `_CoveredByBenchmark_B_fkey` FOREIGN KEY (`B`) REFERENCES `Control`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
