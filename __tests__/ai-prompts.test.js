process.env.NODE_ENV = 'test';

// Mock firebase deps to prevent initializeApp side effects
jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    firestore: jest.fn(() => ({ collection: jest.fn() })),
}));
jest.mock('firebase-functions/v1', () => ({
    https: { onRequest: jest.fn() },
    runWith: jest.fn(() => ({ https: { onRequest: jest.fn() } })),
    config: jest.fn(() => ({})),
    pubsub: {
        schedule: jest.fn(() => ({
            timeZone: jest.fn(() => ({
                onRun: jest.fn(),
            })),
        })),
    },
}));

const { AI_PROMPTS, GEMINI_MODEL_PRO, GEMINI_MODEL_FLASH, GEMINI_MODEL_LITE } = require('../functions/index.js').__testing;

describe('AI_PROMPTS dispatch table', () => {
    const EXPECTED_KEYS = [
        'summarizer',
        'email-writer',
        'bio-generator',
        'product-description',
        'code-explainer',
        'meta-description',
        'ai-detector',
        'hardship-letter',
        'appeal-letter',
        'custody-document',
        'caregiver-report',
        'budget-planner',
        'resume-bullets',
        'tweet-generator',
        'paraphraser',
        'linkedin-post',
        'cold-email',
        'job-description',
        'press-release',
        'seo-title',
        'voice-writer',
        'child-support-calculator',
        'spousal-support-calculator',
        'med-administration-log',
        'behavioral-log',
    ];

    // Calculator tools are param-driven (they build from structured params, not a
    // free-text input), so they don't echo the raw input string like the others.
    const PARAM_DRIVEN_KEYS = ['child-support-calculator', 'spousal-support-calculator'];

    // Tiered model strategy: Pro for accuracy-critical legal/financial/medical tools,
    // Flash for general copywriting, Lite for short/formulaic/high-volume outputs.
    const VALID_MODELS = [GEMINI_MODEL_PRO, GEMINI_MODEL_FLASH, GEMINI_MODEL_LITE];

    test('has exactly 25 keys', () => {
        expect(Object.keys(AI_PROMPTS).sort()).toEqual(EXPECTED_KEYS.sort());
    });

    describe.each(EXPECTED_KEYS)('tool: %s', (toolId) => {
        test('has a valid tiered Gemini model', () => {
            expect(VALID_MODELS).toContain(AI_PROMPTS[toolId].model);
        });
        test('build is a function', () => {
            expect(typeof AI_PROMPTS[toolId].build).toBe('function');
        });
        test('build interpolates input into prompt', () => {
            const prompt = AI_PROMPTS[toolId].build('TEST_INPUT_42', {});
            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(50);
            // Input-driven tools echo the raw input; param-driven calculators use structured params.
            if (!PARAM_DRIVEN_KEYS.includes(toolId)) {
                expect(prompt).toContain('TEST_INPUT_42');
            }
        });
    });
});
