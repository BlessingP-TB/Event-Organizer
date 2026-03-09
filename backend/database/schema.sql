-- ============================================================
-- Smart Events App — MySQL Database Schema
-- Generated from Prisma schema for MySQL Workbench
-- ============================================================

-- Step 1: Create and use the database
CREATE DATABASE IF NOT EXISTS event_handler_db;
USE event_handler_db;

-- Step 2: Create all tables

CREATE TABLE `User` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'ORGANIZER', 'ATTENDEE') NOT NULL,
    `address` TEXT NULL,
    `cellphone_number` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Account` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Account_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Session` (
    `id` VARCHAR(36) NOT NULL,
    `accountId` VARCHAR(36) NOT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    INDEX `Session_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuthToken` (
    `id` VARCHAR(36) NOT NULL,
    `accountId` VARCHAR(36) NOT NULL,
    `type` ENUM('REFRESH', 'RESET_PASSWORD', 'VERIFY_EMAIL') NOT NULL,
    `token` VARCHAR(512) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    UNIQUE INDEX `AuthToken_token_key`(`token`),
    INDEX `AuthToken_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OrganizerProfile` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `isInternal` BOOLEAN NOT NULL DEFAULT false,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `verifiedByAdminId` VARCHAR(36) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `OrganizerProfile_userId_key`(`userId`),
    INDEX `OrganizerProfile_verifiedByAdminId_idx`(`verifiedByAdminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Venue` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `location` TEXT NOT NULL,
    `capacity` INTEGER NOT NULL,
    `type` ENUM('AUDITORIUM', 'CLASSROOM', 'HALL', 'OTHER') NOT NULL DEFAULT 'HALL',
    `typeOther` VARCHAR(255) NULL,
    `rateType` ENUM('PER_HOUR', 'PER_DAY', 'OTHER') NOT NULL DEFAULT 'PER_DAY',
    `price` DECIMAL(10, 2) NOT NULL,
    `depositValue` DECIMAL(10, 2) NULL,
    `rating` INTEGER NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `imageUrls` JSON NULL,
    UNIQUE INDEX `Venue_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Theme` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `imageUrl` TEXT NULL,
    `image` LONGBLOB NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Theme_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Event` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `startDateTime` DATETIME(3) NOT NULL,
    `endDateTime` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `expectedAttend` INTEGER NULL,
    `totalTickets` INTEGER NULL,
    `isFree` BOOLEAN NOT NULL DEFAULT true,
    `ticketRequired` BOOLEAN NOT NULL DEFAULT true,
    `autoDistribute` BOOLEAN NOT NULL DEFAULT true,
    `allowAttendeePurchase` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `venueId` VARCHAR(36) NOT NULL,
    `organizerId` VARCHAR(36) NOT NULL,
    `themeId` VARCHAR(36) NULL,
    `requestedResourcesAndServices` JSON NULL,
    INDEX `Event_venueId_idx`(`venueId`),
    INDEX `Event_organizerId_idx`(`organizerId`),
    INDEX `Event_themeId_idx`(`themeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Purchase` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `eventId` VARCHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'ZAR',
    `status` ENUM('INITIATED', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'INITIATED',
    `paymentMethod` ENUM('CARD', 'EFT', 'CASH') NULL,
    `providerTransaction` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `ticketDefinitionId` VARCHAR(36) NOT NULL,
    INDEX `Purchase_userId_idx`(`userId`),
    INDEX `Purchase_eventId_idx`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Booking` (
    `id` VARCHAR(36) NOT NULL,
    `eventId` VARCHAR(36) NOT NULL,
    `organizerId` VARCHAR(36) NOT NULL,
    `venueId` VARCHAR(36) NOT NULL,
    `calculatedCost` DECIMAL(10, 2) NOT NULL,
    `depositRequired` DECIMAL(10, 2) NULL,
    `depositPaid` BOOLEAN NOT NULL DEFAULT false,
    `totalPaid` DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    `status` ENUM('PENDING_DEPOSIT', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `calendarId` VARCHAR(36) NULL,
    UNIQUE INDEX `Booking_eventId_key`(`eventId`),
    INDEX `Booking_organizerId_idx`(`organizerId`),
    INDEX `Booking_venueId_idx`(`venueId`),
    INDEX `Booking_calendarId_idx`(`calendarId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Document` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `eventId` VARCHAR(36) NULL,
    `purchaseId` VARCHAR(36) NULL,
    `bookingId` VARCHAR(36) NULL,
    `type` ENUM('ID', 'PROOF_OF_EMPLOYMENT', 'ORGANIZER_CERT', 'INVOICE', 'OTHER') NOT NULL DEFAULT 'ID',
    `filename` VARCHAR(255) NOT NULL,
    `mimetype` VARCHAR(100) NULL,
    `url` TEXT NULL,
    `content` LONGBLOB NULL,
    `size` INTEGER NULL,
    `eventName` VARCHAR(255) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(36) NULL,
    `deletedAt` DATETIME(3) NULL,
    `organizerProfileId` VARCHAR(36) NULL,
    INDEX `Document_purchaseId_type_idx`(`purchaseId`, `type`),
    INDEX `Document_bookingId_type_idx`(`bookingId`, `type`),
    INDEX `Document_userId_idx`(`userId`),
    INDEX `Document_eventId_idx`(`eventId`),
    INDEX `Document_organizerProfileId_idx`(`organizerProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Invoice` (
    `id` VARCHAR(36) NOT NULL,
    `purchaseId` VARCHAR(36) NULL,
    `bookingId` VARCHAR(36) NULL,
    `invoiceNo` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'ZAR',
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('PENDING', 'PAID', 'CANCELLED', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `venueIssuerId` VARCHAR(36) NOT NULL,
    UNIQUE INDEX `Invoice_purchaseId_key`(`purchaseId`),
    UNIQUE INDEX `Invoice_bookingId_key`(`bookingId`),
    UNIQUE INDEX `Invoice_invoiceNo_key`(`invoiceNo`),
    INDEX `Invoice_venueIssuerId_idx`(`venueIssuerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `VenueIssuer` (
    `id` VARCHAR(36) NOT NULL,
    `institutionName` VARCHAR(255) NOT NULL,
    `institutionAddress` JSON NOT NULL,
    `institutionLogoUrl` TEXT NULL,
    `institutionLogo` LONGBLOB NULL,
    `otherDetails` JSON NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Tool` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Tool_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TicketDefinition` (
    `id` VARCHAR(36) NOT NULL,
    `eventId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    UNIQUE INDEX `TicketDefinition_eventId_name_key`(`eventId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Registration` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `eventId` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `source` VARCHAR(255) NULL,
    `requestedTicket` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'ALLOCATED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    UNIQUE INDEX `Registration_userId_eventId_key`(`userId`, `eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Attendance` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `eventId` VARCHAR(36) NOT NULL,
    `status` ENUM('CHECKED_IN', 'CHECKED_OUT', 'ATTENDED', 'NO_SHOW') NOT NULL,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `Attendance_userId_eventId_key`(`userId`, `eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Ticket` (
    `id` VARCHAR(36) NOT NULL,
    `eventId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NULL,
    `registrationId` VARCHAR(36) NULL,
    `purchaseId` VARCHAR(36) NULL,
    `ticketDefinitionId` VARCHAR(36) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `qrcodeORurl` JSON NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `redeemed` BOOLEAN NOT NULL DEFAULT false,
    `redeemedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    UNIQUE INDEX `Ticket_registrationId_key`(`registrationId`),
    INDEX `Ticket_eventId_idx`(`eventId`),
    INDEX `Ticket_userId_idx`(`userId`),
    INDEX `Ticket_purchaseId_idx`(`purchaseId`),
    INDEX `Ticket_ticketDefinitionId_idx`(`ticketDefinitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LiquorRequest` (
    `id` VARCHAR(36) NOT NULL,
    `eventId` VARCHAR(36) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `policyAgreed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `approvalId` VARCHAR(36) NULL,
    UNIQUE INDEX `LiquorRequest_approvalId_key`(`approvalId`),
    INDEX `LiquorRequest_eventId_idx`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Approval` (
    `id` VARCHAR(36) NOT NULL,
    `targetType` VARCHAR(100) NOT NULL,
    `targetId` VARCHAR(36) NOT NULL,
    `type` ENUM('SAFETY', 'LIQUOR', 'NOISE', 'GENERAL', 'ORGANIZER_DOC', 'ATTENDEE_DOC') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `approverId` VARCHAR(36) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `organizerProfileId` VARCHAR(36) NULL,
    `eventId` VARCHAR(36) NULL,
    INDEX `Approval_approverId_idx`(`approverId`),
    INDEX `Approval_organizerProfileId_idx`(`organizerProfileId`),
    INDEX `Approval_eventId_idx`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Report` (
    `id` VARCHAR(36) NOT NULL,
    `eventId` VARCHAR(36) NOT NULL,
    `authorId` VARCHAR(36) NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `Report_eventId_idx`(`eventId`),
    INDEX `Report_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SystemSetting` (
    `id` VARCHAR(36) NOT NULL,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `SystemSetting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Calendar` (
    `id` VARCHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `startTime` VARCHAR(10) NOT NULL,
    `endTime` VARCHAR(10) NOT NULL,
    `venueIds` JSON NOT NULL,
    `createdById` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Calendar_createdById_idx`(`createdById`),
    UNIQUE INDEX `Calendar_date_startTime_endTime_key`(`date`, `startTime`, `endTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_ToolToVenue` (
    `A` VARCHAR(36) NOT NULL,
    `B` VARCHAR(36) NOT NULL,
    UNIQUE INDEX `_ToolToVenue_AB_unique`(`A`, `B`),
    INDEX `_ToolToVenue_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 3: Add all foreign keys

ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Session` ADD CONSTRAINT `Session_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AuthToken` ADD CONSTRAINT `AuthToken_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `OrganizerProfile` ADD CONSTRAINT `OrganizerProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `OrganizerProfile` ADD CONSTRAINT `OrganizerProfile_verifiedByAdminId_fkey` FOREIGN KEY (`verifiedByAdminId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Document` ADD CONSTRAINT `Document_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Document` ADD CONSTRAINT `Document_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Document` ADD CONSTRAINT `Document_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Document` ADD CONSTRAINT `Document_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Document` ADD CONSTRAINT `Document_organizerProfileId_fkey` FOREIGN KEY (`organizerProfileId`) REFERENCES `OrganizerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_organizerId_fkey` FOREIGN KEY (`organizerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_venueId_fkey` FOREIGN KEY (`venueId`) REFERENCES `Venue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_calendarId_fkey` FOREIGN KEY (`calendarId`) REFERENCES `Calendar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_venueIssuerId_fkey` FOREIGN KEY (`venueIssuerId`) REFERENCES `VenueIssuer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Event` ADD CONSTRAINT `Event_venueId_fkey` FOREIGN KEY (`venueId`) REFERENCES `Venue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Event` ADD CONSTRAINT `Event_organizerId_fkey` FOREIGN KEY (`organizerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Event` ADD CONSTRAINT `Event_themeId_fkey` FOREIGN KEY (`themeId`) REFERENCES `Theme`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `TicketDefinition` ADD CONSTRAINT `TicketDefinition_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_registrationId_fkey` FOREIGN KEY (`registrationId`) REFERENCES `Registration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_ticketDefinitionId_fkey` FOREIGN KEY (`ticketDefinitionId`) REFERENCES `TicketDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `LiquorRequest` ADD CONSTRAINT `LiquorRequest_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `LiquorRequest` ADD CONSTRAINT `LiquorRequest_approvalId_fkey` FOREIGN KEY (`approvalId`) REFERENCES `Approval`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Approval` ADD CONSTRAINT `Approval_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Approval` ADD CONSTRAINT `Approval_organizerProfileId_fkey` FOREIGN KEY (`organizerProfileId`) REFERENCES `OrganizerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Approval` ADD CONSTRAINT `Approval_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Report` ADD CONSTRAINT `Report_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Report` ADD CONSTRAINT `Report_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Calendar` ADD CONSTRAINT `Calendar_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `_ToolToVenue` ADD CONSTRAINT `_ToolToVenue_A_fkey` FOREIGN KEY (`A`) REFERENCES `Tool`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `_ToolToVenue` ADD CONSTRAINT `_ToolToVenue_B_fkey` FOREIGN KEY (`B`) REFERENCES `Venue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
