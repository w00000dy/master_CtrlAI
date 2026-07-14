-- AlterTable
ALTER TABLE `Control` ADD COLUMN `generatedForId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Control` ADD CONSTRAINT `Control_generatedForId_fkey` FOREIGN KEY (`generatedForId`) REFERENCES `Paragraph`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
