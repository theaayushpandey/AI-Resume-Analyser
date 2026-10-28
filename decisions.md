# Decisions log

Every design choice in this project, with the reason for it, what else could have been used, and the trade-off we accept.

How to read each entry:

- **Where:** the file or files where you can see the decision.
- **Why:** the reason for it.
- **Instead of:** the obvious other option, and why it was not used.
- **Trade-off:** what we give up, and why that is acceptable for now.

The log has three parts:

- **Part A:** decisions in the base code (commit `1556ea7`).
- **Part B:** decisions from my changes in October 2026, with the commit for each.
- **Part C:** known weak spots we accept for now, why we accept them, and the fix for each.

For how the code runs, see [flow.md](flow.md).

---

## Part A: Decisions in the base code

### Architecture and stack

#### A1. Two separate apps: a React frontend and an Express API
- **Where:** `Frontend/`, `Backend/`
- **Why:** The Gemini API key, the database password and the JWT secret must stay on a server. If the browser called Gemini directly, anyone could copy the key from the page. A separate API also lets the frontend and backend be deployed and scaled separately.
- **Instead of:** One full-stack framework like Next.js. It keeps everything in one codebase, but it is a bigger framework to learn. Express is small and easy to follow.
- **Trade-off:** Two dev servers and two `package.json` files. The browser and the API are on different origins, so CORS is needed (A27), and in deployment the cookie needs care (C14).

#### A2. Node.js with Express 5 for the backend
- **Where:** `Backend/package.json` (`express ^5.2.1`), `Backend/src/app.js`
- **Why:** The same language (JavaScript) on both sides. Express is minimal and well known. Express 5 automatically passes errors from `async` route handlers to its error handler, so a failed `await` gives a 500 instead of crashing the server.
- **Instead of:** Python with FastAPI, which is great for AI work but means two languages. NestJS, which gives more structure but much more setup code.
- **Trade-off:** Express has no built-in input checking or project structure. We rely on our own folder layout (A3) and hand-written checks.

#### A3. Backend split into routes, middlewares, controllers, services, models and config
- **Where:** `Backend/src/*`
- **Why:** Each layer has one job. Routes list the URLs. Middlewares do shared steps (login check, file upload). Controllers handle one request each. Services talk to outside systems (Gemini, Chrome). Models describe the data. All AI and PDF code sits in one file, `ai.service.js`, so switching AI providers touches only that file.
- **Instead of:** Putting everything in one `app.js`. That's fine for a demo, but hard to read and test.
- **Trade-off:** More files for a small app.

#### A4. React 19 with Vite
- **Where:** `Frontend/package.json`, `Frontend/vite.config.js`
- **Why:** React is the standard UI library. Vite starts instantly and reloads changes fast.
- **Instead of:** Create React App, which was deprecated in February 2025 and is slow.
- **Trade-off:** None that matters here.

#### A5. Frontend split by feature
- **Where:** `Frontend/src/features/auth/`, `Frontend/src/features/interview/`. Each has `pages/`, `hooks/`, `services/` and a context file.
- **Why:** Everything for one feature lives together. Pages only draw the screen. Hooks hold the logic. Services make the HTTP calls.
- **Instead of:** Folders by file type (all components together, all API calls together). That gets harder to follow as an app grows.
- **Trade-off:** A few more folders.

#### A6. React Context for shared state, not Redux
- **Where:** `auth.context.jsx` (`user`, `loading`), `interview.context.jsx` (`loading`, `report`, `reports`)
- **Why:** Only two things are shared between pages: who is logged in, and the reports. Context is built into React and enough for that.
- **Instead of:** Redux or Zustand. They are good for large apps with a lot of shared state, but here they would only add setup.
- **Trade-off:** Both contexts have a single `loading` flag shared by every action. That's why the PDF download had to avoid it (B6).

