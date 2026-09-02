import {describe, expect, it} from '@jest/globals';

import {redactLogValue} from '../src/observability/logger';

describe('log redaction', () => {
  it('redacts sensitive keys and bearer values recursively', () => {
    expect(
      redactLogValue({
        accessToken: 'secret',
        headers: {Authorization: 'Bearer abc.def.ghi'},
        message: 'failed with bearer visible-token',
        safe: 'visible',
      }),
    ).toEqual({
      accessToken: '[REDACTED]',
      headers: {Authorization: '[REDACTED]'},
      message: 'failed with Bearer [REDACTED]',
      safe: 'visible',
    });
  });
});
