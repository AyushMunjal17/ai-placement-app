/**
 * Seed script: 5 array-focused problems
 * Run: node seeds/arrayProblems.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI;

// ─── Code Templates ──────────────────────────────────────────────────────────

const templates = (fnSignatures) => ({
    cpp: `#include <bits/stdc++.h>
using namespace std;

// STUDENT_CODE_START
${fnSignatures.cpp}
// STUDENT_CODE_END

int main() {
${fnSignatures.cppMain}
    return 0;
}`,

    python: `import sys
input = sys.stdin.readline

# STUDENT_CODE_START
${fnSignatures.python}
# STUDENT_CODE_END

${fnSignatures.pythonMain}`,

    java: `import java.util.*;

public class Main {

// STUDENT_CODE_START
${fnSignatures.java}
// STUDENT_CODE_END

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
${fnSignatures.javaMain}
    }
}`,

    c: `#include <stdio.h>
#include <stdlib.h>

// STUDENT_CODE_START
${fnSignatures.c}
// STUDENT_CODE_END

int main() {
${fnSignatures.cMain}
    return 0;
}`,
});

// ─── Problems ─────────────────────────────────────────────────────────────────

const problems = [
    // ── 1. Sort Array ──────────────────────────────────────────────────────────
    {
        title: 'Sort an Array',
        description: `Given an array of **N** integers, sort the array in **non-decreasing order** and print the sorted array.

**Example:**
- Input: \`5 3 1 4 1 5\`  
- Output: \`1 1 3 4 5\``,
        inputFormat: `Line 1: Integer N (size of the array)
Line 2: N space-separated integers`,
        outputFormat: `Print N space-separated integers in non-decreasing order on a single line.`,
        constraints: `1 ≤ N ≤ 10^5
-10^9 ≤ arr[i] ≤ 10^9`,
        difficulty: 'Easy',
        tags: ['Arrays', 'Sorting'],
        companyTags: ['Amazon', 'Microsoft', 'Google'],
        timeLimit: 2,
        memoryLimit: 256,
        sampleTestCases: [
            {
                input: '5\n3 1 4 1 5',
                expectedOutput: '1 1 3 4 5',
                explanation: 'Sorted in non-decreasing order.',
            },
            {
                input: '4\n-3 0 2 -1',
                expectedOutput: '-3 -1 0 2',
                explanation: 'Negative numbers sorted correctly.',
            },
        ],
        hiddenTestCases: [
            { input: '1\n42', expectedOutput: '42' },
            { input: '6\n10 9 8 7 6 5', expectedOutput: '5 6 7 8 9 10' },
            { input: '7\n-5 3 -1 0 2 -4 1', expectedOutput: '-5 -4 -1 0 1 2 3' },
        ],
        codeTemplates: templates({
            cpp: `void sortArray(vector<int>& arr) {
    // Write your solution here
    
}`,
            cppMain: `    int n; cin >> n;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    sortArray(arr);
    for (int i = 0; i < n; i++) cout << arr[i] << " \\n"[i == n-1];`,
            python: `def sort_array(arr):
    # Write your solution here
    pass`,
            pythonMain: `n = int(input())
arr = list(map(int, input().split()))
sort_array(arr)
print(*arr)`,
            java: `    static void sortArray(int[] arr) {
        // Write your solution here
        
    }`,
            javaMain: `        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        sortArray(arr);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(arr[i]).append(i < n-1 ? " " : "\\n");
        System.out.print(sb);`,
            c: `void sortArray(int* arr, int n) {
    // Write your solution here
    
}`,
            cMain: `    int n; scanf("%d", &n);
    int arr[n];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    sortArray(arr, n);
    for (int i = 0; i < n; i++) printf("%d%c", arr[i], i < n-1 ? ' ' : '\\n');`,
        }),
    },

    // ── 2. Find Missing Number ──────────────────────────────────────────────────
    {
        title: 'Find Missing Number',
        description: `You are given an array containing **N-1** distinct integers in the range **[1, N]**. Exactly one number is missing. Find and return the missing number.

**Example:**
- Input: N=6, array = \`1 2 4 5 6\`  
- Output: \`3\``,
        inputFormat: `Line 1: Integer N (the range is 1 to N, array has N-1 elements)
Line 2: N-1 space-separated integers`,
        outputFormat: `Print the single missing integer.`,
        constraints: `2 ≤ N ≤ 10^6
All elements are distinct and in range [1, N]`,
        difficulty: 'Easy',
        tags: ['Arrays', 'Math', 'Bit Manipulation'],
        companyTags: ['Amazon', 'Facebook', 'Adobe'],
        timeLimit: 2,
        memoryLimit: 256,
        sampleTestCases: [
            {
                input: '6\n1 2 4 5 6',
                expectedOutput: '3',
                explanation: 'Numbers 1-6 with 3 missing.',
            },
            {
                input: '5\n2 3 4 5',
                expectedOutput: '1',
                explanation: '1 is missing from the range [1,5].',
            },
        ],
        hiddenTestCases: [
            { input: '3\n1 3', expectedOutput: '2' },
            { input: '7\n1 2 3 5 6 7', expectedOutput: '4' },
            { input: '10\n1 2 3 4 5 6 7 8 10', expectedOutput: '9' },
        ],
        codeTemplates: templates({
            cpp: `int findMissing(vector<int>& arr, int n) {
    // Write your solution here
    return -1;
}`,
            cppMain: `    int n; cin >> n;
    vector<int> arr(n-1);
    for (int i = 0; i < n-1; i++) cin >> arr[i];
    cout << findMissing(arr, n) << endl;`,
            python: `def find_missing(arr, n):
    # Write your solution here
    return -1`,
            pythonMain: `n = int(input())
arr = list(map(int, input().split()))
print(find_missing(arr, n))`,
            java: `    static int findMissing(int[] arr, int n) {
        // Write your solution here
        return -1;
    }`,
            javaMain: `        int n = sc.nextInt();
        int[] arr = new int[n-1];
        for (int i = 0; i < n-1; i++) arr[i] = sc.nextInt();
        System.out.println(findMissing(arr, n));`,
            c: `int findMissing(int* arr, int size, int n) {
    // Write your solution here
    return -1;
}`,
            cMain: `    int n; scanf("%d", &n);
    int arr[n-1];
    for (int i = 0; i < n-1; i++) scanf("%d", &arr[i]);
    printf("%d\\n", findMissing(arr, n-1, n));`,
        }),
    },

    // ── 3. Rotate Array ────────────────────────────────────────────────────────
    {
        title: 'Rotate Array',
        description: `Given an array of **N** integers and a number **K**, rotate the array to the **right** by K positions.

**Example:**
- Array: \`1 2 3 4 5\`, K = 2  
- Output: \`4 5 1 2 3\`

Rotating right by 1: \`5 1 2 3 4\`  
Rotating right by 2: \`4 5 1 2 3\``,
        inputFormat: `Line 1: Two integers N and K (size and rotation count)
Line 2: N space-separated integers`,
        outputFormat: `Print N space-separated integers after rotating right by K positions.`,
        constraints: `1 ≤ N ≤ 10^5
0 ≤ K ≤ 10^9`,
        difficulty: 'Medium',
        tags: ['Arrays', 'Two Pointers'],
        companyTags: ['Microsoft', 'Amazon', 'Goldman Sachs'],
        timeLimit: 2,
        memoryLimit: 256,
        sampleTestCases: [
            {
                input: '5 2\n1 2 3 4 5',
                expectedOutput: '4 5 1 2 3',
                explanation: 'Right rotate by 2.',
            },
            {
                input: '4 4\n10 20 30 40',
                expectedOutput: '10 20 30 40',
                explanation: 'Rotating by N results in the original array.',
            },
        ],
        hiddenTestCases: [
            { input: '3 1\n1 2 3', expectedOutput: '3 1 2' },
            { input: '6 3\n1 2 3 4 5 6', expectedOutput: '4 5 6 1 2 3' },
            { input: '5 7\n1 2 3 4 5', expectedOutput: '4 5 1 2 3' },
        ],
        codeTemplates: templates({
            cpp: `void rotateArray(vector<int>& arr, int k) {
    // Write your solution here
    
}`,
            cppMain: `    int n, k; cin >> n >> k;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    rotateArray(arr, k);
    for (int i = 0; i < n; i++) cout << arr[i] << " \\n"[i == n-1];`,
            python: `def rotate_array(arr, k):
    # Write your solution here
    pass`,
            pythonMain: `n, k = map(int, input().split())
arr = list(map(int, input().split()))
rotate_array(arr, k)
print(*arr)`,
            java: `    static void rotateArray(int[] arr, int k) {
        // Write your solution here
        
    }`,
            javaMain: `        int n = sc.nextInt(), k = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        rotateArray(arr, k);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(arr[i]).append(i < n-1 ? " " : "\\n");
        System.out.print(sb);`,
            c: `void rotateArray(int* arr, int n, int k) {
    // Write your solution here
    
}`,
            cMain: `    int n, k; scanf("%d %d", &n, &k);
    int arr[n];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    rotateArray(arr, n, k);
    for (int i = 0; i < n; i++) printf("%d%c", arr[i], i < n-1 ? ' ' : '\\n');`,
        }),
    },

    // ── 4. Maximum Product Subarray ────────────────────────────────────────────
    {
        title: 'Maximum Product Subarray',
        description: `Given an integer array of **N** numbers, find the **contiguous subarray** (containing at least one number) which has the **largest product**, and return its product.

**Example:**
- Array: \`2 3 -2 4\`  
- Output: \`6\` (subarray \`[2,3]\`)`,
        inputFormat: `Line 1: Integer N
Line 2: N space-separated integers`,
        outputFormat: `Print the maximum product of a contiguous subarray.`,
        constraints: `1 ≤ N ≤ 2 × 10^4
-10 ≤ arr[i] ≤ 10`,
        difficulty: 'Medium',
        tags: ['Arrays', 'Dynamic Programming'],
        companyTags: ['Amazon', 'Google', 'Adobe'],
        timeLimit: 2,
        memoryLimit: 256,
        sampleTestCases: [
            {
                input: '4\n2 3 -2 4',
                expectedOutput: '6',
                explanation: '[2,3] has the largest product = 6.',
            },
            {
                input: '3\n-2 0 -1',
                expectedOutput: '0',
                explanation: 'No positive product > 0, so answer is 0.',
            },
        ],
        hiddenTestCases: [
            { input: '1\n-3', expectedOutput: '-3' },
            { input: '5\n-2 3 -4 5 -1', expectedOutput: '120' },
            { input: '6\n2 3 -2 4 -1 2', expectedOutput: '48' },
            { input: '4\n0 2 -1 3', expectedOutput: '3' },
        ],
        codeTemplates: templates({
            cpp: `int maxProduct(vector<int>& arr) {
    // Write your solution here
    return 0;
}`,
            cppMain: `    int n; cin >> n;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    cout << maxProduct(arr) << endl;`,
            python: `def max_product(arr):
    # Write your solution here
    return 0`,
            pythonMain: `n = int(input())
arr = list(map(int, input().split()))
print(max_product(arr))`,
            java: `    static int maxProduct(int[] arr) {
        // Write your solution here
        return 0;
    }`,
            javaMain: `        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        System.out.println(maxProduct(arr));`,
            c: `int maxProduct(int* arr, int n) {
    // Write your solution here
    return 0;
}`,
            cMain: `    int n; scanf("%d", &n);
    int arr[n];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    printf("%d\\n", maxProduct(arr, n));`,
        }),
    },

    // ── 5. Trapping Rain Water ──────────────────────────────────────────────────
    {
        title: 'Trapping Rain Water',
        description: `Given **N** non-negative integers representing the height of bars in an elevation map where each bar has width 1, compute how much water can be trapped after raining.

**Example:**
\`\`\`
Height: 0 1 0 2 1 0 1 3 2 1 2 1
Water trapped: 6
\`\`\``,
        inputFormat: `Line 1: Integer N
Line 2: N space-separated non-negative integers (heights)`,
        outputFormat: `Print the total number of units of water that can be trapped.`,
        constraints: `1 ≤ N ≤ 3 × 10^4
0 ≤ height[i] ≤ 10^5`,
        difficulty: 'Hard',
        tags: ['Arrays', 'Two Pointers', 'Stack'],
        companyTags: ['Amazon', 'Google', 'Microsoft', 'Goldman Sachs'],
        timeLimit: 2,
        memoryLimit: 256,
        sampleTestCases: [
            {
                input: '12\n0 1 0 2 1 0 1 3 2 1 2 1',
                expectedOutput: '6',
                explanation: '6 units of rain water are trapped.',
            },
            {
                input: '6\n4 2 0 3 2 5',
                expectedOutput: '9',
                explanation: '9 units of rain water are trapped.',
            },
        ],
        hiddenTestCases: [
            { input: '1\n5', expectedOutput: '0' },
            { input: '4\n3 0 2 0', expectedOutput: '3' },
            { input: '8\n0 3 0 2 0 4 0 1', expectedOutput: '10' },
            { input: '5\n1 2 3 4 5', expectedOutput: '0' },
        ],
        codeTemplates: templates({
            cpp: `int trap(vector<int>& height) {
    // Write your solution here
    return 0;
}`,
            cppMain: `    int n; cin >> n;
    vector<int> h(n);
    for (int i = 0; i < n; i++) cin >> h[i];
    cout << trap(h) << endl;`,
            python: `def trap(height):
    # Write your solution here
    return 0`,
            pythonMain: `n = int(input())
height = list(map(int, input().split()))
print(trap(height))`,
            java: `    static int trap(int[] height) {
        // Write your solution here
        return 0;
    }`,
            javaMain: `        int n = sc.nextInt();
        int[] h = new int[n];
        for (int i = 0; i < n; i++) h[i] = sc.nextInt();
        System.out.println(trap(h));`,
            c: `int trap(int* height, int n) {
    // Write your solution here
    return 0;
}`,
            cMain: `    int n; scanf("%d", &n);
    int h[n];
    for (int i = 0; i < n; i++) scanf("%d", &h[i]);
    printf("%d\\n", trap(h, n));`,
        }),
    },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Use the first user as publisher
    const User = require('../models/User');
    const publisher = await User.findOne({});
    if (!publisher) {
        console.error('No users found. Please create a user first.');
        process.exit(1);
    }
    console.log(`Publishing as: ${publisher.username} (${publisher._id})`);

    const col = mongoose.connection.collection('problems');
    let created = 0;

    for (const p of problems) {
        const slug = p.title
            .toLowerCase()
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .trim() + '-' + Date.now();

        const doc = {
            ...p,
            slug,
            publishedBy: publisher._id,
            publisherName: publisher.username,
            supportedLanguages: ['c', 'cpp', 'java', 'python'],
            isPublic: true,
            isActive: true,
            totalSubmissions: 0,
            acceptedSubmissions: 0,
            editorial: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Fix sub-schemas: add _id:false handled by insertMany implicitly
        doc.sampleTestCases = doc.sampleTestCases.map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            explanation: tc.explanation || '',
            inputFile: '',
            outputFile: '',
            isFileBased: false,
            fileSize: 0,
        }));
        doc.hiddenTestCases = doc.hiddenTestCases.map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            inputFile: '',
            outputFile: '',
            isFileBased: false,
            fileSize: 0,
        }));

        try {
            await col.insertOne(doc);
            console.log(`Created: ${p.title}`);
            created++;
        } catch (err) {
            console.error(`Failed [${p.title}]: ${err.message}`);
        }

        // small delay to ensure unique Date.now() slugs
        await new Promise(r => setTimeout(r, 5));
    }

    console.log(`\nDone! ${created}/${problems.length} problems created.`);
    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed error:', err.message);
    process.exit(1);
});

