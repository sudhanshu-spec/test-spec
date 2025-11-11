from flask import Flask

# Configuration constants
hostname = '127.0.0.1'
port = 3000

# Application initialization
app = Flask(__name__)

# Route handlers
@app.route('/', methods=['GET'])
def index():
    """Root endpoint returning greeting with trailing newline."""
    return 'Hello, World!\n'

@app.route('/evening', methods=['GET'])
def evening():
    """Evening endpoint returning greeting without trailing newline."""
    return 'Good evening'

# Server startup
if __name__ == '__main__':
    print(f'Server running at http://{hostname}:{port}/')
    app.run(host=hostname, port=port)
