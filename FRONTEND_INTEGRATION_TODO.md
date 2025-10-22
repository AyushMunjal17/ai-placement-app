# Frontend Integration TODO

## 🎯 What Needs to Be Updated in Frontend

To complete the test case feature, you need to update the frontend to display the new test case results.

## 📝 Files to Modify

### 1. **`frontend/src/pages/ProblemDetail.jsx`**

#### **Current "Run" Button Behavior:**
Shows only the output of the code.

#### **New "Run" Button Behavior:**
Should show:
- Overall verdict (Accepted/Failed)
- Number of test cases passed
- Individual test case results
- Expected vs actual output for each test case

#### **Code Changes Needed:**

**Update the API call to include `problemId`:**
```javascript
// Old
const response = await axios.post('/submissions/run', {
  code,
  language_id: languageId,
  stdin: customInput
});

// New
const response = await axios.post('/submissions/run', {
  code,
  language_id: languageId,
  problemId: problem._id,  // Add this
  stdin: customInput
});
```

**Update the result display:**
```javascript
// Old - Shows only output
<div>
  <h3>Output:</h3>
  <pre>{result.output}</pre>
</div>

// New - Shows test case results
<div>
  {result.verdict && (
    <div className={`verdict ${result.verdict === 'Accepted' ? 'success' : 'error'}`}>
      <h3>{result.verdict === 'Accepted' ? '✅' : '❌'} {result.verdict}</h3>
      <p>Test Cases Passed: {result.passedTestCases}/{result.totalTestCases}</p>
    </div>
  )}
  
  {result.testResults && result.testResults.map((test, index) => (
    <div key={index} className={`test-case ${test.passed ? 'passed' : 'failed'}`}>
      <h4>Test Case {test.testCaseNumber}: {test.passed ? '✅ Passed' : '❌ ' + test.status}</h4>
      
      <div className="test-details">
        <div>
          <strong>Input:</strong>
          <pre>{test.input}</pre>
        </div>
        
        <div>
          <strong>Expected Output:</strong>
          <pre>{test.expectedOutput}</pre>
        </div>
        
        <div>
          <strong>Your Output:</strong>
          <pre>{test.actualOutput}</pre>
        </div>
        
        {test.error && (
          <div className="error">
            <strong>Error:</strong>
            <pre>{test.error}</pre>
          </div>
        )}
        
        <div className="metrics">
          <span>Time: {test.time}s</span>
          <span>Memory: {test.memory}KB</span>
        </div>
      </div>
    </div>
  ))}
  
  {/* Fallback for custom input (no problemId) */}
  {result.output && !result.verdict && (
    <div>
      <h3>Output:</h3>
      <pre>{result.output}</pre>
    </div>
  )}
</div>
```

### 2. **`frontend/src/pages/CreateProblem.jsx`**

#### **Add File Upload for Large Test Cases:**

```javascript
// Add state for file-based test cases
const [testCaseFiles, setTestCaseFiles] = useState([]);

// Add file input handler
const handleTestCaseFileUpload = (e, type) => {
  const files = Array.from(e.target.files);
  // Process files and add to testCaseFiles state
};

// Add UI for file upload
<div className="file-upload-section">
  <h3>Large Test Cases (File Upload)</h3>
  <p>For test cases larger than 1KB, upload input/output files</p>
  
  <div className="file-inputs">
    <label>
      Input File (input00.txt):
      <input 
        type="file" 
        accept=".txt" 
        onChange={(e) => handleTestCaseFileUpload(e, 'input')}
      />
    </label>
    
    <label>
      Output File (output00.txt):
      <input 
        type="file" 
        accept=".txt" 
        onChange={(e) => handleTestCaseFileUpload(e, 'output')}
      />
    </label>
  </div>
  
  <button onClick={addFileBased TestCase}>Add File-Based Test Case</button>
</div>
```

### 3. **Add CSS Styles**

Create `frontend/src/styles/TestResults.css`:

```css
.verdict {
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.verdict.success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.verdict.error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.test-case {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
}

.test-case.passed {
  border-left: 4px solid #28a745;
}

.test-case.failed {
  border-left: 4px solid #dc3545;
}

.test-details {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.test-details pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

.metrics {
  display: flex;
  gap: 20px;
  font-size: 0.9em;
  color: #666;
}

.error {
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}
```

## 🚀 Quick Implementation Steps

### **Step 1: Update ProblemDetail.jsx**
1. Open `frontend/src/pages/ProblemDetail.jsx`
2. Find the "Run" button click handler
3. Add `problemId` to the API request
4. Update the result display component

### **Step 2: Test the Changes**
1. Start your backend: `npm run dev` (in backend folder)
2. Start your frontend: `npm run dev` (in frontend folder)
3. Navigate to a problem
4. Click "Run" and verify test results show correctly

### **Step 3: Add Styling**
1. Create CSS file for test results
2. Import in ProblemDetail.jsx
3. Test the visual appearance

### **Step 4: Deploy**
```bash
git add .
git commit -m "Added test case validation feature"
git push
```

## 📊 Expected Result

### **Before:**
```
Output:
0 1
```

### **After:**
```
✅ Accepted
Test Cases Passed: 2/2

Test Case 1: ✅ Passed
  Input: 4 9
         2 7 11 15
  Expected: 0 1
  Your Output: 0 1
  Time: 0.001s | Memory: 1024KB

Test Case 2: ✅ Passed
  Input: 4 6
         3 2 4
  Expected: 1 2
  Your Output: 1 2
  Time: 0.001s | Memory: 1024KB
```

## 🎯 Priority Tasks

1. ✅ **Backend is complete** (already done)
2. ⏳ **Frontend ProblemDetail.jsx** (needs update)
3. ⏳ **Frontend CreateProblem.jsx** (optional, for file upload)
4. ⏳ **CSS Styling** (for better UI)

## 📝 Notes

- Backend API is ready and working
- Frontend just needs to consume the new API response format
- File upload for test cases is optional (can be added later)
- Focus on displaying test results first

## 🔗 Related Files

- Backend: `backend/routes/submissions.js` (already updated)
- Frontend: `frontend/src/pages/ProblemDetail.jsx` (needs update)
- Styles: Create `frontend/src/styles/TestResults.css`

## 💡 Tips

1. Test with a simple problem first (like Two Sum)
2. Add console.log to see the API response structure
3. Style incrementally (functionality first, then styling)
4. Use the existing UI components from your app

Good luck with the frontend integration! 🚀
