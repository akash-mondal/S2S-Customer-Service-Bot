# Contributing to Vyoma AI

## Introduction
Thank you for considering contributing to Vyoma AI! We welcome contributions from the community to improve our project. Vyoma AI consists of two main components:

- **Backend**: Python-based API and services
- **Frontend**: React-based user interface

This guide provides detailed instructions on how to contribute effectively.

---

## Code of Conduct
All contributors must follow our **Code of Conduct** to maintain a welcoming and respectful environment. By participating, you agree to uphold professionalism and respect towards all contributors.

---

## How to Contribute

### 1. Fork and Clone the Repository
To start contributing:

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```sh
   git clone https://github.com/your-username/VyomaAI.git
   cd VyomaAI
   ```

### 2. Set Up the Development Environment

#### Backend Setup
1. Navigate to the Backend directory:
   ```sh
   cd Backend
   ```
2. Create a virtual environment and activate it:
   ```sh
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
4. Create a `.env` file and add required API keys:
   ```sh
   GROQ_API_KEY=your_groq_api_key
   LLAMAPARSE_API_KEY=your_llamaparse_api_key
   COHERE_API_KEY=your_cohere_api_key
   ```
5. Run the backend server:
   ```sh
   hypercorn --reload --bind 0.0.0.0:8000 stella:app
   ```

#### Frontend Setup
1. Navigate to the Frontend directory:
   ```sh
   cd ../Frontend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file with API keys:
   ```sh
   REACT_APP_GROQ_API_KEY=your_groq_api_key
   REACT_APP_ELEVENLABS_API_KEY=your_elevenlabs_api_key
   REACT_APP_TOGETHERAI_API_KEY=your_togetherai_api_key
   ```
4. Run the frontend development server:
   ```sh
   npm start
   ```

---

## Contribution Guidelines

### 1. Branching Strategy
- **Main branch (`main`)**: Stable production code.
- **Development branch (`dev`)**: Active development branch.
- **Feature branches (`feature/your-feature`)**: Create a new branch for each feature or bug fix:
  ```sh
  git checkout -b feature/your-feature
  ```

### 2. Commit Message Guidelines
Use meaningful commit messages. Follow this format:
```sh
feat: Add new AI processing module
fix: Resolve API timeout issue
chore: Update dependencies
refactor: Optimize database queries
```

### 3. Coding Standards
#### Backend (Python)
- Follow PEP 8 style guide.
- Use type hints and docstrings for all functions.
- Maintain modular and reusable code.

#### Frontend (React)
- Use functional components and React hooks.
- Follow best practices for state management.
- Ensure components are reusable and well-structured.

### 4. Writing Tests
All new code must include unit tests:
- **Backend**: Use `pytest` for writing tests.
- **Frontend**: Use `Jest` and `React Testing Library`.

Run tests before submitting a PR:
```sh
pytest  # For backend
npm test  # For frontend
```

### 5. Submitting a Pull Request
1. Ensure your branch is up to date with `dev`:
   ```sh
   git checkout dev
   git pull origin dev
   ```
2. Push your changes:
   ```sh
   git push origin feature/your-feature
   ```
3. Open a pull request on GitHub:
   - Target branch: `dev`
   - Provide a detailed description of changes.

---

## Issue Reporting
If you find a bug or have a feature request, please open an issue with:
- A clear title and description.
- Steps to reproduce (if applicable).
- Expected vs. actual behavior.

---

## Thank You for Contributing!
We appreciate your time and effort in making Vyoma AI better. Happy coding! 🚀
