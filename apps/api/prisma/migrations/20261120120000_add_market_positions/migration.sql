-- Позиции на рынке (Промт 17, Часть B — ADR 0017).
--
-- BusinessLocation получает опциональные координаты демо-сетки
-- рынка: marketRow (ряд 1..4) и marketSpot (место 1..40).
-- Nullable: не каждая организация торгует на рынке (логистическая
-- компания позиции не имеет). Границы значений валидируются
-- DTO (константы MARKET в packages/types) — CHECK-ограничения
-- не накладываем, чтобы калибровка сетки не требовала миграции.

ALTER TABLE "BusinessLocation" ADD COLUMN "marketRow" INTEGER;
ALTER TABLE "BusinessLocation" ADD COLUMN "marketSpot" INTEGER;
