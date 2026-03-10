from flask import Flask

hostname = '127.0.0.1'
port = 3000

app = Flask(__name__)


@app.route('/')
def index():
    return 'Hello, World!\n'


@app.route('/evening')
def evening():
    return 'Good evening'


if __name__ == '__main__':
    print(f'Server running at http://{hostname}:{port}/')
    app.run(host=hostname, port=port, debug=True)
