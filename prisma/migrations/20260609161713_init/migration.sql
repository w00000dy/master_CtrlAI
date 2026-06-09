-- CreateTable
CREATE TABLE `Control` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ControlToParagraph` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ControlToParagraph_AB_unique`(`A`, `B`),
    INDEX `_ControlToParagraph_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_ControlToParagraph` ADD CONSTRAINT `_ControlToParagraph_A_fkey` FOREIGN KEY (`A`) REFERENCES `Control`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ControlToParagraph` ADD CONSTRAINT `_ControlToParagraph_B_fkey` FOREIGN KEY (`B`) REFERENCES `Paragraph`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
