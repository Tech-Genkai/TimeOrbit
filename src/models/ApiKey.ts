import mongoose, { Schema, Document, Model } from 'mongoose';
import { ApiKeyStatus } from '@/types';

export interface IApiKeyDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  useCase?: string;
  keyPrefix: string;
  keyHash: string;
  lastFour: string;
  status: ApiKeyStatus;
  rateLimit: number;
  burstCapacity?: number;
  bucketTokens?: number;
  bucketLastRefill?: Date;
  rejectionReason?: string;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKeyDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    useCase: {
      type: String,
      trim: true,
      default: '',
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastFour: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revoked'],
      default: 'pending',
      index: true,
    },
    rateLimit: {
      type: Number,
      default: 60,
    },
    burstCapacity: {
      type: Number,
    },
    bucketTokens: {
      type: Number,
    },
    bucketLastRefill: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for user listings and admin queries
ApiKeySchema.index({ userId: 1, createdAt: -1 });
ApiKeySchema.index({ status: 1, createdAt: -1 });

export const ApiKey: Model<IApiKeyDocument> =
  mongoose.models.ApiKey || mongoose.model<IApiKeyDocument>('ApiKey', ApiKeySchema);
