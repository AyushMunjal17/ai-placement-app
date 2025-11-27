# Complete Test Problem: 4 Sum

## Problem Details for Create Problem Form

### Basic Information

**Problem Title:**
```
4 Sum
```

**Difficulty:**
```
Medium
```

**Tags (comma-separated):**
```
array, two-pointers, hash-table, sorting
```

**Company Tags (comma-separated):**
```
Google, Amazon, Microsoft, Facebook
```

**Time Limit (seconds):**
```
2
```

**Memory Limit (MB):**
```
256
```

**Supported Languages:**
- ✅ Python 3
- ✅ C++
- ✅ Java
- ✅ JavaScript
- ✅ C

---

### Problem Description (Rich Text)
```
Given an array <strong>nums</strong> of <code>n</code> integers, return <em>an array of all the unique quadruplets</em> <code>[nums[a], nums[b], nums[c], nums[d]]</code> such that:

<ul>
  <li><code>0 &lt;= a, b, c, d &lt; n</code></li>
  <li><code>a</code>, <code>b</code>, <code>c</code>, and <code>d</code> are <strong>distinct</strong>.</li>
  <li><code>nums[a] + nums[b] + nums[c] + nums[d] == target</code></li>
</ul>

You may return the answer in <strong>any order</strong>.
```

---

### Input Format (Rich Text)
```
The first line contains an integer <code>n</code> (4 ≤ n ≤ 200), the size of the array.

The second line contains <code>n</code> space-separated integers representing the array <code>nums</code>.

The third line contains an integer <code>target</code>, the target sum.
```

---

### Output Format (Rich Text)
```
Print all unique quadruplets that sum to <code>target</code>. Each quadruplet should be printed on a separate line as four space-separated integers.

If no quadruplets exist, print <code>-1</code>.
```

---

### Constraints (Rich Text)
```
<ul>
  <li><code>1 &lt;= nums.length &lt;= 200</code></li>
  <li><code>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li>
  <li><code>-10<sup>9</sup> &lt;= target &lt;= 10<sup>9</sup></code></li>
</ul>
```

---

### Code Templates

**Python Template:**
```python
# STUDENT_CODE_START
def fourSum(nums, target):
    # Write your solution here
    # Return a list of lists, each containing 4 integers
    pass
# STUDENT_CODE_END

# Test harness (hidden from students, handled by system)
if __name__ == "__main__":
    import sys
    n = int(input())
    nums = list(map(int, input().split()))
    target = int(input())
    result = fourSum(nums, target)
    for quad in result:
        print(" ".join(map(str, quad)))
```

**C++ Template:**
```cpp
#include <vector>
#include <iostream>
#include <algorithm>
using namespace std;

// STUDENT_CODE_START
vector<vector<int>> fourSum(vector<int>& nums, int target) {
    // Write your solution here
    // Return a vector of vectors, each containing 4 integers
}
// STUDENT_CODE_END

// Test harness (hidden from students, handled by system)
int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }
    int target;
    cin >> target;
    vector<vector<int>> result = fourSum(nums, target);
    for (auto& quad : result) {
        for (int i = 0; i < quad.size(); i++) {
            if (i > 0) cout << " ";
            cout << quad[i];
        }
        cout << endl;
    }
    return 0;
}
```

**Java Template:**
```java
import java.util.*;

// STUDENT_CODE_START
class Solution {
    public List<List<Integer>> fourSum(int[] nums, int target) {
        // Write your solution here
        // Return a list of lists, each containing 4 integers
    }
}
// STUDENT_CODE_END

// Test harness (hidden from students, handled by system)
class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = sc.nextInt();
        }
        int target = sc.nextInt();
        Solution sol = new Solution();
        List<List<Integer>> result = sol.fourSum(nums, target);
        for (List<Integer> quad : result) {
            for (int i = 0; i < quad.size(); i++) {
                if (i > 0) System.out.print(" ");
                System.out.print(quad.get(i));
            }
            System.out.println();
        }
    }
}
```

