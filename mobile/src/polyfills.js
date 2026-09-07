require('react-native-url-polyfill/auto');

if (typeof Symbol.asyncIterator === 'undefined') {
  Object.defineProperty(Symbol, 'asyncIterator', {
    configurable: false,
    enumerable: false,
    value: Symbol.for('Symbol.asyncIterator'),
    writable: false,
  });
}

require('web-streams-polyfill');
