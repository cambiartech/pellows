/**
 * One booking turn, three inboxes.
 * WhatsApp, iMessage, and Google Messages (RCS) all render this.
 * The agent never imports a channel SDK.
 */

export type ChannelId = "whatsapp" | "imessage" | "rcs";

export type SheetRow = {
  /** Stable tap id, e.g. pick:1 */
  id: string;
  title: string;
  subtitle: string;
  price: string;
  imageUrl?: string;
};

export type GuestTurn = {
  text: string;
  sheet?: {
    header: string;
    rows: SheetRow[];
  };
  pay?: {
    label: string;
    url: string;
  };
  status?: {
    label: string;
    url: string;
  };
};

export type DeliverResult = {
  channel: ChannelId;
  dryRun: boolean;
  sent: string[];
};
