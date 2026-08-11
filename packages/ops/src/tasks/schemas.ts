import { z } from "zod";

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  done: z.boolean(),
  due: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskInput = z.object({
  title: z.string().min(1),
  due: z.string().optional(),
});

export const ListTasksInput = z.object({});

export const ListTasksOutput = z.object({
  tasks: z.array(TaskSchema),
});

export const GetTaskInput = z.object({
  id: z.string().min(1),
});

export const CompleteTaskInput = z.object({
  id: z.string().min(1),
});
