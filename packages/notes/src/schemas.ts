import { z } from "zod";

export const NotesSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  body: z.string().optional(),
  createdAt: z.string(),
});

export type Notes = z.infer<typeof NotesSchema>;

export const CreateNotesInput = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
});

export const ListNotesInput = z.object({});

export const ListNotesOutput = z.object({
  items: z.array(NotesSchema),
});

export const GetNotesInput = z.object({
  id: z.string().min(1),
});
