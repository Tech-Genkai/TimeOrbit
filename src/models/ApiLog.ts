import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApiLogDocument extends Document {
  apiKeyId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress?: string;
  createdAt: Date;
}

const ApiLogSchema = new Schema<IApiLogDocument>(
  {
    apiKeyId: {
      type: Schema.Types.ObjectId,
      ref: 'ApiKey',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    responseTimeMs: {
      type: Number,
      required: true,
    },
    ipAddress: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// High-performance compound indexes for rolling window rate limiting & telemetry queries
ApiLogSchema.index({ apiKeyId: 1, createdAt: -1 });
ApiLogSchema.index({ userId: 1, createdAt: -1 });

export const ApiLog: Model<IApiLogDocument> =
  mongoose.models.ApiLog || mongoose.model<IApiLogDocument>('ApiLog', ApiLogSchema);
