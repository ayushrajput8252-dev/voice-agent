// ============================================================
// Voice AI Assistant — Shared Type Definitions
// ============================================================

// ---- Application States ----

export enum AppState {
  Idle = 'idle',
  Listening = 'listening',
  Transcribing = 'transcribing',
  SafetyValidation = 'safety_validation',
  IntentClassification = 'intent_classification',
  ToolExecution = 'tool_execution',
  Searching = 'searching',
  Reasoning = 'reasoning',
  ResponseValidation = 'response_validation',
  AudioGeneration = 'audio_generation',
  AvatarGeneration = 'avatar_generation',
  Speaking = 'speaking',
  Complete = 'complete',
  Blocked = 'blocked',
  Error = 'error',
}

export interface StateConfig {
  label: string;
  color: string;
  glowColor: string;
  icon: string;
  animationPreset: 'pulse' | 'spin' | 'bounce' | 'shake' | 'wave' | 'expand' | 'none';
}

// ---- Messages ----

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ToolCallInfo {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  executionTimeMs?: number;
  validated: boolean;
  validationError?: string;
}

export interface SafetyInfo {
  passed: boolean;
  layersPassed: number;
  totalLayers: number;
  blockedAt?: string;
  reason?: string;
}

export interface MessageMetadata {
  model?: string;
  latencyMs?: number;
  toolsUsed?: string[];
  safety?: SafetyInfo;
  tokensUsed?: number;
}

export type AvatarStatus = 'idle' | 'generating' | 'ready' | 'error';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCalls?: ToolCallInfo[];
  metadata?: MessageMetadata;
  isStreaming?: boolean;
  avatarVideoUrl?: string;
  avatarStatus?: AvatarStatus;
  avatarTalkId?: string;
}

// ---- Safety ----

export type SafetySeverity = 'critical' | 'high' | 'medium';

export interface SafetyCategory {
  name: string;
  severity: SafetySeverity;
  keywords: string[];
}

export type SafetyLayerName =
  | 'keyword_detection'
  | 'prompt_injection'
  | 'jailbreak_detection'
  | 'gemini_safety'
  | 'response_validation';

export interface SafetyLayerResult {
  layer: SafetyLayerName;
  layerNumber: number;
  passed: boolean;
  reason?: string;
  matchedPatterns?: string[];
  confidence?: number;
}

export type SafetyPipelineResult =
  | { status: 'safe'; layers: SafetyLayerResult[] }
  | { status: 'blocked'; layers: SafetyLayerResult[]; blockedAt: SafetyLayerName; reason: string }
  | { status: 'needs_clarification'; reason: string; question: string; layers: SafetyLayerResult[] };

// ---- Query Validation ----

export type QueryValidationStatus =
  | 'safe'
  | 'unsafe'
  | 'ambiguous'
  | 'missing_info'
  | 'needs_clarification';

export interface QueryValidationResult {
  status: QueryValidationStatus;
  reason: string;
  clarificationQuestion?: string;
}

// ---- Intent Classification ----

export type IntentCategory =
  | 'general_knowledge'
  | 'tool_use'
  | 'conversation'
  | 'creative'
  | 'clarification'
  | 'greeting';

export interface IntentClassificationResult {
  intent: IntentCategory;
  confidence: number;
  suggestedTools?: string[];
  reasoning?: string;
}

// ---- Response Validation ----

export interface ResponseValidationResult {
  approved: boolean;
  factualConsistency: boolean;
  hallucinationDetected: boolean;
  toolResultAlignment: boolean;
  safetyCompliance: boolean;
  issues?: string[];
}

// ---- Tool Definitions ----

export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, ToolParameter>;
    required: string[];
  };
}

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTimeMs: number;
  timestamp: number;
}

// ---- SSE Events ----

export type SSEEventType =
  | 'state_change'
  | 'content'
  | 'tool_call'
  | 'tool_result'
  | 'metadata'
  | 'clarification'
  | 'error'
  | 'complete'
  | 'avatar_started'
  | 'avatar_ready';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: number;
}

export interface StateChangeEvent {
  state: AppState;
  label: string;
}

export interface ContentEvent {
  chunk: string;
  accumulated: string;
}

export interface ToolCallEvent {
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolResultEvent {
  toolName: string;
  result: unknown;
  validated: boolean;
  executionTimeMs: number;
}

export interface MetadataEvent {
  model: string;
  latencyMs: number;
  toolsUsed: string[];
  safety: SafetyInfo;
}

export interface ClarificationEvent {
  question: string;
  reason: string;
}

export interface ErrorEvent {
  message: string;
  code?: string;
}

export interface CompleteEvent {
  fullResponse: string;
  metadata: MetadataEvent;
  responseValidation: ResponseValidationResult;
}

// ---- Chat Request/Response ----

export interface ChatRequest {
  message: string;
  conversationHistory: Array<{ role: string; content: string }>;
}

// ---- Audio ----

export interface AudioAnalyzerData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  volume: number;
}