#### A7. React Router 7 with a `Protected` wrapper
- **Where:** `app.routes.jsx`, `features/auth/components/Protected.jsx`
- **Why:** Four pages: login, register, home and one report. `Protected` shows a loader while it asks the server who you are, then either shows the page or sends you to `/login`.
- **Instead of:** Checking the login inside every page.
- **Trade-off:** This is only for a smooth experience. Anyone can change frontend code, so the real protection is the server's `authUser` check and the owner filter (A25, A26).

#### A8. axios, with `withCredentials: true`
- **Where:** `auth.api.js`, `interview.api.js`
- **Why:** `withCredentials` makes the browser send the login cookie to a different origin (port 3000). axios also turns JSON answers into objects, can download a file as a blob, and gives the server's error message as `err.response.data`.
- **Instead of:** `fetch` with `credentials: "include"`, which works too, with a bit more code for errors and JSON.
- **Trade-off:** Two axios clients, each with `http://localhost:3000` typed in (C11).

### The AI part

#### A9. Gemini through Google's official SDK (`@google/genai`)
- **Where:** `Backend/src/services/ai.service.js`
- **Why:** It had a free tier, it can reply in a JSON shape we define (A11), and the official SDK handles requests and errors for us.
- **Instead of:** OpenAI's GPT models, which would work just as well. The choice mostly came down to the free tier and built-in schema replies. Calling the REST API by hand would mean more code.
- **Trade-off:** Tied to one provider. Kept small by having all AI calls in one file.

#### A10. Model: `gemini-3-flash-preview`
- **Where:** `ai.service.js` lines 45 and 99
- **Why:** Flash is Google's fast, cheap model. The task is reading a resume and a job post and matching them, not hard reasoning.
- **Instead of:** A Pro model, which is slower and costs more for no clear gain here.
- **Trade-off:** It's a preview model: preview models can be shut down, and Google now recommends `gemini-3.8-flash` for new projects. It also "thinks" on high by default, which costs extra output tokens. The model name is typed twice instead of stored once. See C9.

#### A11. Ask Gemini for JSON in a fixed shape (structured output)
- **Where:** `ai.service.js`: `responseMimeType: "application/json"` and `responseSchema`
- **Why:** The page needs data it can draw: a number, lists and severity levels. With a schema, Gemini replies in our exact shape, so we can parse it, save it and show it without cutting up text.
- **Instead of:** Asking for plain text, or for "JSON please" in the prompt only. Both break easily: missing fields, extra words around the JSON.
- **Trade-off:** Google's own docs say to still check the values in your code. We only do that through the database model (A20). See C1.

#### A12. Describe the shape with zod and convert it with `zod-to-json-schema`
- **Where:** `ai.service.js` (`interviewReportSchema`, `resumePdfSchema`)
- **Why:** The shape is written once, in JavaScript. Each field's `.describe("...")` text also tells the AI what to put there, for example "a score between 0 and 100".
- **Instead of:** Writing the JSON Schema by hand. That's longer and easy to get wrong.
- **Trade-off:** The same zod schema could check Gemini's reply with `.parse()`, but it doesn't yet (C1).

#### A13. One AI call makes the whole report
- **Where:** `ai.service.js › generateInterviewReport`
- **Why:** Score, questions, skill gaps, plan and title all come back in one reply. One wait, the resume is sent only once, and the parts agree with each other (the questions match the gaps).
- **Instead of:** Separate calls for each section. They could run in parallel and show sections as they finish, but you pay for the input several times and the parts may not match.
- **Trade-off:** One long reply. If any part is broken, the whole report fails, and nothing shows until everything is ready (the page says "about 30 seconds").

#### A14. The tailored resume is a second AI call, made only when you click download
- **Where:** `interview.controller.js › generateResumePdfController`, `ai.service.js › generateResumePdf`
- **Why:** Not everyone downloads the resume, so we don't pay for it up front.
- **Instead of:** Making the resume together with the report. That makes every report slower and more expensive.
- **Trade-off:** The PDF is not saved. Every click runs Gemini and Chrome again (C5).

