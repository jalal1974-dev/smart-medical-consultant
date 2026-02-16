import { ENV } from "./_core/env";

interface TranscriptionRequest {
  audioUrl: string;
  language?: string;
  prompt?: string;
}

interface TranscriptionResponse {
  text: string;
  language: string;
  duration?: number;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
}

export async function transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse> {
  const { audioUrl, language, prompt } = request;

  try {
    // Download the audio file from S3
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio file: ${audioResponse.statusText}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

    // Create form data for Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    
    if (language) {
      formData.append('language', language);
    }
    
    if (prompt) {
      formData.append('prompt', prompt);
    }

    // Call OpenAI Whisper API via Manus Forge API
    const response = await fetch(`${ENV.forgeApiUrl}/llm/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.forgeApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const result = await response.json();
    
    return {
      text: result.text,
      language: result.language || language || 'unknown',
      duration: result.duration,
      segments: result.segments,
    };
  } catch (error) {
    console.error('[VoiceTranscription] Error:', error);
    throw error;
  }
}
