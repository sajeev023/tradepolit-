-- Expand AssetClass enum to cover all 14 target markets.
-- PostgreSQL supports ADD VALUE to an existing enum — this is a safe,
-- additive, online operation that does not lock the table or rewrite
-- existing rows. New values can only be added at the end of the enum.

ALTER TYPE "AssetClass" ADD VALUE IF NOT EXISTS 'INDIAN_MARKET';
ALTER TYPE "AssetClass" ADD VALUE IF NOT EXISTS 'US_MARKET';
ALTER TYPE "AssetClass" ADD VALUE IF NOT EXISTS 'EUROPEAN_MARKET';
ALTER TYPE "AssetClass" ADD VALUE IF NOT EXISTS 'ASIAN_MARKET';
ALTER TYPE "AssetClass" ADD VALUE IF NOT EXISTS 'AUSTRALIAN_MARKET';
ALTER TYPE "AssetClass" ADD VALUE IF NOT EXISTS 'ETF';
ALTER TYPE "AssetClass" ADD VALUE IF NOT EXISTS 'OPTIONS';
ALTER TYPE "AssetClass" ADD VALUE IF NOT EXISTS 'FUTURES';
ALTER TYPE "AssetClass" ADD VALUE IF NOT EXISTS 'BONDS';
ALTER TYPE "AssetClass" ADD VALUE IF NOT EXISTS 'REIT';
ALTER TYPE "AssetClass" ADD VALUE IF NOT EXISTS 'MUTUAL_FUND';
