// Basic test to ensure Jest is working
describe('Environment Setup', () => {
  test('should have Node.js environment', () => {
    expect(typeof process).toBe('object');
    expect(process.env).toBeDefined();
  });

  test('should be able to create mock functions', () => {
    const mockFn = () => 'mocked';
    expect(mockFn()).toBe('mocked');
  });

  test('should handle async operations', async () => {
    const asyncFn = async () => 'async result';
    const result = await asyncFn();
    expect(result).toBe('async result');
  });
});
