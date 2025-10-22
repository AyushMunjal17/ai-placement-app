const fs = require('fs').promises;
const path = require('path');

/**
 * Parse test case files and return structured test case data
 * @param {String} inputFilePath - Path to input file
 * @param {String} outputFilePath - Path to output file
 * @returns {Object} Test case object with input and expected output
 */
const parseTestCaseFiles = async (inputFilePath, outputFilePath) => {
  try {
    const input = await fs.readFile(inputFilePath, 'utf-8');
    const expectedOutput = await fs.readFile(outputFilePath, 'utf-8');
    
    return {
      input: input.trim(),
      expectedOutput: expectedOutput.trim(),
      isFileBased: true,
      fileSize: Buffer.byteLength(input, 'utf-8') + Buffer.byteLength(expectedOutput, 'utf-8')
    };
  } catch (error) {
    throw new Error(`Failed to read test case files: ${error.message}`);
  }
};

/**
 * Validate test case file format
 * @param {String} filePath - Path to file
 * @param {String} type - 'input' or 'output'
 * @returns {Boolean} True if valid
 */
const validateTestCaseFile = async (filePath, type) => {
  try {
    const stats = await fs.stat(filePath);
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (stats.size > maxSize) {
      throw new Error(`${type} file exceeds maximum size of 10MB`);
    }
    
    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.txt') {
      throw new Error(`${type} file must be a .txt file`);
    }
    
    // Check if file is readable
    await fs.access(filePath, fs.constants.R_OK);
    
    return true;
  } catch (error) {
    throw new Error(`Invalid ${type} file: ${error.message}`);
  }
};

/**
 * Compare actual output with expected output
 * @param {String} actualOutput - Output from code execution
 * @param {String} expectedOutput - Expected output from test case
 * @param {Boolean} strictMode - If true, exact match required. If false, ignore trailing whitespace
 * @returns {Object} Comparison result with passed status and details
 */
const compareOutputs = (actualOutput, expectedOutput, strictMode = false) => {
  const actual = strictMode ? actualOutput : actualOutput.trim();
  const expected = strictMode ? expectedOutput : expectedOutput.trim();
  
  const passed = actual === expected;
  
  return {
    passed,
    actualOutput: actual,
    expectedOutput: expected,
    difference: passed ? null : {
      actualLength: actual.length,
      expectedLength: expected.length,
      firstDifferenceAt: findFirstDifference(actual, expected)
    }
  };
};

/**
 * Find the first character position where two strings differ
 * @param {String} str1 - First string
 * @param {String} str2 - Second string
 * @returns {Number} Position of first difference, or -1 if strings are equal
 */
const findFirstDifference = (str1, str2) => {
  const minLength = Math.min(str1.length, str2.length);
  
  for (let i = 0; i < minLength; i++) {
    if (str1[i] !== str2[i]) {
      return i;
    }
  }
  
  // If one string is a prefix of the other
  if (str1.length !== str2.length) {
    return minLength;
  }
  
  return -1; // Strings are equal
};

/**
 * Format test case for display (truncate if too long)
 * @param {String} content - Test case content
 * @param {Number} maxLength - Maximum length to display
 * @returns {String} Formatted content
 */
const formatTestCaseForDisplay = (content, maxLength = 100) => {
  if (content.length <= maxLength) {
    return content;
  }
  
  return content.substring(0, maxLength) + '... (truncated)';
};

/**
 * Save test case to file
 * @param {String} content - Test case content
 * @param {String} filePath - Path to save file
 * @returns {Promise} Promise that resolves when file is saved
 */
const saveTestCaseToFile = async (content, filePath) => {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, content, 'utf-8');
    
    return filePath;
  } catch (error) {
    throw new Error(`Failed to save test case file: ${error.message}`);
  }
};

/**
 * Generate test case file name
 * @param {String} problemId - Problem ID
 * @param {Number} testCaseNumber - Test case number
 * @param {String} type - 'input' or 'output'
 * @returns {String} File name
 */
const generateTestCaseFileName = (problemId, testCaseNumber, type) => {
  const paddedNumber = String(testCaseNumber).padStart(2, '0');
  return `${problemId}_${type}${paddedNumber}.txt`;
};

/**
 * Batch process multiple test cases
 * @param {Array} testCases - Array of test case objects
 * @param {Function} executeCode - Function to execute code
 * @param {String} code - User's code
 * @param {Number} languageId - Language ID
 * @returns {Promise<Array>} Array of test results
 */
const batchProcessTestCases = async (testCases, executeCode, code, languageId) => {
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    try {
      const executionResult = await executeCode(code, languageId, testCase.input);
      
      const comparison = compareOutputs(
        executionResult.stdout || '',
        testCase.expectedOutput
      );
      
      results.push({
        testCaseNumber: i + 1,
        passed: comparison.passed && executionResult.status.id === 3,
        status: executionResult.status.description,
        input: formatTestCaseForDisplay(testCase.input),
        expectedOutput: formatTestCaseForDisplay(testCase.expectedOutput),
        actualOutput: formatTestCaseForDisplay(comparison.actualOutput),
        time: executionResult.time,
        memory: executionResult.memory,
        error: executionResult.stderr || executionResult.compile_output || null
      });
    } catch (error) {
      results.push({
        testCaseNumber: i + 1,
        passed: false,
        status: 'Error',
        error: error.message
      });
    }
  }
  
  return results;
};

module.exports = {
  parseTestCaseFiles,
  validateTestCaseFile,
  compareOutputs,
  findFirstDifference,
  formatTestCaseForDisplay,
  saveTestCaseToFile,
  generateTestCaseFileName,
  batchProcessTestCases
};