#### A15. AI writes HTML, then Puppeteer (headless Chrome) prints it to PDF
- **Where:** `ai.service.js › generatePdfFromHtml`
- **Why:** AI models are good at HTML and CSS. Chrome shows HTML exactly like a web page and prints a clean A4 PDF.
- **Instead of:** PDFKit or jsPDF, where you place every line in code. That's hard when the AI decides the layout. wkhtmltopdf is an older tool that's no longer maintained.
- **Trade-off:** Chrome is heavy, roughly 100 MB or more each time, and a new one starts for every PDF (C4). Chrome also opens HTML that the AI wrote, so it should be locked down (C15).

#### A16. No RAG and no vector database
- **Where:** (nothing to see, on purpose)
- **Why:** RAG is for when your data is too big to fit in one prompt, so you search for the useful parts first. One resume and one job post are a few thousand tokens. The model accepts about a million (1,048,576) per request. So we send everything.
- **Instead of:** Embeddings plus a vector database. That's worth it to match one resume against thousands of jobs, or to pick questions from a big question bank.
- **Trade-off:** None for this use.

#### A17. A short prompt; most instructions live in the schema
- **Where:** `ai.service.js` (the `prompt` strings and the `.describe()` texts)
- **Why:** Simple, and each field gets its own instruction right where it is defined.
- **Instead of:** A long prompt with a system instruction and examples.
- **Trade-off:** The resume text goes straight into the prompt with no markers around it, so it could carry hidden instructions (C13). The resume prompt also never says "use only facts from the resume" (C12).

### Files

#### A18. Multer with memory storage and a 3 MB limit
- **Where:** `Backend/src/middlewares/file.middleware.js`
- **Why:** The PDF is only needed long enough to pull out its text. In memory, there's no disk cleanup and no stored personal files. The 3 MB limit stops huge uploads from using up server memory.
- **Instead of:** Disk storage, which needs cleanup and stores personal files. Or uploading straight to S3, which is the right move at scale but adds setup.
- **Trade-off:** With many uploads at the same time, they all sit in RAM.

#### A19. Pull the text out with pdf-parse, and keep only the text
- **Where:** `interview.controller.js` (`new pdfParse.PDFParse(...).getText()`)
- **Why:** Gemini only needs the words. Text is small and cheap to send. We save it with the report and reuse it for the resume call later.
- **Instead of:** Sending the PDF file to Gemini, which can read PDFs and would also handle scanned resumes. But it's a bigger input every time, and we'd have to keep the file.
- **Trade-off:** A scanned PDF (just an image) gives empty text, and nothing checks for that (C8).

### Data

#### A20. MongoDB with Mongoose
- **Where:** `Backend/src/models/*`, `Backend/src/config/database.js`
- **Why:** Gemini's answer is already nested JSON: lists of questions, and days that each have a list of tasks. MongoDB stores that as one document, and one read gets the whole report. Adding a field needs no migration. Mongoose adds a schema on top, so required fields, allowed values (`low`, `medium`, `high`) and the 0–100 score range are checked before saving. Today that is the only check on the AI's answer.
- **Instead of:** A SQL database. We'd need about five tables (reports, technical questions, behavioral questions, skill gaps, plan days) and joins for one page. To be fair, Postgres with a JSON column would also work.
- **Trade-off:** No joins or foreign keys enforced by the database. Fine, because there is little linked data: one user has many reports.

#### A21. Questions, skill gaps and plan days are stored inside the report
- **Where:** `interviewReport.model.js` (sub-schemas; questions and gaps use `_id: false`)
- **Why:** They belong to one report and are always read with it, never on their own. `_id: false` skips an id for each item, since nothing refers to them one by one.
- **Instead of:** Separate collections with references. That only makes sense if items are shared or looked up alone.
- **Trade-off:** A document can be at most 16 MB. A report is a few KB, so this never comes close.

