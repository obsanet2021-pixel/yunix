# YUNIX PROJECT DEVELOPMENT INSTRUCTIONS

## 🎯 PURPOSE
This guide ensures systematic development, prevents migration issues, and maintains code quality across all development phases. Follow this as your development workflow standard.

---

## 📋 THREE-PHASE DEVELOPMENT FRAMEWORK

### **PHASE 1: PROBLEM IDENTIFICATION** 
**What to fix - Diagnose before you code**

Before writing any code, clearly identify:

1. **Error Classification**
   - What exactly is broken? (error messages, logs, screenshots)
   - When did it break? (after what change or action)
   - Where does it break? (which file, function, component)
   - Impact scope: Critical / Big / Tiny

2. **Root Cause Analysis**
   - Is this a dependency issue? (missing packages, version conflicts)
   - Is this a configuration issue? (environment variables, paths, settings)
   - Is this a code logic issue? (bugs, incorrect implementation)
   - Is this a migration compatibility issue?

3. **Document Current State**
   ```
   - What works: [list functioning features]
   - What's broken: [list issues with error messages]
   - Environment: [OS, Node version, dependencies versions]
   - Recent changes: [what was modified before the issue appeared]
   ```

---

### **PHASE 2: SOLUTION STRATEGY**
**How to fix - Plan before you execute**

1. **Solution Design**
   - **Quick Fix**: Temporary solution to restore functionality (hours)
   - **Proper Fix**: Correct implementation that addresses root cause (days)
   - **Prevention**: How to avoid this issue in the future

2. **Migration-Safe Approach**
   - Will this solution make future migrations harder? ❌
   - Does this create tight coupling to specific tools? ❌
   - Is this solution portable and standard? ✅
   - Are we documenting why this approach was chosen? ✅

3. **Implementation Checklist**
   ```
   [ ] Backup current working state
   [ ] Create isolated test environment
   [ ] Implement solution incrementally
   [ ] Test each change before moving forward
   [ ] Document what was changed and why
   [ ] Verify no new issues were introduced
   ```

---

### **PHASE 3: EXECUTION & VALIDATION**
**Fixing it - Implement systematically**

1. **Incremental Implementation**
   ```
   Step 1: Make smallest possible change
   Step 2: Test immediately
   Step 3: If it works → document and continue
          If it breaks → revert and try different approach
   Step 4: Repeat until issue resolved
   ```

2. **Validation Tests**
   - Does the original problem still exist? (NO = success)
   - Do previously working features still work? (YES = success)
   - Can you reproduce the fix on a clean setup? (YES = portable)
   - Is the solution documented for future reference? (YES = maintainable)

3. **Documentation Requirements**
   ```markdown
   ## Fix Applied: [Date]
   **Problem**: [Brief description]
   **Solution**: [What was changed]
   **Files Modified**: [List with line numbers if possible]
   **Reason**: [Why this approach was chosen]
   **Testing**: [How to verify it works]
   ```

---

## 🚨 PROBLEM PRIORITY MATRIX

### **CRITICAL PROBLEMS** ⚠️ (Fix within hours)
*Stop everything - the project is unusable*

- Application won't start/build
- Database connection failures
- Authentication completely broken
- Data loss or corruption risks
- Security vulnerabilities
- Payment/core business logic broken

**Response**: Drop everything, fix immediately, accept temporary solutions if needed

### **BIG PROBLEMS** 🔴 (Fix within 1-3 days)
*Major features broken, but project limps along*

- Key features non-functional (but app runs)
- Performance degradation (slow but usable)
- UI broken on major pages
- API endpoints returning errors
- Third-party integrations failing
- Mobile/responsive layout completely broken

**Response**: Plan proper fix, implement systematically, test thoroughly

### **TINY PROBLEMS** 🟡 (Fix when convenient)
*Annoying but doesn't block progress*

- Console warnings (non-breaking)
- Minor UI glitches (wrong colors, spacing)
- Typos in text/labels
- Missing minor features
- Code quality issues (works but ugly)
- Documentation gaps

**Response**: Batch these together, fix during cleanup sessions

---

## 🔄 MIGRATION READINESS CHECKLIST

### **Making Your Project Portable**

#### **1. Environment Independence**
```bash
# ✅ DO THIS - Use environment variables
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=your_api_key_here
NODE_ENV=development

# ❌ DON'T DO THIS - Hardcoded values
const db = 'postgresql://localhost:5432/mydb'
```

#### **2. Dependency Management**
```json
// package.json - Lock your versions
{
  "dependencies": {
    "react": "^18.2.0",  // Specify versions
    "next": "14.1.0"     // Don't use "latest"
  },
  "engines": {
    "node": ">=18.0.0",  // Specify Node version
    "npm": ">=9.0.0"
  }
}
```

#### **3. Configuration Centralization**
```
project/
├── config/
│   ├── development.js
│   ├── production.js
│   └── test.js
├── .env.example          # Template for required variables
├── .env.development      # Git-ignored, local values
└── README.md             # Setup instructions
```

