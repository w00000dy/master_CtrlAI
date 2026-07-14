-- DropForeignKey
ALTER TABLE `Control` DROP FOREIGN KEY `Control_generatedForId_fkey`;

-- DropIndex
DROP INDEX `Control_generatedForId_fkey` ON `Control`;

-- AddForeignKey
ALTER TABLE `Control` ADD CONSTRAINT `Control_generatedForId_fkey` FOREIGN KEY (`generatedForId`) REFERENCES `Paragraph`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