#### A22. The report stores the resume text, job description and self-description
- **Where:** `interviewReport.model.js` (`resume`, `jobDescription`, `selfDescription`)
- **Why:** The resume download (A14) needs them later, without asking the user to upload again.
- **Instead of:** Throwing the input away after the report.
- **Trade-off:** We keep personal data (resume text) in the database. This makes the owner check on every report route essential (A25, B8).

#### A23. Each report points to its user
- **Where:** `interviewReport.model.js` (`user: ObjectId, ref: "users"`), set from `req.user.id`
- **Why:** So every query can be limited to "my reports".
- **Trade-off:** There's no index on `user` yet (C8).

#### A24. The report list sends only the small fields
- **Where:** `getAllInterviewReportsController` (`.select("-resume -jobDescription ...")`, `.sort({ createdAt: -1 })`)
- **Why:** The list only shows title, score and date. Leaving out the resume, questions and plan keeps the answer small and fast. Newest first is what people expect.
- **Trade-off:** None.

### Login and security

#### A25. Every report query filters by the logged-in user, and "not yours" gives 404
- **Where:** `getInterviewReportByIdController`, `getAllInterviewReportsController` (and the PDF route after B8)
- **Why:** The user id comes from the verified token, never from anything the browser sends. 404 instead of 403 means we don't even confirm that someone else's report exists.
- **Trade-off:** None. In the base code, the PDF route skipped this check. That was fixed in B8.

#### A26. JWT (signed token) instead of server sessions
- **Where:** `auth.controller.js` (`jwt.sign({ id, username }, JWT_SECRET, { expiresIn: "1d" })`), `auth.middleware.js` (`jwt.verify`)
- **Why:** The token itself says who you are and is signed with the server's secret, so any server can check it without a session table. That makes adding servers easy. One day is a balance: long enough not to annoy users, short enough to limit a stolen token.
- **Instead of:** Server sessions (a session id in a cookie, with the data on the server or in Redis). Those are easy to cancel, but each request needs a lookup. For an app this size, sessions would also have been fine.
- **Trade-off:** A JWT can't be cancelled before it expires, so logout needs a blacklist (A30). Anyone can read a JWT's contents; it's signed, not encrypted. So it only holds the id and username, never secrets.

#### A27. Send the token in a cookie, and limit CORS to the frontend
- **Where:** `res.cookie("token", ...)` in `auth.controller.js`; `cors({ origin: "http://localhost:5173", credentials: true })` in `app.js`
- **Why:** The browser sends the cookie by itself. It can be made unreadable to page scripts (B9). CORS only lets our frontend read the API's answers. With `credentials: true` the origin must be named exactly; `*` is not allowed.
- **Instead of:** Keeping the token in localStorage and sending it in an `Authorization` header. Any script on the page can read localStorage, so a script injected into the page could steal it.
- **Trade-off:** Cookies bring CSRF risk (another site making your browser send a request). That's handled by `sameSite` in B9, and the GET logout is still open (C10).

#### A28. bcrypt (bcryptjs, cost 10) for passwords
- **Where:** `bcrypt.hash(password, 10)` and `bcrypt.compare` in `auth.controller.js`
- **Why:** The password itself is never stored. bcrypt adds a random salt (two users with the same password get different hashes) and is slow on purpose, so guessing passwords in bulk is too expensive. Cost 10 means 2^10 rounds, which is a common default. `bcryptjs` is pure JavaScript, so it installs anywhere, with no native build step.
- **Instead of:** SHA-256 or MD5, which are far too fast, so attackers can try billions of guesses per second. Argon2 is newer and stronger, but needs a native build.
- **Trade-off:** About tens of milliseconds of CPU per login. That's the point.

#### A29. Same error for "wrong email" and "wrong password"
- **Where:** `loginUserController` ("Invalid email or password" in both cases)
- **Why:** An attacker can't use the login form to find out which emails have accounts.
- **Trade-off:** The register route still says "Account already exists", so this only partly hides it.

