/**
 * Provider-agnostic email interface. Concrete providers (Gmail API, IMAP/SMTP)
 * implement this so the rest of the app never touches a vendor SDK directly.
 */
export interface EmailFolder {
  id: string;
  name: string;
  path: string;
  type: "system" | "user";
  specialUse: string | null;
  messageCount: number;
  unreadCount: number;
}

export interface ParsedMessage {
  providerMessageId: string;
  threadId: string;
  direction: "inbound" | "outbound";
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  snippet: string;
  sentAt: Date;
  isRead: boolean;
  isStarred: boolean;
  hasAttachment: boolean;
  attachments: ParsedAttachment[];
  authResults?: AuthResults | null;
  phishingScore?: number | null;
  references: string[];
  inReplyTo: string | null;
}

export interface ParsedAttachment {
  filename: string;
  mimeType: string;
  size: number;
  contentId: string | null;
}

export interface AuthResults {
  spf?: string;
  dkim?: string;
  dmarc?: string;
  summary: "pass" | "fail" | "warning" | "unknown";
}

export interface SyncResult {
  messages: ParsedMessage[];
  cursor?: string | null;
}

export interface EmailProvider {
  readonly type: "google" | "microsoft" | "imap";
  listFolders(): Promise<EmailFolder[]>;
  initialSync(daysBack: number): Promise<SyncResult>;
  deltaSync(cursor: string | null): Promise<SyncResult>;
  fetchMessage(messageId: string): Promise<ParsedMessage>;
  fetchAttachment(
    messageId: string,
    attachmentId: string,
  ): Promise<{ data: string; size: number }>;

  archive(threadId: string, messageIds: string[]): Promise<void>;
  trash(threadId: string, messageIds: string[]): Promise<void>;
  markRead(messageIds: string[], read: boolean): Promise<void>;
  star(messageIds: string[], starred: boolean): Promise<void>;
  spam(messageIds: string[], isSpam: boolean): Promise<void>;
  addLabel(threadId: string, label: string): Promise<void>;
  removeLabel(threadId: string, label: string): Promise<void>;

  sendMessage(raw: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    threadId?: string;
    inReplyTo?: string | null;
    attachments?: { filename: string; mimeType: string; data: string }[];
  }): Promise<{ messageId: string; threadId?: string }>;

  createDraft(raw: {
    to: string[];
    subject: string;
    bodyHtml: string;
    threadId?: string;
  }): Promise<{ draftId: string }>;

  testConnection(): Promise<boolean>;
  getProfile(): Promise<{ email: string; name?: string }>;
}