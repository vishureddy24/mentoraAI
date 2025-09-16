import { config } from 'dotenv';
config();

import '@/ai/flows/handle-chat-turn.ts';
import '@/ai/flows/safety-net-protocol.ts';
import '@/ai/flows/handle-user-choice.ts';
import '@/ai/flows/generate-puzzles.ts';