#### A30. Logout puts the token on a blacklist
- **Where:** `logoutUserController` (`tokenBlacklistModel.create({ token })`), `authUser` (checks the blacklist on every request)
- **Why:** A JWT can't be cancelled (A26), so we remember which tokens were logged out and refuse them.
- **Instead of:** Only clearing the cookie. But a copied token would keep working until it expires.
- **Trade-off:** One database lookup on every protected request, which gives back part of the "no lookup" benefit of JWT. In the base code this list had no index and grew forever, which was fixed in B10.

#### A31. The login check runs before the file upload
- **Where:** `interview.routes.js`: `authUser` comes before `upload.single("resume")`
- **Why:** Do the cheap check first. A stranger can't make the server read a 3 MB file into memory.
- **Trade-off:** None.

---

## Part B: Decisions from my changes (October 2026)

#### B1. Make the resume optional, and give clear error messages
- **Commit:** `7818cc2`
- **Where:** `generateInterViewReportController`, `Home.jsx`, `useInterview.js`
- **Why:** The page said the resume was optional, but the server read `req.file.buffer` right away, so it crashed when there was no file. Now a job description plus either a resume or a self-description is enough. Missing input or a non-PDF gets a 400 with a message saying what to fix. Gemini or database failures get a 500 with "please try again". The page shows these messages next to the button instead of failing silently.
- **Trade-off:** Without a resume, the report can only be as good as the self-description.

#### B2. Pin `@napi-rs/canvas` to 0.1.100 so pdf-parse loads on Windows ARM
- **Commit:** `7818cc2`
- **Where:** `Backend/package.json` (`"overrides": { "@napi-rs/canvas": "0.1.100" }`)
- **Why:** pdf-parse needs `@napi-rs/canvas`, and the version that got installed had no Windows ARM64 build, so pdf-parse failed to load on my laptop. 0.1.100 is the first 0.1 version with an ARM64 build. npm `overrides` forces that version even though it's a dependency of a dependency.
- **Instead of:** Running Node under x64 emulation (slow), or replacing pdf-parse.
- **Trade-off:** The pin has to be checked when pdf-parse is updated.

#### B3. Use the installed Chrome for Puppeteer on Windows ARM
- **Where:** `Backend/.env` (`PUPPETEER_EXECUTABLE_PATH`; this file is not committed). Puppeteer reads this variable by itself.
- **Why:** The Chrome that Puppeteer downloads is built for x64. On an ARM laptop it runs under emulation and is very slow. The Chrome already installed on the laptop runs natively.
- **Trade-off:** Each machine needs the right path in its `.env`.

#### B4. Drag and drop, and show which resume was chosen
- **Commits:** `2bc449f`, `9a020a0`
- **Where:** `Home.jsx` (`onDragOver`/`onDrop` with `preventDefault`, `pickResume`, `removeResume`)
- **Why:** Without `preventDefault`, the browser opens the dropped PDF instead of handing it to the page. After choosing a file, the box now shows "Resume added" with the name and size, so it's obvious it worked. `removeResume` clears the file input, so picking the same file again still counts as a change.
- **Trade-off:** None.

#### B5. Check the form in the browser too, with the same rules as the server
- **Commit:** `a4aeabf`
- **Where:** `Home.jsx › pickResume` (PDF only, 3 MB or less), `handleGenerateReport` (job description required, resume or self-description required)
- **Why:** The user gets an answer instantly instead of after a server round trip. The server still checks everything, because browser checks can be skipped.
- **Trade-off:** The rules live in two places and must be kept in sync.

