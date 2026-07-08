// ============================================================
// Safety Keywords Dictionary — 100+ Configurable Keywords
// ============================================================

import { SafetyCategory, SafetySeverity } from '@/types';

export const SAFETY_CATEGORIES: SafetyCategory[] = [
  {
    name: 'Dangerous Activities',
    severity: 'critical',
    keywords: [
      'bomb', 'explosive', 'detonator', 'gunpowder', 'weapon',
      'firearm', 'ammunition', 'grenade', 'missile', 'poison',
      'chemical weapon', 'biological weapon', 'nuclear weapon',
      'improvised explosive', 'molotov cocktail',
    ],
  },
  {
    name: 'Cyber Abuse',
    severity: 'critical',
    keywords: [
      'malware', 'ransomware', 'keylogger', 'phishing', 'exploit',
      'botnet', 'trojan', 'virus', 'credential theft', 'privilege escalation',
      'ddos attack', 'zero day', 'rootkit', 'spyware',
    ],
  },
  {
    name: 'Illegal Activity',
    severity: 'critical',
    keywords: [
      'drug trafficking', 'money laundering', 'identity theft',
      'fake passport', 'counterfeit currency', 'tax fraud', 'wire fraud',
      'credit card fraud', 'human trafficking', 'black market',
      'illegal drugs', 'smuggling',
    ],
  },
  {
    name: 'Violence',
    severity: 'critical',
    keywords: [
      'murder', 'assassination', 'torture', 'kidnapping', 'mass shooting',
      'terrorism', 'terrorist attack', 'sniper', 'hostage', 'genocide',
      'ethnic cleansing', 'war crime',
    ],
  },
  {
    name: 'Self Harm',
    severity: 'critical',
    keywords: [
      'suicide', 'self harm', 'overdose', 'cutting', 'hanging',
      'poison myself', 'kill myself', 'end my life', 'self injury',
      'suicide methods', 'how to die', 'want to die',
    ],
  },
  {
    name: 'Adult Content',
    severity: 'critical',
    keywords: [
      'explicit sexual content', 'child sexual content', 'sexual exploitation',
      'revenge porn', 'rape', 'incest', 'coercion', 'trafficking',
      'child abuse material', 'sexual abuse',
    ],
  },
  {
    name: 'Prompt Injection',
    severity: 'high',
    keywords: [
      'ignore previous instructions', 'reveal system prompt',
      'developer instructions', 'hidden prompt', 'jailbreak',
      'dan mode', 'unrestricted mode', 'bypass safety',
      'disable moderation', 'system override', 'ignore all rules',
      'pretend you have no restrictions', 'override safety',
    ],
  },
  {
    name: 'Data Exfiltration',
    severity: 'high',
    keywords: [
      'api key', 'secret key', 'access token', 'credentials',
      'password', 'private key', 'database dump', 'admin access',
      'hidden files', 'environment variables', 'ssh key',
      'encryption key',
    ],
  },
  {
    name: 'Harassment',
    severity: 'high',
    keywords: [
      'racial slurs', 'hate speech', 'discrimination',
      'extremist propaganda', 'violent ideology', 'harassment',
      'bullying', 'death threat', 'doxxing', 'swatting',
    ],
  },
  {
    name: 'Sensitive Personal Data',
    severity: 'medium',
    keywords: [
      'ssn', 'aadhaar', 'passport number', 'bank account',
      'credit card number', 'cvv', 'otp', 'medical records',
      'private information', 'social security', 'routing number',
    ],
  },
];

/**
 * Returns all keywords flattened into a single list.
 */
export function getAllKeywords(): string[] {
  return SAFETY_CATEGORIES.flatMap((c) => c.keywords);
}

/**
 * Returns keywords grouped by severity.
 */
export function getKeywordsBySeverity(severity: SafetySeverity): string[] {
  return SAFETY_CATEGORIES
    .filter((c) => c.severity === severity)
    .flatMap((c) => c.keywords);
}

/**
 * Total keyword count across all categories.
 */
export const TOTAL_KEYWORD_COUNT = SAFETY_CATEGORIES.reduce(
  (sum, cat) => sum + cat.keywords.length,
  0,
);
