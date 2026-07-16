\# Product Requirement Document (PRD) - NutriTrack



\## 1. Executive Summary \& Objective

NutriTrack is a comprehensive full-stack web application designed to empower users to take control of their health by tracking daily caloric intake, meal logs, and body weight metrics. The application focuses heavily on data privacy, security, and responsive user experience.



\---



\## 2. Target Workspace Architecture

The project follows a monorepo structure partitioned into individual workspace services under `artifacts/`:

\- \*\*`artifacts/api-server/`\*\*: The backend Core API service handling business logic, authentication, and SQLite database storage.

\- \*\*`artifacts/calorie-tracker/`\*\*: The client-side single-page application (SPA) providing user interfaces and dashboard metrics.



\---



\## 3. Core Features \& Functional Requirements



\### Feature 1: User Onboarding, Authentication \& Security (api-server)

\- \*\*User Registration\*\*: Users must be able to register an account by providing Name, Email, Password, Current Weight, and Daily Calorie Target.

\- \*\*Secure Authentication\*\*: Traditional login using email and password, returning a stateless JSON Web Token (JWT) upon success.

\- \*\*Security Barriers\*\*: 

&#x20; - Mandatory hashing of account credentials (`bcrypt` with 10 salt rounds).

&#x20; - Automated memory-mapped rate limiting to block automated credential attacks (maximum 5 failed attempts allowed before a 15-minute cool-down lock).



\### Feature 2: Meal Logging \& Calorie Management (api-server \& calorie-tracker)

\- \*\*Meal CRUD Operations\*\*: Authenticated users can log new meals (Title, Calorie Count, Timestamp), view their historical meal history, edit entry details, and remove records.

\- \*\*Secure Authorization \& Privacy\*\*: Strict protection against IDOR (Insecure Direct Object References). Users can only interact with meal records where `user\_id` matches their own JWT payload. Attempting to modify another user's entry must yield an implicit `404 Not Found`.

\- \*\*Calorie Consumption Analytics\*\*: A dynamic calculation interface on the client-side displaying total consumed calories versus remaining allocation based on the user's daily targeted goals.



\---



\## 4. Technical Stack Specifications

\- \*\*Backend Environment\*\*: Node.js, Express.js framework.

\- \*\*Database Engine\*\*: Embedded SQLite (`better-sqlite3` driver).

\- \*\*Automated Testing Suite\*\*: Jest for comprehensive Test-Driven Development execution.

\- \*\*Frontend Environment\*\*: React.js, Vite builder, Tailwind CSS for modern interface layouts.

