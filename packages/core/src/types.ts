export type NewsroomPolicy = {
  version: number;
  categories: string[];
  maxSizeBytes: number;
  acceptsAttachments: boolean;
  retentionDays?: number;
};

export type Attachment = {
  name: string;
  mimeType: string;
  dataBase64Url: string;
};

export type Payload = {
  text: string;
  category: string;
  attachment?: Attachment;
};

export type Envelope = {
  version: number;
  newsroom: string;
  category: string;
  epoch: string;
  recipientKeys: string[]; // Chaves efêmeras por destinatário
  ephemeralPublicKey: string;
  ciphertext: Uint8Array;
  authTag: Uint8Array;
  contentHash: string;
};

export type Receipt = {
  receiptId: string;
  newsroom: string;
  epoch: string;
  entityKey: string;
  mailboxPrivateKey: string;
  salt: string;
  createdAt: string;
};

export type Part = {
  index: number;
  total: number;
  payload: Uint8Array;
  checksum: string;
};

export type Reply = {
  mailboxId: string;
  text: string;
  authorName?: string;
  timestamp: number;
};

export type Annotation = {
  status: "unread" | "in_review" | "investigating" | "archived";
  notes?: string;
  updatedAt: number;
};
