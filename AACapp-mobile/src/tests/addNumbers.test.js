const addNumbers = require('../addNumbers');

describe('Math Operations', () => {
  test('adds numbers correctly', () => {
    expect(addNumbers(2, 3)).toBe(5);
  });
});
