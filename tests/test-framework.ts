import assert from 'node:assert/strict';
export { describe, it, before, after } from 'node:test';

export function expect(actual: any) {
  return {
    toBe: (expected: any) => assert.strictEqual(actual, expected),
    toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
    toContain: (expected: any) => {
      if (typeof actual === 'string') {
        assert.ok(
          actual.includes(expected),
          `Expected "${actual}" to contain "${expected}"`
        );
      } else if (Array.isArray(actual)) {
        assert.ok(
          actual.includes(expected),
          `Expected array to contain ${expected}`
        );
      }
    },
    not: {
      toContain: (expected: any) => {
        if (typeof actual === 'string') {
          assert.ok(
            !actual.includes(expected),
            `Expected "${actual}" not to contain "${expected}"`
          );
        } else if (Array.isArray(actual)) {
          assert.ok(
            !actual.includes(expected),
            `Expected array not to contain ${expected}`
          );
        }
      },
      toBe: (expected: any) => assert.notStrictEqual(actual, expected),
    },
    toBeDefined: () => assert.notStrictEqual(actual, undefined),
    toBeUndefined: () => assert.strictEqual(actual, undefined),
    toHaveLength: (len: number) => assert.strictEqual(actual.length, len),
    rejects: {
      toThrow: async (errType?: any) => {
        let threw = false;
        try {
          await actual;
        } catch (e: any) {
          threw = true;
          if (errType) {
            assert.ok(
              e instanceof errType || e.name === errType.name,
              `Expected error of type ${errType.name}`
            );
          }
        }
        assert.ok(threw, 'Expected promise to reject');
      },
    },
  };
}
