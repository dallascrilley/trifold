export type ScaffoldOptions = {
  /** kebab-case product id, e.g. "notes" */
  slug: string;
  /** Human title, e.g. "Notes" */
  title?: string;
  /** Repository root to write into */
  root: string;
  /** When true, do not write; return planned files only */
  dryRun?: boolean;
};

export type PlannedFile = {
  /** Path relative to root */
  path: string;
  content: string;
};

export type ScaffoldResult = {
  slug: string;
  title: string;
  resource: string;
  files: PlannedFile[];
  written: string[];
};
