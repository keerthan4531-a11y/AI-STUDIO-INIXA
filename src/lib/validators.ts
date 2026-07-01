import { z } from 'zod';

// Chat message schema
export const ChatSchema = z.object({
  message: z.string().optional(),
  messages: z.array(z.any()).optional(),
  model: z.string().optional(),
  stream: z.boolean().optional(),
}).refine(data => {
  const hasMessage = data.message && typeof data.message === 'string' && data.message.length > 0;
  const hasMessages = data.messages && Array.isArray(data.messages) && data.messages.length > 0;
  return hasMessage || hasMessages;
}, {
  message: "Either 'message' or 'messages' array must be provided",
});

// Image generation schema  
export const ImageSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty").max(2000, "Prompt too long"),
  model: z.string().optional(),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  seed: z.number().int().optional()
});

// Video generation schema
export const VideoSchema = z.object({
  prompt: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
  model: z.string().optional()
});

export type ChatInput = z.infer<typeof ChatSchema>;
export type ImageInput = z.infer<typeof ImageSchema>;
export type VideoInput = z.infer<typeof VideoSchema>;
