CREATE TABLE `kiosks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`location` varchar(255),
	`status` enum('online','offline','maintenance') NOT NULL DEFAULT 'offline',
	`lastActive` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kiosks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`barcode` varchar(128) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`weight` decimal(8,3),
	`category` varchar(128),
	`stock` int NOT NULL DEFAULT 0,
	`description` text,
	`imageUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_barcode_unique` UNIQUE(`barcode`)
);
--> statement-breakpoint
CREATE TABLE `transaction_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`productBarcode` varchar(128) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(10,2) NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transaction_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`totalAmount` decimal(12,2) NOT NULL,
	`paymentMethod` enum('cash','card','mpesa','stripe') NOT NULL,
	`paymentStatus` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`paymentReference` varchar(255),
	`kioskId` int,
	`cashierId` int,
	`itemCount` int NOT NULL DEFAULT 0,
	`receiptNumber` varchar(64),
	`notes` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_products_barcode` ON `products` (`barcode`);--> statement-breakpoint
CREATE INDEX `idx_products_category` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `idx_products_isActive` ON `products` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_transaction_items_transactionId` ON `transaction_items` (`transactionId`);--> statement-breakpoint
CREATE INDEX `idx_transaction_items_productId` ON `transaction_items` (`productId`);--> statement-breakpoint
CREATE INDEX `idx_transactions_paymentStatus` ON `transactions` (`paymentStatus`);--> statement-breakpoint
CREATE INDEX `idx_transactions_createdAt` ON `transactions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_transactions_kioskId` ON `transactions` (`kioskId`);--> statement-breakpoint
CREATE INDEX `idx_transactions_receiptNumber` ON `transactions` (`receiptNumber`);