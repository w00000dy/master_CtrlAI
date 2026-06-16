-- AlterTable
ALTER TABLE `Control` ADD COLUMN `guidelineId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Guideline` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `savedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `documentId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Guideline` ADD CONSTRAINT `Guideline_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Control` ADD CONSTRAINT `Control_guidelineId_fkey` FOREIGN KEY (`guidelineId`) REFERENCES `Guideline`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
