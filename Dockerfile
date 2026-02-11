FROM node:18

# Install Python + venv support
RUN apt-get update && apt-get install -y python3 python3-venv python3-pip

WORKDIR /app

COPY . .

# Install Node deps
RUN npm install

# Create virtual environment
RUN python3 -m venv venv

# Activate venv and install Python deps
RUN ./venv/bin/pip install --upgrade pip
RUN ./venv/bin/pip install -r Requirements.txt

EXPOSE 5000

# Start backend using venv + start bot
CMD ./venv/bin/python app.py & node index.js
