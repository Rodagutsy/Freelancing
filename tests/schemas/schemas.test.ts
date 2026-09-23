import { describe, expect, it } from "vitest";
import {
  outboundSendReportSchema,
  outboundReplySchema,
  prospectContactTypeSchema,
} from "@/lib/schemas/outreach";
import { auditCreateSchema, prospectCreateSchema } from "@/lib/schemas/audit";

const UUID = "3f2b1c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d";

describe("outboundSendReportSchema", () => {
  it("accepts a successful report", () => {
    const parsed = outboundSendReportSchema.safeParse({
      messageId: UUID,
      status: "sent",
      provider: "gmail",
      providerMessageId: "gmail-thread-1",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a failure report with an error", () => {
    const parsed = outboundSendReportSchema.safeParse({
      messageId: UUID,
      status: "failed",
      error: "SMTP 550",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a bad message id", () => {
    const parsed = outboundSendReportSchema.safeParse({
      messageId: "not-a-uuid",
      status: "sent",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown status", () => {
    const parsed = outboundSendReportSchema.safeParse({ messageId: UUID, status: "queued" });
    expect(parsed.success).toBe(false);
  });
});

describe("outboundReplySchema", () => {
  it("accepts a reply with a from address", () => {
    const parsed = outboundReplySchema.safeParse({
      outboundId: UUID,
      from: "client@example.com",
      body: "Can you start tomorrow?",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects when the from address is missing", () => {
    const parsed = outboundReplySchema.safeParse({ outboundId: UUID, body: "hi" });
    expect(parsed.success).toBe(false);
  });
});

describe("prospectContactTypeSchema", () => {
  it("accepts the known contact types", () => {
    for (const value of ["corporate", "sole_trader", "individual"]) {
      expect(prospectContactTypeSchema.safeParse(value).success).toBe(true);
    }
  });

  it("rejects unknown contact types", () => {
    expect(prospectContactTypeSchema.safeParse("agency").success).toBe(false);
  });
});

describe("auditCreateSchema", () => {
  it("accepts a public URL", () => {
    const parsed = auditCreateSchema.safeParse({ url: "https://example.com/" });
    expect(parsed.success).toBe(true);
  });

  it("rejects loopback and private addresses", () => {
    for (const url of [
      "http://localhost:3000/x",
      "http://127.0.0.1/x",
      "http://192.168.1.5/x",
      "http://10.0.0.2/x",
      "http://169.254.169.254/latest/meta-data/",
      "https://intranet.internal/",
    ]) {
      const parsed = auditCreateSchema.safeParse({ url });
      expect(parsed.success, url).toBe(false);
    }
  });

  it("rejects non-http protocols", () => {
    expect(auditCreateSchema.safeParse({ url: "ftp://example.com/" }).success).toBe(false);
  });
});

describe("prospectCreateSchema", () => {
  it("accepts minimal input", () => {
    const parsed = prospectCreateSchema.safeParse({ company_name: "Acme", website_url: null });
    expect(parsed.success).toBe(true);
  });

  it("accepts an empty contact email as unset", () => {
    const parsed = prospectCreateSchema.safeParse({
      company_name: "Acme",
      website_url: null,
      contact_email: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.contact_email).toBe("");
  });

  it("rejects an invalid contact email", () => {
    const parsed = prospectCreateSchema.safeParse({
      company_name: "Acme",
      contact_email: "not-an-email",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a missing company name", () => {
    expect(prospectCreateSchema.safeParse({}).success).toBe(false);
  });
});