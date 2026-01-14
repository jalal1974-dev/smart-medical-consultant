CREATE TABLE `consultations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`patientName` varchar(255) NOT NULL,
	`patientEmail` varchar(320) NOT NULL,
	`patientPhone` varchar(50),
	`description` text NOT NULL,
	`language` enum('en','ar') NOT NULL,
	`status` enum('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
	`isFree` boolean NOT NULL DEFAULT false,
	`paymentStatus` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`paypalTransactionId` varchar(255),
	`amount` decimal(10,2),
	`scheduledAt` timestamp,
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consultations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mediaContent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('video','podcast') NOT NULL,
	`titleEn` varchar(500) NOT NULL,
	`titleAr` varchar(500) NOT NULL,
	`descriptionEn` text,
	`descriptionAr` text,
	`mediaUrl` text NOT NULL,
	`thumbnailUrl` text,
	`duration` int,
	`language` enum('en','ar','both') NOT NULL,
	`isPublished` boolean NOT NULL DEFAULT false,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mediaContent_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `hasUsedFreeConsultation` boolean DEFAULT false NOT NULL;