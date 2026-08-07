import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { CustomerInterestLevel } from '@recordhub/shared';

export type AIAnalysisDocument = AIAnalysis & Document;

@Schema({ timestamps: true })
export class AIAnalysis {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Call', required: true, unique: true })
  callId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  summaryShort: string;

  @Prop({ required: true })
  summaryDetailed: string;

  @Prop({ required: true })
  customerIntent: string;

  @Prop({ type: String, enum: CustomerInterestLevel, default: CustomerInterestLevel.MEDIUM })
  interestLevel: CustomerInterestLevel;

  @Prop({ type: [String], default: [] })
  programsDiscussed: string[];

  @Prop({ type: Array, default: [] })
  objections: any[];

  @Prop({ required: true })
  overallScore: number;

  @Prop({ type: Array, default: [] })
  rubricBreakdown: any[];

  @Prop({ type: [String], default: [] })
  coachingTips: string[];

  @Prop({ default: false })
  needsHumanReview: boolean;

  @Prop()
  managerScoreOverride: number;

  @Prop()
  overrideReason: string;
}

export const AIAnalysisSchema = SchemaFactory.createForClass(AIAnalysis);
