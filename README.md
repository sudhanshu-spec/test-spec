# hao-backprop-test

A simple Python 3 Flask web application that provides HTTP endpoints for basic greeting functionality.

## Description

This is a lightweight Flask web server application that demonstrates:
- Flask application factory pattern
- Blueprint-based route organization
- Environment variable configuration
- Modular project structure

## Requirements

- Python 3.9 or higher
- pip (Python package installer)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd hao-backprop-test
```

### 2. Set up a virtual environment (recommended)

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Linux/macOS:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

## Configuration

The application uses environment variables for configuration. You can set these before running the application:

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Server bind address |
| `PORT` | `3000` | Server bind port |
| `FLASK_ENV` | `development` | Flask environment mode |

### Setting environment variables

```bash
# Linux/macOS
export HOST=0.0.0.0
export PORT=8080
export FLASK_ENV=production

# Windows (Command Prompt)
set HOST=0.0.0.0
set PORT=8080
set FLASK_ENV=production

# Windows (PowerShell)
$env:HOST="0.0.0.0"
$env:PORT="8080"
$env:FLASK_ENV="production"
```

## Running the Application

### Using Python directly

```bash
python run.py
```

The server will start and display:
```
Server running at http://127.0.0.1:3000/
```

### Using Flask CLI (alternative)

```bash
flask run --host=127.0.0.1 --port=3000
```

## API Endpoints

The application exposes the following HTTP endpoints:

### GET /

Returns a greeting message.

**Request:**
```bash
curl http://127.0.0.1:3000/
```

**Response:**
```
Hello, World!
```

Note: Response includes a trailing newline character.

### GET /evening

Returns an evening greeting.

**Request:**
```bash
curl http://127.0.0.1:3000/evening
```

**Response:**
```
Good evening
```

## Project Structure

```
/
├── run.py                     # Application entry point
├── requirements.txt           # Python dependencies
├── README.md                  # This file
├── .gitignore                 # Git ignore patterns
└── src/
    ├── __init__.py            # Package initialization
    ├── app.py                 # Flask application factory
    ├── config/
    │   └── __init__.py        # Configuration module
    └── routes/
        ├── __init__.py        # Blueprint exports
        └── main.py            # Main route handlers
```

## License

This project is for testing purposes.
