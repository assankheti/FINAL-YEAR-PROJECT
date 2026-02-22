# assan-kheti-backend/assan-kheti-backend/README.md

# Assan Kheti Backend

## Overview

Assan Kheti Backend is a FastAPI application designed to manage agricultural data, including user management and crop information. This project serves as the backend for the Assan Kheti application, providing RESTful APIs for frontend consumption.

## Features

- User authentication and management
- Crop management
- Database seeding
- Logging and error handling
- Docker support for easy deployment

## Getting Started

### Prerequisites

- Python 3.8 or higher
- pip
- Docker (optional)

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/assan-kheti-backend.git
   cd assan-kheti-backend
   ```

2. Create a virtual environment and activate it:

   ```
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install the dependencies:

   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables. You can use the `.env.example` file as a reference.

### Running the Application

To run the FastAPI application, execute the following command:

```
uvicorn src.app.main:app --reload
```

### Running Tests

To run the tests, use:

```
pytest
```

### Docker

To build and run the application using Docker, execute:

```
docker-compose up --build
```

## API Documentation

The API documentation can be accessed at `http://localhost:8000/docs` after running the application.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.