# AI Placement App Architecture and Working Guide

## Overview
The AI Placement App is a full-stack LeetCode-style coding platform with advanced judge capabilities, constraint enforcement, and admin problem creation tools. It supports multiple programming languages, structured test case evaluation, and per-problem judge settings.

---

## High-Level Architecture

### Frontend (React)
- **Framework**: React with modern hooks and state management
- **UI Components**: Custom UI library with shadcn/ui components
- **Routing**: React Router for navigation
- **State Management**: Local component state with React hooks
- **Rich Text**: ReactQuill for problem descriptions
- **Styling**: TailwindCSS with custom components

### Backend (Node.js/Express)
- **Framework**: Express.js with RESTful APIs
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication middleware
- **Code Execution**: Piston API for sandboxed code execution
- **Judge Logic**: Custom normalization and comparison utilities

### Database Schema (MongoDB)
- **Users**: Authentication and user profiles
- **Problems**: Problem statements, test cases, judge settings, constraints
- **Submissions**: Code submissions with execution results

---

## Core Components and Flow

### 1. Problem Creation Workflow
```
Admin (CreateProblem.jsx) → Backend API (/api/problems) → Database (Problem Schema)
```

#### Frontend: `CreateProblem.jsx`
- **Form Management**: Comprehensive form with sections for:
  - Basic problem info (title, description, difficulty)
  - Input/output format specifications
  - Constraints and limits
  - Code templates per language
  - Sample and hidden test cases
  - **Judge Settings** (NEW): Output type, order sensitivity, deduplication, empty output allowance, float tolerance
  - **Constraint Groups** (NEW): small/medium/large for test cases

- **Key Features**:
  - Real-time validation
  - Rich text editor for descriptions
  - Bulk test case upload
  - Language-specific code templates
  - Judge configuration panel

#### Backend: `Problem.js` Model
```javascript
judgeSettings: {
  outputType: { enum: ['single', 'list', 'listOfLists'] },
  outerOrderSensitive: { type: Boolean },
  innerOrderSensitive: { type: Boolean },
  deduplicate: { type: Boolean },
  allowEmptyOutput: { type: Boolean },
  floatTolerance: { type: Number }
}

// Test cases now include constraint groups
sampleTestCases: [{
  input: String,
  expectedOutput: String,
  constraintGroup: { enum: ['small', 'medium', 'large'] },
  // ... other fields
}]
```

### 2. Code Submission and Judging Workflow
```
User Code → Backend API (/api/submissions/run or /submit) → Judge Logic → Piston API → Result Processing → Response
```

#### Submission Routes: `submissions.js`

##### `/api/submissions/run` (Practice Mode)
- Runs code against **sample test cases only**
- Uses per-problem judge settings for comparison
- Enforces time/memory limits via Piston API
- Returns detailed results with constraint group information

##### `/api/submissions/submit` (Official Submission)
- Runs code against **all test cases** (sample + hidden)
- Same judge logic and constraint enforcement
- Records submission in database
- Returns final verdict (Accepted/Wrong Answer/etc.)

#### Judge Logic: `judgeUtils.js`
**Core Functions**:
- `sanitizeJudgeSettings()`: Validates and normalizes judge settings
- `compareOutputsWithSettings()`: Advanced output comparison
- `normalizeOutput()`: Structural normalization based on output type
- `compareWithFloatTolerance()`: Floating-point comparison with epsilon

**Comparison Features**:
- **Output Types**: single value, list, list of lists
- **Order Sensitivity**: Configurable for outer and inner arrays
- **Deduplication**: Remove duplicates before comparison
- **Empty Output**: Allow/disallow empty outputs
- **Float Tolerance**: Epsilon-based floating-point comparison
- **Structural Comparison**: JSON parsing and array normalization

#### Constraint Enforcement: `submissions.js`
**Execution Limits**:
```javascript
const buildExecutionLimits = (problem) => ({
  run_timeout: Math.round(problem.timeLimit * 1000), // Convert to ms
  compile_timeout: Math.round(problem.timeLimit * 2000),
  run_memory_limit: problem.memoryLimit * 1024 * 1024, // Convert to bytes
  compile_memory_limit: problem.memoryLimit * 1024 * 1024
});
```

**Test Case Ordering**:
```javascript
const CONSTRAINT_GROUP_ORDER = { small: 0, medium: 1, large: 2 };
// Test cases execute in order: small → medium → large
```

### 3. Code Execution: Piston API Integration
```javascript
const executeCode = async (code, languageId, stdin, limits) => {
  const response = await axios.post(`${PISTON_API_URL}/execute`, {
    language: LANGUAGE_MAP[languageId],
    version: '*',
    files: [{ content: code }],
    stdin,
    ...limits // run_timeout, run_memory_limit, etc.
  });
  // Process response and map to internal format
};
```

**Supported Languages**:
- C (`c`)
- C++ (`cpp`)
- Java (`java`)
- Python (`python`)
- JavaScript (`javascript`)

---

## Data Flow Examples

### Example 1: Creating a Problem with Custom Judge Settings
```javascript
// Frontend sends:
{
  title: "Two Sum",
  description: "...",
  judgeSettings: {
    outputType: "list",
    outerOrderSensitive: false,
    innerOrderSensitive: true,
    deduplicate: true,
    allowEmptyOutput: false,
    floatTolerance: 0
  },
  sampleTestCases: [{
    input: "[2,7,11,15]\n9",
    expectedOutput: "[0,1]",
    constraintGroup: "small"
  }],
  timeLimit: 1,
  memoryLimit: 128
}

// Backend stores in MongoDB with sanitized judge settings
```

