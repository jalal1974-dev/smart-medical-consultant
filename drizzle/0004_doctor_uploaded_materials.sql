-- Migration: Add doctor-uploaded manual materials columns to consultations table
-- These columns support the manual upload workflow where the doctor uploads
-- NotebookLM output, custom videos, podcasts, and other files.

ALTER TABLE `consultations`
  ADD COLUMN `doctorUploadedVideoUrl` varchar(500),
  ADD COLUMN `doctorUploadedVideoTitle` varchar(255),
  ADD COLUMN `doctorUploadedAudioUrl` varchar(500),
  ADD COLUMN `doctorUploadedAudioTitle` varchar(255),
  ADD COLUMN `doctorUploadedOtherUrl` varchar(500),
  ADD COLUMN `doctorUploadedOtherTitle` varchar(255),
  ADD COLUMN `doctorUploadedOtherMimeType` varchar(100),
  ADD COLUMN `sentVideoToPatient` boolean NOT NULL DEFAULT false,
  ADD COLUMN `sentAudioToPatient` boolean NOT NULL DEFAULT false,
  ADD COLUMN `sentOtherToPatient` boolean NOT NULL DEFAULT false;
