import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Private 1:1 conversation between a coach and a client. A conversation is
 * uniquely identified by the (coach, client) pair.
 */
export interface IConversation {
  _id: Types.ObjectId;
  coach: Types.ObjectId;
  client: Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadForCoach: number;
  unreadForClient: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageAttachment {
  url: string;
  publicId?: string;
  type: "image" | "file";
  name?: string;
}

export interface IMessage {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  senderRole: "coach" | "client";
  text?: string;
  attachments: IMessageAttachment[];
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true },
    client: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
    unreadForCoach: { type: Number, default: 0 },
    unreadForClient: { type: Number, default: 0 },
  },
  { timestamps: true },
);

ConversationSchema.index({ coach: 1, client: 1 }, { unique: true });
ConversationSchema.index({ coach: 1, lastMessageAt: -1 });
ConversationSchema.index({ client: 1, lastMessageAt: -1 });

const AttachmentSchema = new Schema<IMessageAttachment>(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    type: { type: String, enum: ["image", "file"], default: "file" },
    name: { type: String },
  },
  { _id: false },
);

const MessageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["coach", "client"], required: true },
    text: { type: String },
    attachments: { type: [AttachmentSchema], default: [] },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

MessageSchema.index({ conversation: 1, createdAt: 1 });

export const Conversation: Model<IConversation> =
  (models.Conversation as Model<IConversation>) ||
  model<IConversation>("Conversation", ConversationSchema);

export const Message: Model<IMessage> =
  (models.Message as Model<IMessage>) ||
  model<IMessage>("Message", MessageSchema);
