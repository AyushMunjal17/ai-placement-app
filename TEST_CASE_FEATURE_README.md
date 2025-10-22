# 🎯 Test Case Feature - Quick Start Guide

## What's New?

Your AI Placement App now has a **professional test case system** similar to HackerEarth! 🚀

## ✨ Key Features

### 1. **File-Based Test Cases**
- Upload large test cases (up to 10MB)
- Support for 500-1000 line test cases
- Efficient storage and processing

### 2. **Automatic Verdict System**
- ✅ **Accepted** - All test cases passed
- ❌ **Failed** - One or more test cases failed
- Shows exactly which test cases passed/failed

### 3. **Detailed Test Results**
When you click "Run", you now see:
```
Verdict: Failed
Test Cases Passed: 3/5

Test Case 1: ✅ Passed
  Input: 4 9\n2 7 11 15
  Expected: 0 1
  Actual: 0 1
  Time: 0.001s | Memory: 1024KB

Test Case 2: ❌ Wrong Answer
  Input: 4 10\n1 2 3 4
  Expected: -1 -1
  Actual: 0 0
  Time: 0.001s | Memory: 1024KB
```

## 🚀 How to Use

### **For Teachers (Creating Problems):**

1. **Create a new problem** as usual
2. **Add Sample Test Cases** (visible to students):
   ```
   Input: 4 9
   2 7 11 15
   
   Output: 0 1
   
   Explanation: nums[0] + nums[1] = 2 + 7 = 9
   ```

3. **Add Hidden Test Cases** (for evaluation):
   - Small test cases: Paste directly
   - Large test cases: Upload files

4. **For Large Test Cases:**
   - Create `input00.txt` with your input data
   - Create `output00.txt` with expected output
   - Upload both files
   - System will automatically pair them

### **For Students (Solving Problems):**

1. **Read the problem**
2. **Write your solution**
3. **Click "Run"** to test against sample test cases
4. **See results:**
   - Overall verdict (Accepted/Failed)
   - Which test cases passed/failed
   - Expected vs actual output
   - Performance metrics

5. **Click "Submit"** when all sample tests pass
   - Runs against hidden test cases too
   - Final verdict determines your score

## 📝 Test Case Format

### **Input Format Example (Two Sum):**
```
4 9
2 7 11 15
```
Line 1: Array size and target
Line 2: Array elements

### **Output Format:**
```
0 1
```
Indices of the two numbers

### **Large Test Case Example:**
```
1000 1999
1 2 3 4 5 6 ... (1000 numbers)
```

## 🔧 API Usage

### **Run Code with Test Cases:**
```javascript
POST /api/submissions/run
{
  "code": "your code here",
  "language_id": 71,  // Python
  "problemId": "problem_id_here"
}

Response:
{
  "verdict": "Accepted",
  "totalTestCases": 5,
  "passedTestCases": 5,
  "testResults": [...]
}
```

### **Run Code with Custom Input (No Test Cases):**
```javascript
POST /api/submissions/run
{
  "code": "your code here",
  "language_id": 71,
  "stdin": "custom input"
}

Response:
{
  "output": "program output",
  "status": "Accepted",
  "time": "0.001",
  "memory": 1024
}
```

## 📊 Example: Two Sum Problem

### **Problem Setup:**

**Sample Test Case 1:**
```
Input: 4 9
       2 7 11 15
Output: 0 1
```

**Sample Test Case 2:**
```
Input: 4 6
       3 2 4
Output: 1 2
```

**Hidden Test Case 1 (Large):**
```
Input: 1000 1999
       1 2 3 4 5 ... 1000
Output: 998 999
```

### **Student Solution:**
```python
def two_sum(nums, target):
    num_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return [-1, -1]

# Read input
n, target = map(int, input().split())
nums = list(map(int, input().split()))

# Solve and print
result = two_sum(nums, target)
print(result[0], result[1])
```

### **When Student Clicks "Run":**
```
✅ Verdict: Accepted
📊 Test Cases Passed: 2/2

Test Case 1: ✅ Passed
  Time: 0.001s | Memory: 1024KB

Test Case 2: ✅ Passed
  Time: 0.001s | Memory: 1024KB
```

### **When Student Clicks "Submit":**
```
✅ Verdict: Accepted
📊 Test Cases Passed: 3/3 (including hidden)

All test cases passed! 🎉
```

## 🎓 Benefits

### **For Teachers:**
- ✅ Create realistic test cases (like real coding platforms)
- ✅ Test edge cases with large inputs
- ✅ Automatic grading based on test results
- ✅ Easy to update test cases

### **For Students:**
- ✅ Clear feedback on what's wrong
- ✅ Learn from failed test cases
- ✅ Understand edge cases
- ✅ Practice like real interviews

## 📚 Documentation

- **`TEST_CASE_FORMAT.md`** - Detailed format guide
- **`IMPLEMENTATION_SUMMARY.md`** - Technical details
- **`backend/utils/testCaseHandler.js`** - Utility functions

## 🐛 Troubleshooting

### **Issue: Test case always fails**
- Check output format (spaces, newlines)
- Verify expected output is correct
- Test with your own solution first

### **Issue: Large test case timeout**
- Check time limit (default: 2 seconds)
- Optimize your algorithm
- Consider time complexity

### **Issue: Wrong answer on hidden test cases**
- Test edge cases: empty input, max values
- Check boundary conditions
- Verify algorithm correctness

## 🎉 Summary

Your app now has:
1. ✅ Professional test case system
2. ✅ Accept/Reject verdicts
3. ✅ Detailed test results
4. ✅ Support for large test cases
5. ✅ HackerEarth-like experience

**Ready to show your teacher!** 🚀

## 📞 Next Steps

1. Test the new feature with a sample problem
2. Create a few problems with test cases
3. Demo to your teacher
4. Get feedback and iterate

Good luck with your presentation! 🎓
