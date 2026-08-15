-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "StatusUjian" AS ENUM ('belum_mulai', 'sedang_berlangsung', 'di_pause', 'selesai');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bidang" (
    "id" TEXT NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "deskripsi" TEXT,
    "durasi_ujian" INTEGER NOT NULL,
    "created_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bidang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materi" (
    "id" TEXT NOT NULL,
    "bidang_id" TEXT NOT NULL,
    "judul" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soal" (
    "id" TEXT NOT NULL,
    "bidang_id" TEXT NOT NULL,
    "soal_text" TEXT NOT NULL,
    "pilihan_a" VARCHAR(500) NOT NULL,
    "pilihan_b" VARCHAR(500) NOT NULL,
    "pilihan_c" VARCHAR(500) NOT NULL,
    "pilihan_d" VARCHAR(500) NOT NULL,
    "pilihan_e" VARCHAR(500) NOT NULL,
    "jawaban_benar" CHAR(1) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "soal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ujian" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bidang_id" TEXT NOT NULL,
    "waktu_mulai" TIMESTAMP(3),
    "waktu_selesai" TIMESTAMP(3),
    "skor" INTEGER NOT NULL DEFAULT 0,
    "percobaan_ke" INTEGER NOT NULL DEFAULT 1,
    "status" "StatusUjian" NOT NULL DEFAULT 'belum_mulai',
    "is_paused_by_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ujian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_pindah_tab" (
    "id" TEXT NOT NULL,
    "ujian_id" TEXT NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_pindah_tab_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ujian_user_id_bidang_id_percobaan_ke_key" ON "ujian"("user_id", "bidang_id", "percobaan_ke");

-- AddForeignKey
ALTER TABLE "bidang" ADD CONSTRAINT "bidang_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materi" ADD CONSTRAINT "materi_bidang_id_fkey" FOREIGN KEY ("bidang_id") REFERENCES "bidang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soal" ADD CONSTRAINT "soal_bidang_id_fkey" FOREIGN KEY ("bidang_id") REFERENCES "bidang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ujian" ADD CONSTRAINT "ujian_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ujian" ADD CONSTRAINT "ujian_bidang_id_fkey" FOREIGN KEY ("bidang_id") REFERENCES "bidang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_pindah_tab" ADD CONSTRAINT "log_pindah_tab_ujian_id_fkey" FOREIGN KEY ("ujian_id") REFERENCES "ujian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
