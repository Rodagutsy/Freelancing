import { z } from "zod";

export const uuidSchema = z.string().uuid("Must be a valid UUID");

export const nonEmptyText = z.string().trim().min(1, "Required");

export const textArraySchema = z
  .array(z.string().trim().min(1))
  .max(50)
  .default([]);

export const urlListSchema = z
  .array(z.string().trim().url("Must be a valid URL"))
  .max(20)
  .default([]);

/** URL field that tolerates an empty string from forms and stores null. */
export const optionalUrlSchema = z.preprocess(
  (value) => {
    const str = typeof value === "string" ? value.trim() : value;
    return str === "" ? null : str;
  },
  z.string().url("Enter a valid URL (including https://)").max(1000).nullable(),
);

export const watchedCompanyCreateSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  url: z.string().trim().url("Enter a valid careers URL").max(2000),
  region: z.enum(["us", "eu"]).optional(),
});