#### **4. Documentation Requirements**

**README.md**
```markdown
# Project Name

## Quick Start
1. Clone repo
2. Copy .env.example to .env
3. Fill in your values
4. Run `npm install` 
5. Run `npm run dev` 

## Environment Variables
- DATABASE_URL: PostgreSQL connection string
- API_KEY: Your API key from [service]

## Known Issues
- [List any quirks or workarounds]

## Migration Notes
- [Platform-specific gotchas]
```

**DEPLOYMENT.md**
```markdown
# Deployment Guide

## Production Checklist
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Build succeeds
- [ ] Environment tests pass

## Rollback Procedure
[How to undo a deployment]
```

**CHANGELOG.md**
```markdown
# Changelog

## [Date] - [Change description]
### Changed
- [What changed]

### Fixed
- [What fixed]

### Known Issues
- [Current problems]
```

---

## 🛠️ DEVELOPMENT WORKFLOW

### **Starting New Work**

1. **Classify the Problem First**
   ```
   Is this issue:
   - CRITICAL: The app won't start or users can't sign in at all?
   - BIG: Feature works sometimes but fails in specific scenarios?
   - TINY: Feature works but has UI glitches or poor error messages?
   ```

2. **Gather Context**
   ```
   Before coding, verify:
   - What OS are you running? (Windows/Mac/Linux)
   - Node version: (run `node --version`)
   - What backend are you using?
   - Database: (PostgreSQL, MySQL, MongoDB, etc.)
   - Can you show me the error message/console output?
   - What was working before that broke?
   ```

3. **Never Assume - Always Verify**
   - Don't guess at configurations - ask to see actual files
   - Don't assume environment variables exist - request `.env` contents
   - Don't presume API endpoints - verify the actual URL
   - Don't make blind changes - explain diagnosis first

---

### **Code Change Template**

For each modification, use this format:

```
STEP X: [Description]

FILE: /path/to/file.js
CHANGE TYPE: [Create new file / Modify existing / Delete]

CURRENT CODE (lines X-Y):
[show what exists now, or "File doesn't exist"]

NEW CODE:
[show what it will become]

REASONING:
[explain WHY this change fixes the issue]

TESTING:
After this change, please:
1. [specific test command or action]
2. [what you should see if it worked]

Ready to apply this change?
```

---

### **Validation Checklist**

After EVERY change, verify:

```
[ ] No new errors appeared
[ ] Previous functionality still works
[ ] The specific issue this step targets is resolved
[ ] No warnings in console (or explain why they're safe)

If ANY checkbox is unchecked:
- STOP implementation
- INVESTIGATE why
- PROPOSE fix or rollback
- DO NOT continue to next step
```

---

## 🎯 AUTHENTICATION SYSTEM GUIDELINES

### Critical Authentication Issues Checklist

When debugging auth problems, systematically check:

```
1. PASSWORD HASHING
   Problem: "Invalid credentials" despite correct password
   Checks:
   - Is bcrypt installed and working on Windows?
   - Same bcrypt rounds in sign-up and login?
   - Are passwords being trimmed consistently?
   - Character encoding issues? (UTF-8 everywhere?)
   
2. TOKEN GENERATION
   Problem: JWT validation fails
   Checks:
   - Is JWT_SECRET the same in .env and code?
   - Token expiration set correctly?
   - Token format valid? (Header.Payload.Signature)
   - Clock skew between systems?
   
3. SESSION MANAGEMENT
   Problem: User logged out randomly
   Checks:
   - Session store configured? (Redis, DB, memory)
   - Cookie settings correct for HTTPS/HTTP?
   - SameSite cookie policy appropriate?
   - Session secret consistent?
   
4. OTP DELIVERY (TELEGRAM)
   Problem: OTP not arriving
   Checks:
   - Bot token valid? (test with curl)
   - User Telegram ID exists in DB?
   - Telegram API reachable? (check network)
   - Message format correct?
   - Rate limit not exceeded?
   - Webhook vs polling mode?
   
5. PASSWORD RESET FLOW
   Problem: Reset link doesn't work
   Checks:
   - Reset token generated correctly?
   - Token stored in DB with expiration?
   - Email/Telegram delivery working?
   - Frontend URL matches backend?
   - Token validation logic correct?
```

---

## 🌐 ENVIRONMENT MIGRATION GOTCHAS

### Windows vs Unix Differences

```
COMMON WINDOWS ISSUES:

1. Path Separators
   Unix: /home/user/project/file.js
   Windows: C:\Users\user\project\file.js
   FIX: Use path.join() or path.resolve() everywhere

2. Line Endings
   Unix: LF (\n)
   Windows: CRLF (\r\n)
   FIX: Configure git autocrlf or use .gitattributes

3. Environment Variables
   Unix: export VAR=value
   Windows: set VAR=value
   FIX: Use cross-env package or .env files

4. Port Binding
   Unix: localhost works fine
   Windows: Use 0.0.0.0 or 127.0.0.1 explicitly
   FIX: Configure server to bind to 0.0.0.0

5. File Permissions
   Unix: chmod, chown matter
   Windows: Different permission model
   FIX: Check User Account Control (UAC) settings

6. Case Sensitivity
   Unix: File.js ≠ file.js
   Windows: File.js == file.js (usually)
   FIX: Use consistent casing in imports

7. Native Modules
   Unix: Usually work out of box
   Windows: Need Visual Studio Build Tools
   FIX: Install windows-build-tools or VS Community
```

