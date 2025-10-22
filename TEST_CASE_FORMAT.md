# Test Case Format Guide

## 📋 Overview
This document explains how to create and upload test cases for problems in the AI Placement Readiness System, similar to HackerEarth's format.

## 🎯 Test Case Types

### 1. **Sample Test Cases** (Visible to students)
- Used for understanding the problem
- Shown with explanations
- Students can see input, output, and explanation

### 2. **Hidden Test Cases** (For evaluation only)
- Used for final submission evaluation
- Not visible to students
- Tests edge cases and performance

## 📝 Test Case Format

### **Small Test Cases** (< 1KB)
For small test cases, you can directly paste the input and output in the problem creation form.

**Example: Two Sum Problem**

**Test Case 1:**
- **Input:**
  ```
  4 9
  2 7 11 15
  ```
- **Expected Output:**
  ```
  0 1
  ```
- **Explanation:** nums[0] + nums[1] = 2 + 7 = 9

### **Large Test Cases** (> 1KB, up to 10MB)
For large test cases (500-1000 lines), use file-based test cases.

## 📁 File-Based Test Case Format

### **Directory Structure:**
```
problem_name/
├── input/
│   ├── input00.txt
│   ├── input01.txt
│   ├── input02.txt
│   └── ...
└── output/
    ├── output00.txt
    ├── output01.txt
    ├── output02.txt
    └── ...
```

### **Naming Convention:**
- Input files: `input00.txt`, `input01.txt`, `input02.txt`, ...
- Output files: `output00.txt`, `output01.txt`, `output02.txt`, ...
- Numbers must match (input00.txt corresponds to output00.txt)
- Use leading zeros for proper sorting

### **File Content Rules:**

1. **Input File Format:**
   - First line: Number of test inputs (if applicable)
   - Following lines: Actual test data
   - Use newline (`\n`) to separate values
   - No trailing spaces or extra newlines

2. **Output File Format:**
   - Exact expected output
   - Match the output format specified in problem description
   - No trailing spaces or extra newlines
   - Case-sensitive

## 📊 Example: Array Sum Problem

### **Problem Statement:**
Given an array of N integers, find the sum of all elements.

**Input Format:**
```
First line: N (number of elements)
Second line: N space-separated integers
```

**Output Format:**
```
Single integer: sum of all elements
```

### **Sample Test Case (Small):**

**input00.txt:**
```
5
1 2 3 4 5
```

**output00.txt:**
```
15
```

### **Large Test Case (File-based):**

**input01.txt:**
```
1000
1 2 3 4 5 6 7 8 9 10 11 12 ... (1000 numbers)
```

**output01.txt:**
```
500500
```

## 🔧 Creating Test Cases

### **Step 1: Prepare Your Test Cases**
1. Write input data in a text file
2. Run your solution to generate expected output
3. Verify output is correct
4. Save as separate input/output files

### **Step 2: Validate Test Cases**
- Ensure input follows the problem's input format
- Verify output matches the problem's output format
- Test with your own solution first
- Check for edge cases:
  - Minimum input size
  - Maximum input size
  - Special characters
  - Boundary values

### **Step 3: Upload Test Cases**
1. Go to "Create Problem" page
2. For small test cases: Paste directly in the form
3. For large test cases: Upload input/output files
4. Mark test cases as "Sample" or "Hidden"

## ✅ Best Practices

### **1. Test Case Coverage:**
- **Basic Cases:** Simple inputs to verify basic logic
- **Edge Cases:** Minimum/maximum values, empty inputs
- **Corner Cases:** Special scenarios, boundary conditions
- **Performance Cases:** Large inputs to test efficiency

### **2. Test Case Distribution:**
- 2-3 sample test cases (visible)
- 5-10 hidden test cases (for evaluation)
- Include at least one large test case for performance

### **3. Input/Output Format:**
- Follow the exact format specified in problem description
- Be consistent across all test cases
- Use standard input/output (stdin/stdout)
- Avoid extra spaces or newlines

### **4. File Size Limits:**
- Input file: Max 10MB
- Output file: Max 10MB
- Total test cases: Max 20 per problem

## 🎓 Example: Two Sum Problem

### **Complete Test Case Set:**

**Sample Test Case 1 (Small):**
```
Input:
4 9
2 7 11 15

Output:
0 1

Explanation: nums[0] + nums[1] = 2 + 7 = 9
```

**Hidden Test Case 1 (Edge - No Solution):**
```
Input:
4 10
1 2 3 4

Output:
-1 -1
```

**Hidden Test Case 2 (Large - 1000 elements):**
```
Input:
1000 1999
1 2 3 4 5 ... 1000

Output:
998 999

(Because 999 + 1000 = 1999)
```

## 🚨 Common Mistakes to Avoid

1. ❌ **Trailing spaces in output files**
2. ❌ **Extra newlines at end of file**
3. ❌ **Inconsistent number formatting**
4. ❌ **Wrong file naming (input1.txt instead of input01.txt)**
5. ❌ **Mismatched input/output pairs**
6. ❌ **Not testing with your own solution first**

## 📚 Language-Specific Notes

### **Python:**
```python
# Reading input
n, target = map(int, input().split())
arr = list(map(int, input().split()))

# Writing output
print(result)  # Automatically adds newline
```

### **C++:**
```cpp
// Reading input
int n, target;
cin >> n >> target;
vector<int> arr(n);
for(int i = 0; i < n; i++) cin >> arr[i];

// Writing output
cout << result << endl;
```

### **Java:**
```java
// Reading input
Scanner sc = new Scanner(System.in);
int n = sc.nextInt();
int target = sc.nextInt();
int[] arr = new int[n];
for(int i = 0; i < n; i++) arr[i] = sc.nextInt();

// Writing output
System.out.println(result);
```

## 🔗 Resources

- [HackerEarth Test Case Format](https://www.hackerearth.com/)
- [LeetCode Test Case Examples](https://leetcode.com/)
- [Codeforces Problem Setting](https://codeforces.com/)

## 📞 Support

If you have questions about test case format, contact your instructor or refer to this guide.