#### B6. Frontend redesign: smaller decisions inside it
- **Commit:** `a4aeabf`
- **Where:** `Home.jsx`, `Interview.jsx`, `score.js`, `SiteFooter.jsx`, `useAuth.js`, `useInterview.js`, styles
- **Decisions:**
  - **Score bands in one place.** `score.js › scoreBand`: 80 and up is "Strong match", 60 and up is "Good match", below that is "Needs work". The home cards and the report page use the same function, so they always agree.
  - **AI warning in the footer.** "Interview plans are written by Google Gemini and can contain mistakes." Users should know the content can be wrong.
  - **The PDF download doesn't use the shared loading flag.** If it did, the whole report would turn into a loader while the PDF is made. Now only the button changes ("Writing your resume…").
  - **Readable errors.** `readableError` in `useAuth.js` and the catch in `generateReport` show the server's own message. If the server can't be reached, they say "Could not reach the server. Is the backend running?"
  - **The job description box stops at 5,000 characters** (`MAX_JOB_DESCRIPTION`), with a live counter. That keeps prompts a sensible size. The server doesn't enforce this yet (C16).
  - **Tell people how long it takes.** "Takes about 30 seconds" for the report, "about 20 seconds" for the PDF. Waiting feels shorter when you know what to expect.

#### B7. `get-me` answers 401 when the account no longer exists
- **Commit:** `cc8871c`
- **Where:** `getMeController`
- **Why:** A valid cookie can outlive its account. The code read `user._id` on `null` and crashed. Now it answers 401 "Please sign in again.", and the frontend sends the person to the login page.

#### B8. Only the owner can download a tailored resume, and a bad id gives 404
- **Commit:** `2355fc0`
- **Where:** `generateResumePdfController`
- **Why:** The PDF route looked the report up by id alone (`findById`). Any logged-in user who had or guessed a report id could download another person's resume, with their name, phone and work history. MongoDB ids are not random: they start with a timestamp and count up, so they can be guessed. Now the query is `findOne({ _id, user: req.user.id })`, like the other report routes, and "not yours" gets 404. A badly formed id is checked first with `mongoose.isValidObjectId`, so it gets 404 instead of a 500 crash.
- **Trade-off:** None. This was a security bug.

#### B9. Safe settings on the login cookie
- **Commit:** `ffd9f1c`
- **Where:** `auth.controller.js › tokenCookieOptions`
- **Why:** The cookie was set with no options. Now:
  - `httpOnly: true`: page scripts can't read the token, so an injected script can't steal it.
  - `sameSite: "lax"`: the browser doesn't send it on POSTs or fetch calls that start on other sites, which blocks most CSRF.
  - `secure` in production only: HTTPS only when deployed. Local development runs on plain `http://localhost`, where a secure cookie would never be sent.
  - `maxAge`: 1 day, the same as the token. Before, the cookie disappeared when the browser closed while the token was still valid.
  - Logout clears it with the same options. The browser only removes a cookie when the options match.
