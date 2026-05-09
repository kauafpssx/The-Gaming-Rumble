CREATE TABLE "games" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "drive" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "install_path" TEXT NOT NULL,
    "executable" TEXT NOT NULL,
    "banner" TEXT NOT NULL,
    "size_gb" REAL NOT NULL DEFAULT 0,
    "play_time_ms" BIGINT NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "games_drive_title_key" ON "games"("drive", "title");
CREATE INDEX "games_drive_title_idx" ON "games"("drive", "title");