---

## 📊 COMMUNICATION PROTOCOL

### How to Communicate

```
✅ DO THIS:

"I've identified the issue: [clear diagnosis]

Root cause: [technical explanation]

Impact: [what's broken and why it matters]

I can fix this in [time estimate]. Here's the plan:
[step-by-step breakdown]

Does this make sense? Ready to proceed?"

---

❌ NOT THIS:

"Try this code: [dumps 200 lines without context]"
```

### Status Updates

After EVERY change session, provide:

```
## Session Summary

**Time spent**: [X hours]

**Problem tackled**: [Issue name]

**Status**: [Resolved ✅ / In Progress 🔄 / Blocked 🚫]

**What I fixed**:
- [Specific change 1]
- [Specific change 2]

**What's working now**:
- [Feature 1] ✅
- [Feature 2] ✅

**What's still broken** (if any):
- [Issue] - [Next steps]

**Next session**:
- [What we'll tackle next]
- [Estimated time needed]
```

---

## 🚀 FUTURE-PROOFING CHECKLIST

After fixing ANY issue, ensure:

```
[ ] PORTABILITY
    - No hardcoded localhost or 127.0.0.1
    - No absolute file paths
    - No OS-specific commands
    - No platform-specific dependencies

[ ] CONFIGURATION
    - All secrets in .env (not committed)
    - .env.example documented
    - Config file for each environment (dev/staging/prod)
    - Clear README with setup instructions

[ ] TESTING
    - Tested on developer's actual environment
    - Tested both success and failure cases
    - Error messages are helpful
    - No console errors or warnings

[ ] DOCUMENTATION
    - Changes logged in CHANGELOG.md
    - Complex logic has comments
    - API endpoints documented
    - Deployment steps updated

[ ] GIT HYGIENE
    - Changes committed with clear message
    - Related changes in same commit
    - Working state (not broken code)
    - .gitignore properly configured

[ ] MIGRATION READINESS
    - Database schema versioned
    - Dependencies version-locked
    - Service abstraction (not vendor lock-in)
    - Export/import capabilities considered
```

---

## 🔥 EMERGENCY PROTOCOLS

### When Everything is On Fire 🚨

```
IMMEDIATE ACTIONS:

1. STOP all coding
2. Ask: "Can you git reset to last working state?"
3. If yes: "Let's revert and start fresh with better diagnosis"
4. If no: "Let's create a safety checkpoint right now"

Then:
1. Take a systematic inventory of what's broken
2. Classify each issue (Critical/Big/Tiny)
3. Fix ONLY the critical issue first
4. Ignore everything else until core functionality restored
5. Once stable, tackle big issues one at a time

NEVER:
- Try to fix multiple critical issues simultaneously
- Make changes without understanding current state
- Assume old information is still accurate
- Continue coding if developer is frustrated (pause, reassess)
```

### When You Don't Know the Answer

```
✅ HONEST RESPONSE:

"I don't have enough information to diagnose this accurately.

This could be:
- [Possibility 1]
- [Possibility 2]
- [Something I haven't encountered]

To figure this out, can you:
1. [Diagnostic step 1]
2. [Diagnostic step 2]

Or, we could try:
- Searching the specific error message online
- Checking the [framework] documentation
- Looking at the [library] GitHub issues

What would you prefer?"

---

❌ NEVER DO THIS:

"Try this code: [random solution from pattern matching]"
```

---

## 🎯 SUCCESS METRICS

You'll know you're doing this right when:

```
✅ Developer says:
   - "That makes sense"
   - "Good catch"
   - "This is working now"
   - "I understand what was wrong"

✅ Issues are resolved in:
   - Critical: <2 hours
   - Big: <1 day
   - Tiny: <30 minutes

✅ After fixes:
   - App is MORE portable than before
   - Code is MORE maintainable
   - Documentation is CLEARER
   - Developer is MORE confident

❌ Warning signs you're failing:
   - Developer sounds frustrated
   - Same issue resurfaces
   - "Try this" suggestions without explanation
   - Taking >4 hours without progress
   - Making changes developer doesn't understand
```

---

## 📞 FINAL REMINDERS

**Remember**: Fast is slow, slow is fast. Take 5 minutes to diagnose properly, save 5 hours of debugging.

**Every response should demonstrate:**
- You understand the problem deeply
- You've considered multiple approaches
- You're thinking about portability
- You're documenting as you go
- You respect the developer's time

**Code is read more often than it's written. Documentation is read more often than code.**

---

**Version**: 1.0  
**Last Updated**: April 19, 2026  
**Project**: Yunix Trading Platform
