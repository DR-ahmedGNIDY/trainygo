import { Schema, model, models, type Model } from "mongoose";

/**
 * Atomic sequence counters. Used for globally-sequential, gap-tolerant codes
 * such as client codes (TRG00001, TRG00002, ...).
 */
export interface ICounter {
  _id: string; // sequence name, e.g. "clientCode"
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Counter: Model<ICounter> =
  (models.Counter as Model<ICounter>) ||
  model<ICounter>("Counter", CounterSchema);

export default Counter;
