-- CreateTable
CREATE TABLE `Document` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `savedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Guideline` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `savedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `documentId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Section` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `marker` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `documentId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Paragraph` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `marker` VARCHAR(191) NULL,
    `text` TEXT NOT NULL,
    `sectionId` INTEGER NOT NULL,
    `parentParagraphId` INTEGER NULL,
    `isFewShotExample` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Control` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `statement` TEXT NOT NULL,
    `implementationGuidance` TEXT NULL,
    `guidelineId` INTEGER NULL,
    `generatedForId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BenchmarkResult` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `llmControlId` INTEGER NOT NULL,
    `isActionable` BOOLEAN NOT NULL,
    `isTechnicallyCorrect` BOOLEAN NOT NULL,
    `isMeasurable` BOOLEAN NOT NULL,
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
CREATE TABLE `_ControlToParagraph` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ControlToParagraph_AB_unique`(`A`, `B`),
    INDEX `_ControlToParagraph_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CoveredByBenchmark` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CoveredByBenchmark_AB_unique`(`A`, `B`),
    INDEX `_CoveredByBenchmark_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_RelevantBenchmarkParagraphs` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_RelevantBenchmarkParagraphs_AB_unique`(`A`, `B`),
    INDEX `_RelevantBenchmarkParagraphs_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Guideline` ADD CONSTRAINT `Guideline_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Section` ADD CONSTRAINT `Section_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Paragraph` ADD CONSTRAINT `Paragraph_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `Section`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Paragraph` ADD CONSTRAINT `Paragraph_parentParagraphId_fkey` FOREIGN KEY (`parentParagraphId`) REFERENCES `Paragraph`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Control` ADD CONSTRAINT `Control_guidelineId_fkey` FOREIGN KEY (`guidelineId`) REFERENCES `Guideline`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Control` ADD CONSTRAINT `Control_generatedForId_fkey` FOREIGN KEY (`generatedForId`) REFERENCES `Paragraph`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BenchmarkResult` ADD CONSTRAINT `BenchmarkResult_llmControlId_fkey` FOREIGN KEY (`llmControlId`) REFERENCES `Control`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParagraphBenchmark` ADD CONSTRAINT `ParagraphBenchmark_paragraphId_fkey` FOREIGN KEY (`paragraphId`) REFERENCES `Paragraph`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ControlToParagraph` ADD CONSTRAINT `_ControlToParagraph_A_fkey` FOREIGN KEY (`A`) REFERENCES `Control`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ControlToParagraph` ADD CONSTRAINT `_ControlToParagraph_B_fkey` FOREIGN KEY (`B`) REFERENCES `Paragraph`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CoveredByBenchmark` ADD CONSTRAINT `_CoveredByBenchmark_A_fkey` FOREIGN KEY (`A`) REFERENCES `BenchmarkResult`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CoveredByBenchmark` ADD CONSTRAINT `_CoveredByBenchmark_B_fkey` FOREIGN KEY (`B`) REFERENCES `Control`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_RelevantBenchmarkParagraphs` ADD CONSTRAINT `_RelevantBenchmarkParagraphs_A_fkey` FOREIGN KEY (`A`) REFERENCES `BenchmarkResult`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_RelevantBenchmarkParagraphs` ADD CONSTRAINT `_RelevantBenchmarkParagraphs_B_fkey` FOREIGN KEY (`B`) REFERENCES `Paragraph`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
