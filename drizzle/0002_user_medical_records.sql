CREATE TABLE IF NOT EXISTS `user_medical_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_url` varchar(500) NOT NULL,
	`file_key` varchar(500) NOT NULL,
	`file_type` varchar(100) NOT NULL,
	`file_size` int,
	`category` enum('medical_report','lab_result','xray','prescription','other') NOT NULL DEFAULT 'other',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_medical_records_id` PRIMARY KEY(`id`)
);
