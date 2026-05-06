# Software Architecture Diagram

The application follows a serverless architecture utilizing React for the frontend, Firebase for authentication and database management, and the Google Gemini API for AI-driven decision analysis.

```mermaid
graph TD
    %% Frontend Layer
    Client["React/Vite Frontend"]

    %% Backend Services (Firebase)
    subgraph Firebase Services
        Firebase_Auth["Firebase Authentication\n(Google Sign-In)"]
        Firestore["Firestore Database\n(Decisions, User Profiles, Feedback)"]
    end

    %% External APIs (AI)
    subgraph AI Layer
        Gemini_API["Google Gemini API\n(Decision Analysis, Micro-Agents)"]
    end

    %% Interactions
    Client -->|User Login / Role Management| Firebase_Auth
    Client -->|Store & Retrieve History| Firestore
    Client -->|AI Prompts & Strategic Analysis| Gemini_API
    
    %% Details
    Firestore -.->|Syncs Data in Realtime| Client
    Gemini_API -.->|Returns Structured JSON\n(Ethical Checks, Roadmap)| Client
```

## System Components

1. **Frontend (React + Vite + Tailwind)**: Manages the user interface, renders the intelligent dashboard, handles interactions and data visualization (e.g., Recharts for alignment, Lucide React for icons).
2. **Firebase Auth**: Verifies user identity using Google Sign-In and ensures secure access. Authorized domains should be managed in the Firebase console.
3. **Firestore Data Storage (NoSQL)**: Keeps track of user profiles (`student`, `employee`, `neutral`), their strategic decision histories, and feedback inputs. Structured according to the schemas deployed in Firebase Security Rules.
4. **Google Gemini API**: A direct integration from the client using the Node.js/Web SDK (`@google/genai`) to generate insights, run simulations via micro-agents, evaluate constraints, perform ethical checks, and produce actionable step-by-step roadmaps. Data is provided entirely structured (structured outputs via schema matching).
