// Test formatMeasurement function
const { formatMeasurement } = require('./hooks/useUnitPreference');

const testCases = [
  {
    name: "Range (2 to 3)",
    min: 2,
    max: 3,
    unit: "tablespoons"
  },
  {
    name: "Range (0.5 to 0.75)",
    min: 0.5,
    max: 0.75,
    unit: "teaspoon"
  },
  {
    name: "Single value",
    min: 1.5,
    max: 1.5,
    unit: "cups"
  },
  {
    name: "Range with same values",
    min: 2,
    max: 2,
    unit: "tablespoons"
  }
];

console.log('Testing formatMeasurement function:\n');

testCases.forEach(test => {
  const result = formatMeasurement(
    test.min,
    test.max,
    test.unit,
    null, null, null,  // metric values
    null, null, null,  // imperial values
    'original'
  );
  console.log(`${test.name}: "${result}"`);
});