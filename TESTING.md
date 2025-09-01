# RoadWeave Testing Guide

This document provides comprehensive information about testing the RoadWeave application, covering both backend and frontend test suites.

## Quick Start

### Run All Tests
```bash
python run_tests.py --coverage
```

### Run Backend Only
```bash
cd backend
python test.py --coverage
```

### Run Frontend Only
```bash
cd frontend
npm run test:coverage
```

## Test Architecture

### Backend Testing (pytest)
- **Framework**: pytest with fixtures and factories
- **Coverage**: pytest-cov for coverage reporting
- **Database**: In-memory SQLite for isolation
- **Authentication**: Mock JWT tokens for secure endpoint testing

#### Test Structure
```
backend/tests/
├── conftest.py              # Fixtures and test configuration
├── unit/
│   ├── test_models.py       # Database model tests
│   └── test_utils.py        # Utility function tests
└── integration/
    ├── test_api_admin.py    # Admin API endpoints
    ├── test_api_traveler.py # Traveler API endpoints
    └── test_api_public.py   # Public API endpoints
```

#### Key Features
- **Factory Classes**: Generate test data consistently
- **Database Isolation**: Each test gets fresh database
- **Mock Authentication**: Secure endpoint testing without real auth
- **Comprehensive Coverage**: All models, utilities, and API endpoints

### Frontend Testing (React Testing Library)
- **Framework**: React Testing Library + Jest
- **Coverage**: Built-in Jest coverage reporting
- **Mocking**: Axios, react-router-dom, Leaflet, MediaRecorder, Geolocation
- **i18n Testing**: Language switching and translation verification

#### Test Structure
```
frontend/src/__tests__/
├── setupTests.js            # Test configuration and global mocks
├── utils/
│   └── testHelpers.js       # Reusable test utilities
├── components/
│   ├── AdminLogin.test.js   # Admin login component
│   ├── TravelerPWA.test.js  # Traveler PWA component
│   └── PublicBlogView.test.js # Public blog view component
└── i18n/
    └── i18n.test.js         # Internationalization tests
```

#### Key Features
- **Component Isolation**: Each component tested independently
- **User Interaction**: Real user event simulation
- **Network Mocking**: Controlled API response testing
- **i18n Validation**: Multi-language UI testing
- **Accessibility**: ARIA and semantic HTML testing

## Available Test Commands

### Backend Commands
```bash
# Run all tests
python test.py

# Run with coverage
python test.py --coverage

# Run only unit tests
python test.py --unit

# Run only integration tests
python test.py --integration

# Run without slow tests
python test.py --fast

# Run specific test file
python test.py --file tests/unit/test_models.py

# Verbose output
python test.py --verbose
```

### Frontend Commands
```bash
# Run tests once
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests for CI (no watch, with coverage)
npm run test:ci
```

### Full-Stack Commands
```bash
# Run all tests with coverage
python run_tests.py --coverage

# Run only backend tests
python run_tests.py --backend

# Run only frontend tests
python run_tests.py --frontend

# Run in CI mode
python run_tests.py --ci

# Run quick tests only (skip slow tests)
python run_tests.py --quick
```

## Test Coverage

### Backend Coverage Targets
- **Statements**: 80%+
- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+

### Frontend Coverage Targets
- **Statements**: 70%+
- **Branches**: 70%+
- **Functions**: 70%+
- **Lines**: 70%+

Coverage reports are generated in:
- Backend: `backend/htmlcov/index.html`
- Frontend: `frontend/coverage/lcov-report/index.html`

## Testing Best Practices

### Backend Testing
1. **Use Factories**: Generate consistent test data with factory classes
2. **Isolate Tests**: Each test should be independent and isolated
3. **Mock External Services**: Mock AI API calls and external dependencies
4. **Test Edge Cases**: Cover error conditions and boundary cases
5. **Validate Responses**: Check both success and error response formats

### Frontend Testing
1. **Test User Behavior**: Focus on what users actually do
2. **Avoid Implementation Details**: Test behavior, not internal state
3. **Use Real Events**: Prefer userEvent over fireEvent
4. **Mock Strategically**: Mock external dependencies, not your own code
5. **Test Accessibility**: Ensure components work for all users

### i18n Testing
1. **Test Language Switching**: Verify automatic language detection
2. **Validate Translations**: Ensure all UI text is properly translated
3. **Check Interpolation**: Test dynamic content in translations
4. **Fallback Behavior**: Verify fallback to English for unsupported languages

## Continuous Integration

### GitHub Actions Configuration
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Run full test suite
        run: python run_tests.py --ci --coverage
```

### Pre-commit Hooks
```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

## Debugging Tests

### Backend Debugging
```bash
# Run tests with debugging
python test.py --verbose --tb=long

# Run specific test with pdb
pytest -s tests/unit/test_models.py::TestTripModel::test_create_trip --pdb
```

### Frontend Debugging
```bash
# Run tests with verbose output
npm test -- --verbose

# Debug specific test
npm test -- --testNamePattern="AdminLogin" --verbose
```

## Mock Data and Fixtures

### Backend Fixtures
- **app_context**: Flask application context
- **client**: Test client for API requests
- **db**: Database session with automatic cleanup
- **admin_auth_headers**: Mock admin authentication
- **traveler_factory**: Generate test travelers
- **trip_factory**: Generate test trips

### Frontend Mocks
- **createMockAxios**: Mock HTTP client
- **renderWithProviders**: Render with Redux and i18n providers
- **mockGeolocationSuccess**: Mock successful location access
- **createMockFile**: Generate mock File objects for upload testing

## Performance Testing

### Backend Performance
- Database query optimization tests
- API response time validation
- Memory usage monitoring during tests

### Frontend Performance
- Component render time testing
- Bundle size validation
- Accessibility performance checks

## Security Testing

### Backend Security
- Authentication bypass testing
- Input validation testing
- SQL injection prevention validation
- File upload security testing

### Frontend Security
- XSS prevention testing
- CSRF protection validation
- Secure storage testing (localStorage/sessionStorage)

## Error Handling Testing

### Backend Error Testing
- Database connection failures
- Invalid input handling
- API rate limiting
- File system errors

### Frontend Error Testing
- Network failure handling
- Invalid API responses
- Component error boundaries
- User input validation

## Browser Testing

### Supported Browsers
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Testing Strategy
- Local testing with Chrome
- CI testing with headless Chrome
- Manual testing for browser-specific features

## Mobile Testing

### Responsive Design Testing
- Component rendering on mobile viewports
- Touch event handling
- PWA functionality testing
- Offline behavior testing

---

For questions or issues with testing, please refer to the project documentation or create an issue in the repository.