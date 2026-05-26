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

const { AI_PROMPTS } = require('../functions/index.js').__testing;

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
    ];

    test('has exactly 21 keys', () => {
        expect(Object.keys(AI_PROMPTS).sort()).toEqual(EXPECTED_KEYS.sort());
    });

    describe.each(EXPECTED_KEYS)('tool: %s', (toolId) => {
        test('has gemini-3.1-pro-preview model', () => {
            expect(AI_PROMPTS[toolId].model).toBe('gemini-3.1-pro-preview');
        });
        test('build is a function', () => {
            expect(typeof AI_PROMPTS[toolId].build).toBe('function');
        });
        test('build interpolates input into prompt', () => {
            const prompt = AI_PROMPTS[toolId].build('TEST_INPUT_42', {});
            expect(prompt).toContain('TEST_INPUT_42');
            expect(prompt.length).toBeGreaterThan(50);
        });
    });
});