### Example 2: Code Submission with Advanced Comparison
```javascript
// User submits Python code for Two Sum problem
// Expected output: "[0,1]"
// Actual output: "[1,0]"

// Judge logic:
1. Parse both as JSON arrays
2. Apply order sensitivity (outerOrderSensitive: false)
3. Sort outer arrays: [0,1] vs [0,1]
4. Compare: EQUAL → PASSED
```

### Example 3: Constraint-Based Test Execution
```javascript
// Test cases executed in order:
[
  { constraintGroup: "small", input: "simple case" },
  { constraintGroup: "small", input: "another simple" },
  { constraintGroup: "medium", input: "moderate complexity" },
  { constraintGroup: "large", input: "worst case scenario" }
]
// Each test case gets problem's time/memory limits enforced
```

---

## Key Features and Capabilities

### Judge System Features
✅ **Output Type Support**: Single values, lists, lists of lists
✅ **Order Control**: Independent outer/inner order sensitivity
✅ **Deduplication**: Remove duplicate elements before comparison
✅ **Empty Output Handling**: Configurable allowance of empty outputs
✅ **Float Tolerance**: Epsilon-based floating-point comparison
✅ **Structural Comparison**: JSON parsing and array normalization
✅ **Constraint Enforcement**: Per-problem time/memory limits
✅ **Test Case Grouping**: small/medium/large with ordered execution

### Admin Features
✅ **Rich Problem Editor**: ReactQuill for formatted descriptions
✅ **Code Templates**: Language-specific function signatures
✅ **Bulk Test Upload**: TXT file import for test cases
✅ **Judge Configuration**: Visual settings panel for judge behavior
✅ **Constraint Assignment**: Group test cases by complexity
✅ **Real-time Validation**: Form validation and error handling

### User Features
✅ **Multi-language Support**: C, C++, Java, Python, JavaScript
✅ **Practice Mode**: Run against sample tests with detailed feedback
✅ **Official Submission**: Full evaluation with hidden tests
✅ **Execution Feedback**: Detailed error messages and comparison results
✅ **Performance Metrics**: Time and memory usage tracking

---

## Security and Isolation

### Code Execution Security
- **Sandboxed Execution**: Piston API provides isolated execution environment
- **Resource Limits**: Enforced per-problem time and memory constraints
- **No File System Access**: Code execution has no access to host filesystem
- **Network Isolation**: Executed code cannot make network requests

### Authentication and Authorization
- **JWT Tokens**: Secure authentication with expiration
- **Role-based Access**: Admin vs user role separation
- **API Protection**: All submission routes require authentication

---

## Deployment Architecture

### Development Environment
```
Frontend (React Dev Server) :3000
Backend (Express Server)    :5000
Database (MongoDB)          :27017
External API (Piston)       :443
```

### Production Considerations
- **Frontend**: Static files served by CDN or web server
- **Backend**: Node.js cluster with load balancing
- **Database**: MongoDB replica set for high availability
- **Caching**: Redis for session storage and result caching
- **Monitoring**: Logging for execution results and errors

---

## API Endpoints Summary

### Problem Management
- `GET /api/problems` - List all problems
- `GET /api/problems/:id` - Get problem details
- `POST /api/problems` - Create new problem (admin only)
- `PUT /api/problems/:id` - Update problem (admin only)
- `DELETE /api/problems/:id` - Delete problem (admin only)

### Submissions
- `POST /api/submissions/run` - Practice run with sample tests
- `POST /api/submissions/submit` - Official submission with all tests
- `GET /api/submissions` - Get user's submission history
- `GET /api/submissions/:id` - Get specific submission details

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

---

## File Structure
```
ai-appp/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/           # Reusable UI components
│   │   ├── pages/
│   │   │   ├── CreateProblem.jsx  # Admin problem creation
│   │   │   ├── Problems.jsx       # Problem listing
│   │   │   ├── ProblemDetail.jsx  # Single problem view
│   │   │   └── Submissions.jsx    # Submission history
│   │   └── ...
├── backend/
│   ├── models/
│   │   ├── Problem.js       # Problem schema with judge settings
│   │   ├── User.js          # User schema
│   │   └── Submission.js    # Submission schema
│   ├── routes/
│   │   ├── problems.js      # Problem management APIs
│   │   ├── submissions.js   # Submission and judge APIs
│   │   └── auth.js          # Authentication APIs
│   ├── utils/
│   │   ├── judgeUtils.js    # Core judge logic and normalization
│   │   └── testCaseHandler.js # Legacy test case utilities
│   └── middlewares/
│       └── auth.js          # JWT authentication middleware
└── README.md
```

---

## How to Explain to AI for Image Generation

When asking AI to generate images for this project, use these key concepts:

### Visual Elements to Include
1. **Code Editor Interface**: Show code editor with problem description panel
2. **Test Case Results**: Display test case results with pass/fail indicators
3. **Judge Settings Panel**: Visual representation of judge configuration options
4. **Execution Flow**: Diagram showing code submission → judge → result flow
5. **Language Selection**: Multi-language support indicators
6. **Constraint Groups**: Visual representation of small/medium/large test cases

### Key Phrases to Use
- "LeetCode-style coding platform interface"
- "Code execution judge system with advanced comparison"
- "Multi-language programming environment"
- "Test case evaluation with constraint groups"
- "Admin problem creation panel with judge settings"
- "Real-time code execution and validation"
- "Modern React-based coding platform UI"

### Color Scheme and Style
- Modern, clean interface with dark/light mode support
- Professional coding platform aesthetic
- Clear visual hierarchy for problem descriptions
- Intuitive test case result display
- Accessible color contrasts for pass/fail states

This architecture document provides a comprehensive overview for AI systems to understand the project structure, functionality, and visual requirements for generating appropriate images and understanding the complete system.
