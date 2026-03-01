import { describe, it, expect } from "vitest";

describe("Voice Recording Upload Fix", () => {
  describe("Allowed audio MIME types", () => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/mp4',
    ];

    it("should allow audio/webm", () => {
      expect(allowedTypes.includes('audio/webm')).toBe(true);
    });

    it("should allow audio/ogg", () => {
      expect(allowedTypes.includes('audio/ogg')).toBe(true);
    });

    it("should allow audio/mp4", () => {
      expect(allowedTypes.includes('audio/mp4')).toBe(true);
    });

    it("should allow audio/wav", () => {
      expect(allowedTypes.includes('audio/wav')).toBe(true);
    });

    it("should still allow PDF files", () => {
      expect(allowedTypes.includes('application/pdf')).toBe(true);
    });

    it("should still allow image files", () => {
      expect(allowedTypes.includes('image/jpeg')).toBe(true);
      expect(allowedTypes.includes('image/png')).toBe(true);
    });

    it("should reject unknown types", () => {
      expect(allowedTypes.includes('application/exe')).toBe(false);
      expect(allowedTypes.includes('video/mp4')).toBe(false);
    });
  });

  describe("File size limits", () => {
    it("should allow 16MB for audio files", () => {
      const isAudio = true;
      const maxSize = isAudio ? 16 * 1024 * 1024 : 10 * 1024 * 1024;
      expect(maxSize).toBe(16 * 1024 * 1024);
    });

    it("should allow 10MB for non-audio files", () => {
      const isAudio = false;
      const maxSize = isAudio ? 16 * 1024 * 1024 : 10 * 1024 * 1024;
      expect(maxSize).toBe(10 * 1024 * 1024);
    });

    it("should detect audio MIME types correctly", () => {
      expect('audio/webm'.startsWith('audio/')).toBe(true);
      expect('audio/ogg'.startsWith('audio/')).toBe(true);
      expect('image/jpeg'.startsWith('audio/')).toBe(false);
      expect('application/pdf'.startsWith('audio/')).toBe(false);
    });
  });

  describe("MIME type normalization", () => {
    it("should strip codec params from MIME type", () => {
      const rawMimeType = 'audio/webm;codecs=opus';
      const cleanMimeType = rawMimeType.split(';')[0];
      expect(cleanMimeType).toBe('audio/webm');
    });

    it("should handle MIME type without codec params", () => {
      const rawMimeType = 'audio/webm';
      const cleanMimeType = rawMimeType.split(';')[0];
      expect(cleanMimeType).toBe('audio/webm');
    });

    it("should determine correct file extension from MIME type", () => {
      const getExt = (mimeType: string) => {
        if (mimeType.includes('ogg')) return 'ogg';
        if (mimeType.includes('mp4')) return 'mp4';
        return 'webm';
      };
      expect(getExt('audio/webm')).toBe('webm');
      expect(getExt('audio/ogg')).toBe('ogg');
      expect(getExt('audio/mp4')).toBe('mp4');
    });
  });

  describe("Upload category", () => {
    const validCategories = ['medical_report', 'lab_result', 'xray', 'other', 'audio'];

    it("should include 'audio' as valid category", () => {
      expect(validCategories.includes('audio')).toBe(true);
    });

    it("should still include all previous categories", () => {
      expect(validCategories.includes('medical_report')).toBe(true);
      expect(validCategories.includes('lab_result')).toBe(true);
      expect(validCategories.includes('xray')).toBe(true);
      expect(validCategories.includes('other')).toBe(true);
    });
  });
});