- **Note:** `localhost:5173` and `localhost:3000` count as the same "site" (the port doesn't matter for `sameSite`), so the frontend's requests still carry the cookie.

#### B10. Index the blacklist and let MongoDB delete old entries
- **Commit:** `7ac5a18`
- **Where:** `blacklist.model.js` (`index: true` on `token`; TTL index on `createdAt` with `expireAfterSeconds: 86400`)
- **Why:** `authUser` searches the blacklist on every logged-in request. With no index, each search read the whole collection, and the collection grew with every logout, so every request got slower over time. The index makes the lookup fast. The TTL index makes MongoDB delete each entry after one day. That's safe, because by then the token has expired and `jwt.verify` refuses it anyway.
- **Note:** MongoDB's cleanup runs about once a minute, so entries go a little after the 24 hours.

---

## Part C: Weak spots we accept for now

Each has a reason it's acceptable today and the fix for when it isn't.

| # | Weak spot | Why it's accepted for now | Fix |
|---|---|---|---|
| C1 | The AI's answer is never checked with the zod schema. Only Mongoose's rules catch problems when saving. | Mongoose already blocks missing required fields and bad severity values, so most broken answers fail cleanly with a 500. | `interviewReportSchema.parse(...)` before saving; retry once, then show an error. |
| C2 | The user waits on one open request (about 30 seconds). No timeout, no retry. | Simple, and fine for one user at a time. | A timeout; retry with backoff when Gemini says "too many requests"; at scale, a job queue that the page checks. |
| C3 | No rate limit on the AI routes. | Only logged-in users can call them, and it's a student project. | A per-user limit (for example, 10 reports a day). |
| C4 | A new Chrome starts for every PDF, and if printing fails, `browser.close()` is never reached (no `try/finally`). | Works for low traffic. | Close in a `finally`; keep one browser open and open a new tab per request; run PDFs on their own workers at scale. |
| C5 | The PDF is made again on every click. | Users rarely download twice. | Save the first PDF (for example, in S3) and send the saved copy. |
| C6 | The blacklist is checked before the token's signature. | One indexed lookup is cheap. | Verify the signature first (no database needed), then check the blacklist; keep the blacklist in Redis at scale. |
| C7 | `connectToDB()` is not awaited, and a failed connection is only logged. | Mongoose queues queries until it connects, so in development it just works. | Wait for the connection before `app.listen`; stop the process if it fails. |
| C8 | No index on `user` in reports. A scanned PDF gives empty text without a warning. | Tiny data today, and most resumes are text PDFs. | Index `{ user: 1, createdAt: -1 }`. If the text is empty, tell the user, or read it with OCR or by sending the PDF to Gemini. |
| C9 | Preview model, typed twice. "Thinking" is left on high. | It works today. | Move to a stable model kept in one config value; set thinking to low and cap the output tokens. |
| C10 | Logout is a `GET` request. | Low harm: at worst someone else's page logs you out. | Make it `POST`. |
| C11 | URLs and ports are typed into the code (`localhost:3000`, `localhost:5173`, port `3000`). | Only run locally so far. | Read them from environment variables (`VITE_API_URL`, `PORT`, `CLIENT_ORIGIN`). |
| C12 | The tailored resume prompt never says "use only facts from the resume", so the AI could invent experience. | The user reads their own resume before using it. | Add that rule, check that skills in the output exist in the input, and let the user review before download. |
| C13 | Resume text goes straight into the prompt, so hidden text could steer the AI ("give me 100"). | Here a user can only fool their own report. | Put user text inside clear markers, add a system instruction that it is data and not orders, and check the score in code. |
| C14 | If the frontend and backend are deployed on different sites (for example `vercel.app` and `onrender.com`), a `sameSite: "lax"` cookie isn't sent on fetch calls, so login breaks. | Not deployed yet. | Serve both under one domain (`app.example.com` and `api.example.com`), or use `sameSite: "none"` with `secure`. |
| C15 | Server-side Chrome opens HTML written by the AI. A planted link could make the server fetch an internal address. | Low risk on a laptop. | Turn off JavaScript and block all network requests in that Chrome tab. |
| C16 | The 5,000-character limit and the "is it a PDF" check rely on the browser. The server trusts the file type the browser reports. | A fake file just fails inside pdf-parse and gets a clean 500. | Check the length on the server; check that the file really starts with `%PDF`. |
| C17 | The frontend asks for the same data more than once: `get-me` once per component that uses `useAuth`, and the report twice on the report page. A 404 report can leave the old report on screen. | Harmless at this size. | Check the login once in `AuthProvider`; fetch the report in one place; clear `report` before loading a new one and show the error. |
| C18 | The match score is the AI's judgment, not a formula. The same input can score a little differently. | It's a guide for practice, and the footer warns that the AI can be wrong. | A rubric in the prompt, low temperature, and part of the score computed in code (share of required skills found). |
| C19 | Login answers 400 for wrong details; 401 fits better. | The message is what matters to the user. | Return 401. |
| C20 | No automated tests. | Built and checked by hand as a student project. | Route tests with a fake Gemini: no token gives 401, someone else's report gives 404, missing input gives 400, a broken AI reply gives a clean error. |