**JavaScript Template:**
```javascript
// STUDENT_CODE_START
function fourSum(nums, target) {
    // Write your solution here
    // Return an array of arrays, each containing 4 integers
}
// STUDENT_CODE_END

// Test harness (hidden from students, handled by system)
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
let lines = [];
rl.on('line', (line) => {
    lines.push(line);
    if (lines.length === 3) {
        const n = parseInt(lines[0]);
        const nums = lines[1].split(' ').map(Number);
        const target = parseInt(lines[2]);
        const result = fourSum(nums, target);
        result.forEach(quad => {
            console.log(quad.join(' '));
        });
        rl.close();
    }
});
```

**C Template:**
```c
#include <stdio.h>
#include <stdlib.h>

// STUDENT_CODE_START
// Note: For C, you'll need to handle memory allocation
// Return a 2D array or use a different approach
int** fourSum(int* nums, int numsSize, int target, int* returnSize, int** returnColumnSizes) {
    // Write your solution here
}
// STUDENT_CODE_END

// Test harness (hidden from students, handled by system)
int main() {
    int n;
    scanf("%d", &n);
    int* nums = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) {
        scanf("%d", &nums[i]);
    }
    int target;
    scanf("%d", &target);
    // Handle function call and output
    return 0;
}
```

---

### Sample Test Cases

**Sample Test Case 1:**
- **Input:**
```
6
1 0 -1 0 -2 2
0
```

- **Expected Output:**
```
-2 -1 1 2
-2 0 0 2
-1 0 0 1
```

- **Explanation:**
```
The unique quadruplets that sum to 0 are:
- [-2, -1, 1, 2]
- [-2, 0, 0, 2]
- [-1, 0, 0, 1]
```

**Sample Test Case 2:**
- **Input:**
```
4
2 2 2 2
8
```

- **Expected Output:**
```
2 2 2 2
```

- **Explanation:**
```
The only quadruplet is [2, 2, 2, 2] which sums to 8.
```

**Sample Test Case 3:**
- **Input:**
```
5
1 2 3 4 5
20
```

- **Expected Output:**
```
-1
```

- **Explanation:**
```
No quadruplet exists that sums to 20.
```

---

### Hidden Test Cases Files

Create the following files for bulk upload:

**input_1.txt:**
```
5
1 2 3 4 5
10
```

**output_1.txt:**
```
-1
```

**input_2.txt:**
```
8
-1 0 1 2 -1 -4 0 0
0
```

**output_2.txt:**
```
-4 -1 1 4
-4 0 0 4
-1 -1 0 2
-1 0 0 1
```

**input_3.txt:**
```
6
0 0 0 0 0 0
0
```

**output_3.txt:**
```
0 0 0 0
```

**input_4.txt:**
```
10
-5 -4 -3 -2 -1 0 1 2 3 4
-8
```

**output_4.txt:**
```
-5 -4 1 0
-5 -3 0 0
-4 -4 0 0
-4 -3 -1 0
-3 -2 -2 -1
```

**input_5.txt:**
```
7
1000000000 1000000000 1000000000 1000000000 -1000000000 -1000000000 -1000000000
0
```

**output_5.txt:**
```
-1000000000 -1000000000 1000000000 1000000000
```

---

## Instructions for Testing:

1. **Fill in Basic Information:**
   - Enter "4 Sum" as title
   - Select "Medium" difficulty
   - Add tags and company tags as shown
   - Set time limit to 2 seconds, memory to 256 MB

2. **Select Supported Languages:**
   - Check all 5 languages (Python, JavaScript, Java, C++, C)

3. **Enter Rich Text Fields:**
   - Copy the HTML-formatted text for Description, Input Format, Output Format, and Constraints
   - Use the rich text editor to format properly

4. **Add Code Templates:**
   - Copy each language template into the respective template field
   - Make sure STUDENT_CODE_START and STUDENT_CODE_END markers are included

5. **Add Sample Test Cases:**
   - Add all 3 sample test cases with inputs, outputs, and explanations

6. **Upload Hidden Test Cases:**
   - Create the 5 input files (input_1.txt through input_5.txt)
   - Create the 5 output files (output_1.txt through output_5.txt)
   - Use the bulk upload feature to upload all 10 files at once
   - System should automatically pair input_1.txt with output_1.txt, etc.

7. **Preview and Publish:**
   - Click "Preview Problem" to see how it looks
   - Click "Confirm & Publish" to create the problem

This should test all features of the Create Problem form!

