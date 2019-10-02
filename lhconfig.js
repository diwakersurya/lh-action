module.exports = {
  extends: 'lighthouse:default',
  maxWaitForFcp:40000,
  settings: {
    onlyAudits: [
      'first-meaningful-paint',
      'speed-index-metric',
      'estimated-input-latency',
      'first-interactive',
      'consistently-interactive',
    ],
  },
};